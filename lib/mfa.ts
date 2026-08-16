import { generateSecret, generateURI, generateSync, verifySync } from 'otplib';

export function generateMfaSecret() {
  return generateSecret();
}

export function mfaOtpauthUrl(email: string, secret: string) {
  return generateURI({
    issuer: 'TadbirkorAI',
    label: email,
    secret,
  });
}

export function verifyMfaToken(secret: string, token: string) {
  if (!secret || !token) return false;
  const result = verifySync({ secret, token: token.replace(/\s/g, '') });
  return Boolean(result && typeof result === 'object' && 'valid' in result && result.valid);
}

export function currentMfaToken(secret: string) {
  return generateSync({ secret });
}
