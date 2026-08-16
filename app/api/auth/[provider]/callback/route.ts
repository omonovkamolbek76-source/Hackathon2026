import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createOAuthMfaPendingToken,
  createSessionToken,
  oauthMfaPendingCookieOptions,
  sessionCookieOptions,
} from '@/lib/auth';
import { prisma } from '@/lib/db';
import { exchangeCodeForTokens, isProviderConfigured, verifyIdToken } from '@/lib/oauth/providers';
import type { OAuthProviderId } from '@/lib/oauth/handshake';
import { handshakeCookieName, verifyHandshake } from '@/lib/oauth/handshake';
import { resolveOAuthAccount } from '@/lib/oauth/account-resolution';
import { writeAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { clientKey, rateLimit } from '@/lib/rate-limit';

function isValidProvider(p: string): p is OAuthProviderId {
  return p === 'google' || p === 'microsoft';
}

function redirectToApp(appUrl: string, path: string, params?: Record<string, string>) {
  const url = new URL(path, appUrl);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

function clearHandshakeCookie(provider: string) {
  cookies().set({
    name: handshakeCookieName(provider),
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * GET /api/auth/google/callback | /api/auth/microsoft/callback
 *
 * This route is intentionally unauthenticated by session cookie — trust
 * comes entirely from: (1) the signed handshake cookie set by the initiate
 * step, matched against the `state` query param, and (2) full ID token
 * verification (signature, issuer, audience, expiry, nonce) before any
 * identity claim is used.
 */
export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const provider = params.provider;
  const appUrl = process.env.APP_URL || new URL(request.url).origin;

  if (!isValidProvider(provider) || !isProviderConfigured(provider)) {
    return redirectToApp(appUrl, '/', { authError: 'provider_unavailable' });
  }

  const rl = rateLimit(clientKey(request, `oauth-callback:${provider}`), 30, 60_000);
  if (!rl.ok) {
    return redirectToApp(appUrl, '/', { authError: 'rate_limited' });
  }

  const url = new URL(request.url);
  const providerError = url.searchParams.get('error');
  const handshakeToken = cookies().get(handshakeCookieName(provider))?.value;
  clearHandshakeCookie(provider); // single-use, regardless of outcome

  if (providerError) {
    logger.warn('oauth_provider_error', { provider, error: providerError });
    return redirectToApp(appUrl, '/', { authError: 'cancelled' });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || !handshakeToken) {
    return redirectToApp(appUrl, '/', { authError: 'invalid_request' });
  }

  const handshake = await verifyHandshake(handshakeToken);
  if (!handshake || handshake.provider !== provider || handshake.state !== state) {
    logger.warn('oauth_state_mismatch', { provider });
    return redirectToApp(appUrl, '/', { authError: 'invalid_state' });
  }

  try {
    const { idToken } = await exchangeCodeForTokens(provider, {
      code,
      redirectUri: `${appUrl}/api/auth/${provider}/callback`,
      codeVerifier: handshake.codeVerifier,
    });
    const claims = await verifyIdToken(provider, idToken, handshake.nonce);

    const [oauthAccount, existingUserByEmail] = await Promise.all([
      prisma.oAuthAccount.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId: claims.sub } },
      }),
      claims.email ? prisma.user.findUnique({ where: { email: claims.email } }) : Promise.resolve(null),
    ]);

    const resolution = resolveOAuthAccount({
      existingOAuthAccountUserId: oauthAccount?.userId ?? null,
      existingUserIdByEmail: existingUserByEmail?.id ?? null,
      emailVerified: Boolean(claims.email_verified),
      linkUserId: handshake.linkUserId,
    });

    if (resolution.action === 'error') {
      logger.warn('oauth_resolution_denied', { provider, code: resolution.code });
      return redirectToApp(appUrl, handshake.redirectPath, { authError: resolution.code.toLowerCase() });
    }

    if (resolution.action === 'link' || resolution.action === 'noop_already_linked') {
      if (resolution.action === 'link') {
        await prisma.oAuthAccount.create({
          data: { userId: resolution.userId, provider, providerAccountId: claims.sub, email: claims.email || '' },
        });
        await writeAudit({ userId: resolution.userId, action: 'oauth.linked', meta: { provider } });
      }
      return redirectToApp(appUrl, handshake.redirectPath, { linked: provider });
    }

    let userId: string;
    if (resolution.action === 'create') {
      if (!claims.email) {
        return redirectToApp(appUrl, '/', { authError: 'email_unavailable' });
      }
      const created = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: claims.email!,
            passwordHash: null,
            name: claims.name || claims.email!.split('@')[0],
            role: 'user', // never trust a role from OAuth claims — always the default
            emailVerified: Boolean(claims.email_verified),
            image: claims.picture || '',
            tasks: {
              create: [
                {
                  title: 'Profilni to\u2018ldirish',
                  subtitle: 'Biznes nomi va hududni yangilang',
                  category: 'planning',
                  status: 'today',
                  dueDate: 'Bugun',
                },
              ],
            },
          },
        });
        await tx.oAuthAccount.create({
          data: { userId: u.id, provider, providerAccountId: claims.sub, email: claims.email || '' },
        });
        return u;
      });
      await writeAudit({ userId: created.id, action: 'auth.oauth_register', meta: { provider } });
      userId = created.id;
    } else {
      userId = resolution.userId;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return redirectToApp(appUrl, '/', { authError: 'server_error' });
    }

    if (user.mfaEnabled) {
      const pending = await createOAuthMfaPendingToken(user.id);
      cookies().set(oauthMfaPendingCookieOptions(pending));
      return redirectToApp(appUrl, '/', { oauthMfaRequired: '1' });
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionVersion: user.sessionVersion,
    });
    cookies().set(sessionCookieOptions(token));
    await writeAudit({ userId: user.id, action: 'auth.oauth_login_ok', meta: { provider } });

    return redirectToApp(appUrl, handshake.redirectPath);
  } catch (e) {
    // Never leak provider error bodies (may include client_secret echoes) or raw tokens.
    logger.error('oauth_callback_error', { provider, message: e instanceof Error ? e.message : 'unknown' });
    return redirectToApp(appUrl, '/', { authError: 'provider_error' });
  }
}
