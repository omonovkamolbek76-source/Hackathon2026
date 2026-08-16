import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const SESSION_COOKIE = 'tadbirkorai_session';
const SESSION_DAYS = 7;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be set (min 32 characters)');
  }
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

// A dummy bcrypt hash used to keep login timing constant when no user is found,
// mitigating account-enumeration via response-time side channel.
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeOZ2Yl5c8sWDN8kFqK8j5cvfvyZ6oGmSK';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Always runs a bcrypt comparison (real or dummy) so response timing does not reveal account existence. */
export async function verifyPasswordConstantTime(password: string, hash: string | null | undefined) {
  return bcrypt.compare(password, hash || DUMMY_HASH);
}

export async function createSessionToken(user: SessionUser & { sessionVersion: number }) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    v: user.sessionVersion,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

async function readSessionClaims(): Promise<(SessionUser & { sessionVersion: number }) | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== 'string') return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === 'string' ? payload.name : '',
      role: typeof payload.role === 'string' ? payload.role : 'user',
      sessionVersion: typeof payload.v === 'number' ? payload.v : 0,
    };
  } catch {
    return null;
  }
}

export async function readSession(): Promise<SessionUser | null> {
  const claims = await readSessionClaims();
  if (!claims) return null;
  const { sessionVersion, ...user } = claims;
  return user;
}

/**
 * Verifies the JWT AND re-validates against the current DB user, including the
 * session-version stamp. Bumping `sessionVersion` (e.g. on MFA enable/disable,
 * password change, or "logout all devices") immediately invalidates every
 * previously issued token, closing the stale-session window.
 */
export async function requireUser(): Promise<SessionUser> {
  const claims = await readSessionClaims();
  if (!claims) {
    throw new AuthError('Unauthorized', 401);
  }
  const user = await prisma.user.findUnique({ where: { id: claims.id } });
  if (!user || user.sessionVersion !== claims.sessionVersion) {
    throw new AuthError('Sessiya muddati tugagan, qayta kiring', 401);
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

// --- OAuth login -> MFA step-up bridge -------------------------------------
// An OAuth-verified identity must still satisfy this app's own MFA if the
// resolved account has it enabled (OAuth is not allowed to bypass MFA). This
// short-lived, single-purpose token bridges "identity confirmed by provider"
// to "TOTP code confirmed by us" without ever issuing a full session cookie
// in between.

const OAUTH_MFA_COOKIE = 'tadbirkorai_oauth_mfa_pending';
const OAUTH_MFA_TTL_SECONDS = 5 * 60;
const OAUTH_MFA_AUDIENCE = 'oauth-mfa-pending';

export const OAUTH_MFA_COOKIE_NAME = OAUTH_MFA_COOKIE;

export async function createOAuthMfaPendingToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(OAUTH_MFA_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_MFA_TTL_SECONDS}s`)
    .sign(getSecret());
}

export function oauthMfaPendingCookieOptions(token: string) {
  return {
    name: OAUTH_MFA_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: OAUTH_MFA_TTL_SECONDS,
  };
}

export function clearOAuthMfaPendingCookieOptions() {
  return {
    name: OAUTH_MFA_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

export async function readOAuthMfaPendingUserId(): Promise<string | null> {
  const token = cookies().get(OAUTH_MFA_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: OAUTH_MFA_AUDIENCE });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
