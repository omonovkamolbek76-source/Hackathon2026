import { describe, expect, it, beforeAll, afterEach } from 'vitest';
import { resolveOAuthAccount } from '@/lib/oauth/account-resolution';
import { sanitizeRedirectPath } from '@/lib/oauth/redirect';
import { generateCodeVerifier, codeChallengeFromVerifier, generateState, generateNonce } from '@/lib/oauth/pkce';
import { signHandshake, verifyHandshake } from '@/lib/oauth/handshake';

beforeAll(() => {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    process.env.AUTH_SECRET = 'test-only-secret-that-is-at-least-32-chars-long';
  }
});

describe('OAuth account-linking decision matrix (no auto-merge policy)', () => {
  it('creates a new user for a brand-new, verified identity', () => {
    const r = resolveOAuthAccount({
      existingOAuthAccountUserId: null,
      existingUserIdByEmail: null,
      emailVerified: true,
    });
    expect(r).toEqual({ action: 'create' });
  });

  it('rejects new-identity registration when the provider does not vouch the email is verified', () => {
    const r = resolveOAuthAccount({
      existingOAuthAccountUserId: null,
      existingUserIdByEmail: null,
      emailVerified: false,
    });
    expect(r).toEqual({ action: 'error', code: 'EMAIL_NOT_VERIFIED' });
  });

  it('logs in a returning user whose exact provider identity is already linked', () => {
    const r = resolveOAuthAccount({
      existingOAuthAccountUserId: 'user_1',
      existingUserIdByEmail: 'user_1',
      emailVerified: true,
    });
    expect(r).toEqual({ action: 'login', userId: 'user_1' });
  });

  it('NEVER auto-merges: same email but different/unlinked provider identity is blocked, not merged', () => {
    const r = resolveOAuthAccount({
      existingOAuthAccountUserId: null,
      existingUserIdByEmail: 'existing_password_user',
      emailVerified: true,
    });
    expect(r).toEqual({ action: 'error', code: 'ACCOUNT_EXISTS_DIFFERENT_METHOD' });
  });

  it('still blocks on email collision even if email is reported unverified (never merges either way)', () => {
    const r = resolveOAuthAccount({
      existingOAuthAccountUserId: null,
      existingUserIdByEmail: 'existing_user',
      emailVerified: false,
    });
    expect(r.action).toBe('error');
    expect((r as { code: string }).code).toBe('ACCOUNT_EXISTS_DIFFERENT_METHOD');
  });

  it('explicit link flow: attaches a brand-new provider identity to the authenticated user', () => {
    const r = resolveOAuthAccount({
      existingOAuthAccountUserId: null,
      existingUserIdByEmail: null,
      emailVerified: true,
      linkUserId: 'me_123',
    });
    expect(r).toEqual({ action: 'link', userId: 'me_123' });
  });

  it('explicit link flow: idempotent no-op when re-linking the same provider identity to the same user', () => {
    const r = resolveOAuthAccount({
      existingOAuthAccountUserId: 'me_123',
      existingUserIdByEmail: 'me_123',
      emailVerified: true,
      linkUserId: 'me_123',
    });
    expect(r).toEqual({ action: 'noop_already_linked', userId: 'me_123' });
  });

  it('explicit link flow: refuses to steal a provider identity already linked to a DIFFERENT user (account-takeover guard)', () => {
    const r = resolveOAuthAccount({
      existingOAuthAccountUserId: 'victim_user',
      existingUserIdByEmail: 'victim_user',
      emailVerified: true,
      linkUserId: 'attacker_user',
    });
    expect(r).toEqual({ action: 'error', code: 'LINKED_TO_OTHER_USER' });
  });

  it('link mode takes priority over email-collision checks (linking does not care about other accounts sharing the email)', () => {
    const r = resolveOAuthAccount({
      existingOAuthAccountUserId: null,
      existingUserIdByEmail: 'someone_else',
      emailVerified: true,
      linkUserId: 'me_123',
    });
    expect(r).toEqual({ action: 'link', userId: 'me_123' });
  });
});

describe('Open-redirect protection for post-OAuth redirects', () => {
  it('allows a clean internal relative path', () => {
    expect(sanitizeRedirectPath('/profile')).toBe('/profile');
    expect(sanitizeRedirectPath('/credit-matching?x=1')).toBe('/credit-matching?x=1');
  });

  it('defaults to "/" when no path is given', () => {
    expect(sanitizeRedirectPath(null)).toBe('/');
    expect(sanitizeRedirectPath(undefined)).toBe('/');
    expect(sanitizeRedirectPath('')).toBe('/');
  });

  it('rejects absolute external URLs', () => {
    expect(sanitizeRedirectPath('https://evil.example')).toBe('/');
    expect(sanitizeRedirectPath('http://evil.example/phish')).toBe('/');
  });

  it('rejects protocol-relative URLs', () => {
    expect(sanitizeRedirectPath('//evil.example')).toBe('/');
  });

  it('rejects paths that do not start with a single slash', () => {
    expect(sanitizeRedirectPath('evil.example')).toBe('/');
    expect(sanitizeRedirectPath('javascript:alert(1)')).toBe('/');
  });

  it('rejects backslash tricks sometimes used to bypass naive checks', () => {
    expect(sanitizeRedirectPath('/\\evil.example')).toBe('/');
  });
});

describe('PKCE helpers', () => {
  it('generates a fresh, sufficiently long code verifier each time', () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
  });

  it('derives the S256 code challenge deterministically from a verifier (RFC 7636 test vector)', () => {
    // From RFC 7636 Appendix B.
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
    expect(codeChallengeFromVerifier(verifier)).toBe(expectedChallenge);
  });

  it('generates non-repeating state and nonce values', () => {
    expect(generateState()).not.toBe(generateState());
    expect(generateNonce()).not.toBe(generateNonce());
  });
});

describe('OAuth handshake cookie payload (state/PKCE/nonce carrier)', () => {
  it('round-trips a signed handshake payload', async () => {
    const token = await signHandshake({
      provider: 'google',
      state: 'st_1',
      codeVerifier: 'cv_1',
      nonce: 'n_1',
      redirectPath: '/profile',
    });
    const decoded = await verifyHandshake(token);
    expect(decoded).toEqual({
      provider: 'google',
      state: 'st_1',
      codeVerifier: 'cv_1',
      nonce: 'n_1',
      redirectPath: '/profile',
      linkUserId: undefined,
    });
  });

  it('carries linkUserId through when set (explicit account-linking flow)', async () => {
    const token = await signHandshake({
      provider: 'microsoft',
      state: 'st_2',
      codeVerifier: 'cv_2',
      nonce: 'n_2',
      redirectPath: '/',
      linkUserId: 'user_42',
    });
    const decoded = await verifyHandshake(token);
    expect(decoded?.linkUserId).toBe('user_42');
  });

  it('rejects a tampered token', async () => {
    const token = await signHandshake({
      provider: 'google',
      state: 'st_3',
      codeVerifier: 'cv_3',
      nonce: 'n_3',
      redirectPath: '/',
    });
    const tampered = token.slice(0, -4) + 'abcd';
    expect(await verifyHandshake(tampered)).toBeNull();
  });

  it('rejects garbage input', async () => {
    expect(await verifyHandshake('not-a-jwt')).toBeNull();
    expect(await verifyHandshake('')).toBeNull();
  });
});

describe('Provider issuer validation', () => {
  afterEach(() => {
    delete process.env.MICROSOFT_TENANT_ID;
  });

  it('Microsoft multi-tenant ("common") accepts any well-formed tenant-GUID issuer', async () => {
    process.env.MICROSOFT_CLIENT_ID = 'test-client-id';
    process.env.MICROSOFT_CLIENT_SECRET = 'test-client-secret';
    const { getProviderConfig } = await import('@/lib/oauth/providers');
    const cfg = getProviderConfig('microsoft');
    expect(cfg.issuerMatches('https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0')).toBe(true);
    expect(cfg.issuerMatches('https://evil.example/v2.0')).toBe(false);
  });

  it('Microsoft single-tenant restricts to the exact configured tenant issuer', async () => {
    process.env.MICROSOFT_CLIENT_ID = 'test-client-id';
    process.env.MICROSOFT_CLIENT_SECRET = 'test-client-secret';
    process.env.MICROSOFT_TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const { getProviderConfig } = await import('@/lib/oauth/providers');
    const cfg = getProviderConfig('microsoft');
    expect(cfg.issuerMatches('https://login.microsoftonline.com/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/v2.0')).toBe(true);
    expect(cfg.issuerMatches('https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0')).toBe(false);
  });

  it('Google only accepts Google\u2019s two documented issuer forms', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    const { getProviderConfig } = await import('@/lib/oauth/providers');
    const cfg = getProviderConfig('google');
    expect(cfg.issuerMatches('https://accounts.google.com')).toBe(true);
    expect(cfg.issuerMatches('accounts.google.com')).toBe(true);
    expect(cfg.issuerMatches('https://evil.example')).toBe(false);
  });
});

describe('OAuth authorization URL construction', () => {
  it('includes state, nonce, PKCE challenge, and a confidential-client-safe response_type', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    const { buildAuthorizationUrl } = await import('@/lib/oauth/providers');
    const url = new URL(
      buildAuthorizationUrl('google', {
        redirectUri: 'https://app.example/api/auth/google/callback',
        state: 'st_abc',
        codeChallenge: 'chal_abc',
        nonce: 'nonce_abc',
      }),
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('st_abc');
    expect(url.searchParams.get('nonce')).toBe('nonce_abc');
    expect(url.searchParams.get('code_challenge')).toBe('chal_abc');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example/api/auth/google/callback');
  });
});

describe('OAuth app URL + provider availability', () => {
  it('uses a non-local APP_URL even when the request origin differs', async () => {
    const prev = process.env.APP_URL;
    process.env.APP_URL = 'https://tadbirkor.example';
    const { resolveAppUrl } = await import('@/lib/oauth/redirect');
    const url = resolveAppUrl(new Request('http://127.0.0.1:3000/api/auth/google'));
    expect(url).toBe('https://tadbirkor.example');
    process.env.APP_URL = prev;
  });

  it('falls back to the request origin when APP_URL is still localhost', async () => {
    const prev = process.env.APP_URL;
    process.env.APP_URL = 'http://localhost:3000';
    const { resolveAppUrl } = await import('@/lib/oauth/redirect');
    const url = resolveAppUrl(new Request('https://preview.example/api/auth/google'));
    expect(url).toBe('https://preview.example');
    process.env.APP_URL = prev;
  });

  it('treats blank OAuth client env as not configured', async () => {
    const gid = process.env.GOOGLE_CLIENT_ID;
    const gsec = process.env.GOOGLE_CLIENT_SECRET;
    process.env.GOOGLE_CLIENT_ID = '   ';
    process.env.GOOGLE_CLIENT_SECRET = '';
    const { isProviderConfigured } = await import('@/lib/oauth/providers');
    expect(isProviderConfigured('google')).toBe(false);
    process.env.GOOGLE_CLIENT_ID = gid;
    process.env.GOOGLE_CLIENT_SECRET = gsec;
  });
});

describe('OIDC email extraction', () => {
  it('prefers email and falls back to preferred_username when it looks like an email', async () => {
    const { emailFromOidcPayload } = await import('@/lib/oauth/providers');
    expect(emailFromOidcPayload({ email: 'A@B.com' })).toBe('a@b.com');
    expect(emailFromOidcPayload({ preferred_username: 'user@outlook.com' })).toBe('user@outlook.com');
    expect(emailFromOidcPayload({ preferred_username: 'live.com#user' })).toBeUndefined();
  });
});
