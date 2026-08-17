import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { OAuthProviderId } from './handshake';

export type { OAuthProviderId };

export type OidcClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

type ProviderConfig = {
  id: OAuthProviderId;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  scope: string;
  issuerMatches: (iss: string) => boolean;
  /**
   * Google publishes a boolean `email_verified` claim we can check directly.
   * Microsoft's v2.0 id_token does not include an equivalent claim; a
   * Microsoft/Outlook account's email is verified by Microsoft itself as part
   * of account creation, and organizational (Entra ID) accounts are
   * IT-provisioned, so we treat the `email` claim as trustworthy when this
   * provider vouches for it. This is a documented product decision, not a
   * silent assumption — revisit if a stricter compliance requirement (e.g.
   * explicit re-verification) is ever needed.
   */
  trustsEmailWithoutExplicitClaim: boolean;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

export function isProviderConfigured(id: OAuthProviderId): boolean {
  if (id === 'google') {
    return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
  }
  return Boolean(process.env.MICROSOFT_CLIENT_ID?.trim() && process.env.MICROSOFT_CLIENT_SECRET?.trim());
}

export function getProviderConfig(id: OAuthProviderId): ProviderConfig {
  if (id === 'google') {
    return {
      id,
      clientId: requireEnv('GOOGLE_CLIENT_ID'),
      clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      scope: 'openid email profile',
      issuerMatches: (iss) => iss === 'https://accounts.google.com' || iss === 'accounts.google.com',
      trustsEmailWithoutExplicitClaim: false,
    };
  }

  // Microsoft identity platform v2.0. Default tenant "common" accepts both
  // work/school (Entra ID) and personal Microsoft accounts — the right
  // default for a public consumer product. Set MICROSOFT_TENANT_ID to a
  // specific tenant GUID to restrict sign-in to one organization.
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';
  const isMultiTenantAlias = tenant === 'common' || tenant === 'organizations' || tenant === 'consumers';
  return {
    id,
    clientId: requireEnv('MICROSOFT_CLIENT_ID'),
    clientSecret: requireEnv('MICROSOFT_CLIENT_SECRET'),
    authorizationEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    // Shared JWKS endpoint works for validating tokens from any tenant.
    jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
    scope: 'openid email profile',
    issuerMatches: isMultiTenantAlias
      ? (iss) => /^https:\/\/login\.microsoftonline\.com\/[0-9a-f-]{36}\/v2\.0$/i.test(iss)
      : (iss) => iss === `https://login.microsoftonline.com/${tenant}/v2.0`,
    trustsEmailWithoutExplicitClaim: true,
  };
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function getJwks(uri: string) {
  let jwks = jwksCache.get(uri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(uri));
    jwksCache.set(uri, jwks);
  }
  return jwks;
}

export function buildAuthorizationUrl(
  provider: OAuthProviderId,
  params: { redirectUri: string; state: string; codeChallenge: string; nonce: string },
): string {
  const cfg = getProviderConfig(provider);
  const url = new URL(cfg.authorizationEndpoint);
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', cfg.scope);
  url.searchParams.set('state', params.state);
  url.searchParams.set('nonce', params.nonce);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

export async function exchangeCodeForTokens(
  provider: OAuthProviderId,
  params: { code: string; redirectUri: string; codeVerifier: string },
): Promise<{ idToken: string }> {
  const cfg = getProviderConfig(provider);
  const body = new URLSearchParams();
  body.set('client_id', cfg.clientId);
  body.set('client_secret', cfg.clientSecret);
  body.set('code', params.code);
  body.set('redirect_uri', params.redirectUri);
  body.set('grant_type', 'authorization_code');
  body.set('code_verifier', params.codeVerifier);

  const res = await fetch(cfg.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as {
    id_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.id_token) {
    // Never log the request body (contains client_secret/code) or token response.
    throw new Error(`oauth_token_exchange_failed:${data.error || res.status}`);
  }
  return { idToken: data.id_token };
}

export function emailFromOidcPayload(payload: Record<string, unknown> | { email?: unknown; preferred_username?: unknown }): string | undefined {
  const raw =
    typeof payload.email === 'string'
      ? payload.email
      : typeof payload.preferred_username === 'string' && payload.preferred_username.includes('@')
        ? payload.preferred_username
        : undefined;
  return raw ? raw.toLowerCase() : undefined;
}

export async function verifyIdToken(provider: OAuthProviderId, idToken: string, expectedNonce: string): Promise<OidcClaims> {
  const cfg = getProviderConfig(provider);
  const jwks = getJwks(cfg.jwksUri);
  // jose validates signature, `exp`/`nbf`, and (via the `audience` option) `aud` for us.
  const { payload } = await jwtVerify(idToken, jwks, { audience: cfg.clientId });

  const iss = typeof payload.iss === 'string' ? payload.iss : '';
  if (!cfg.issuerMatches(iss)) {
    throw new Error('oauth_invalid_issuer');
  }
  if (payload.nonce !== expectedNonce) {
    throw new Error('oauth_invalid_nonce');
  }
  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('oauth_missing_sub');
  }

  const email = emailFromOidcPayload(payload as Record<string, unknown>);
  const explicitEmailVerified =
    typeof payload.email_verified === 'boolean'
      ? payload.email_verified
      : payload.email_verified === 'true'
        ? true
        : payload.email_verified === 'false'
          ? false
          : undefined;

  return {
    sub: payload.sub,
    email,
    email_verified: explicitEmailVerified ?? (cfg.trustsEmailWithoutExplicitClaim && Boolean(email)),
    name: typeof payload.name === 'string' ? payload.name : undefined,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
  };
}
