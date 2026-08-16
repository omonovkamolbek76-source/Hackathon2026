import { SignJWT, jwtVerify } from 'jose';

/**
 * Short-lived, server-signed record of an in-flight OAuth authorization
 * request, carried in an httpOnly cookie between the initiate and callback
 * legs. Stateless by design (consistent with the rest of this app's JWT
 * session model) instead of a server-side session store.
 */

const HANDSHAKE_TTL_SECONDS = 10 * 60;
const AUDIENCE = 'oauth-handshake';

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be set (min 32 characters)');
  }
  return new TextEncoder().encode(secret);
}

export type OAuthProviderId = 'google' | 'microsoft';

export type OAuthHandshake = {
  provider: OAuthProviderId;
  state: string;
  codeVerifier: string;
  nonce: string;
  redirectPath: string;
  /** Set only when this flow was started by an already-authenticated user
   * explicitly linking a provider from their profile — never trust this
   * unless it came from a validly signed handshake. */
  linkUserId?: string;
};

export function handshakeCookieName(provider: string): string {
  return `tadbirkorai_oauth_${provider}`;
}

export async function signHandshake(payload: OAuthHandshake): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${HANDSHAKE_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyHandshake(token: string): Promise<OAuthHandshake | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: AUDIENCE });
    if (
      (payload.provider !== 'google' && payload.provider !== 'microsoft') ||
      typeof payload.state !== 'string' ||
      typeof payload.codeVerifier !== 'string' ||
      typeof payload.nonce !== 'string' ||
      typeof payload.redirectPath !== 'string'
    ) {
      return null;
    }
    return {
      provider: payload.provider,
      state: payload.state,
      codeVerifier: payload.codeVerifier,
      nonce: payload.nonce,
      redirectPath: payload.redirectPath,
      linkUserId: typeof payload.linkUserId === 'string' ? payload.linkUserId : undefined,
    };
  } catch {
    return null;
  }
}

export const OAUTH_HANDSHAKE_TTL_SECONDS = HANDSHAKE_TTL_SECONDS;
