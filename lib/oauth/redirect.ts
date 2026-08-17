/**
 * Restricts post-login OAuth redirect targets to same-origin, relative paths.
 * Prevents open-redirect: a `redirect=https://evil.example` (or protocol-relative
 * `//evil.example`, backslash tricks, etc.) query parameter can never send the
 * user off-site — anything that isn't a clean internal path collapses to `/`.
 */
export function sanitizeRedirectPath(path: string | null | undefined): string {
  if (!path) return '/';
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes('://')) {
    return '/';
  }
  try {
    const parsed = new URL(path, 'http://internal.invalid');
    if (parsed.origin !== 'http://internal.invalid') return '/';
    return `${parsed.pathname}${parsed.search}` || '/';
  } catch {
    return '/';
  }
}

function isLocalhostUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Canonical app origin for OAuth redirect_uri. A non-local APP_URL always
 * wins (must match the URI registered at Google/Microsoft). If APP_URL is
 * missing or still localhost, use the incoming request origin so a deployed
 * preview is not stuck sending users to http://localhost:3000.
 */
export function resolveAppUrl(request: Request): string {
  const fromEnv = (process.env.APP_URL || '').trim().replace(/\/$/, '');
  const origin = new URL(request.url).origin;
  if (fromEnv && !isLocalhostUrl(fromEnv)) return fromEnv;
  return origin;
}

