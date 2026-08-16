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
