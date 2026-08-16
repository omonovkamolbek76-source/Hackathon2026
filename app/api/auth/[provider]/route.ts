import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSession } from '@/lib/auth';
import { isProviderConfigured, buildAuthorizationUrl } from '@/lib/oauth/providers';
import type { OAuthProviderId } from '@/lib/oauth/handshake';
import { generateCodeVerifier, codeChallengeFromVerifier, generateState, generateNonce } from '@/lib/oauth/pkce';
import { signHandshake, handshakeCookieName, OAUTH_HANDSHAKE_TTL_SECONDS } from '@/lib/oauth/handshake';
import { sanitizeRedirectPath } from '@/lib/oauth/redirect';
import { clientKey, rateLimit } from '@/lib/rate-limit';

function isValidProvider(p: string): p is OAuthProviderId {
  return p === 'google' || p === 'microsoft';
}

function callbackUrl(provider: string, appUrl: string) {
  return `${appUrl}/api/auth/${provider}/callback`;
}

/**
 * This route is always reached via a full-page browser navigation
 * (`window.location.href = ...`), never via `fetch`. Every error path must
 * therefore redirect back into the app with a query param the SPA can read
 * (mirroring the callback route's UX), rather than return a raw JSON body
 * the user would otherwise see rendered as a blank page.
 */
function redirectWithError(appUrl: string, redirectPath: string, code: string) {
  const url = new URL(redirectPath, appUrl);
  url.searchParams.set('authError', code);
  return NextResponse.redirect(url);
}

/**
 * GET /api/auth/google | /api/auth/microsoft
 * Starts the Authorization Code + PKCE flow. Redirects the browser straight
 * to the provider — there is no "fake" client-side button-only flow here.
 *
 * Query params:
 *   redirect=/some/path   where to send the user after a successful login
 *                          (sanitized to same-origin relative paths only)
 *   link=1                 only valid when the caller already has a session;
 *                          starts an explicit "link this provider to my
 *                          existing account" flow instead of login/register
 */
export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const provider = params.provider;
  const url = new URL(request.url);
  const appUrl = process.env.APP_URL || url.origin;
  const redirectPath = sanitizeRedirectPath(url.searchParams.get('redirect'));

  if (!isValidProvider(provider)) {
    return redirectWithError(appUrl, '/', 'provider_unavailable');
  }
  if (!isProviderConfigured(provider)) {
    return redirectWithError(appUrl, redirectPath, 'provider_unavailable');
  }

  const rl = rateLimit(clientKey(request, `oauth-init:${provider}`), 20, 60_000);
  if (!rl.ok) {
    return redirectWithError(appUrl, redirectPath, 'rate_limited');
  }

  const linkMode = url.searchParams.get('link') === '1';

  let linkUserId: string | undefined;
  if (linkMode) {
    const session = await readSession();
    if (!session) {
      return redirectWithError(appUrl, '/', 'link_requires_login');
    }
    linkUserId = session.id;
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = codeChallengeFromVerifier(codeVerifier);
  const nonce = generateNonce();

  const handshake = await signHandshake({ provider, state, codeVerifier, nonce, redirectPath, linkUserId });

  cookies().set({
    name: handshakeCookieName(provider),
    value: handshake,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_HANDSHAKE_TTL_SECONDS,
  });

  const authUrl = buildAuthorizationUrl(provider, {
    redirectUri: callbackUrl(provider, appUrl),
    state,
    codeChallenge,
    nonce,
  });

  return NextResponse.redirect(authUrl);
}
