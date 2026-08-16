import { randomBytes, createHash } from 'crypto';

/** PKCE code_verifier — high-entropy random string per RFC 7636 (43-128 chars, base64url here). */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/** PKCE code_challenge = BASE64URL(SHA256(code_verifier)), method "S256". */
export function codeChallengeFromVerifier(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/** Anti-CSRF `state` value for the OAuth authorization request. */
export function generateState(): string {
  return randomBytes(16).toString('hex');
}

/** OIDC `nonce` — bound into the ID token and checked at verification time. */
export function generateNonce(): string {
  return randomBytes(16).toString('hex');
}
