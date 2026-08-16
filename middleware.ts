import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_API = new Set(['/api/auth/login', '/api/auth/register', '/api/health']);

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-XSS-Protection', '0');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/') && !PUBLIC_API.has(pathname)) {
    const session = request.cookies.get('tadbirkorai_session');
    if (!session?.value && pathname !== '/api/auth/logout' && pathname !== '/api/auth/me') {
      // me/logout handled in handlers; other APIs require cookie presence as first gate
      if (!pathname.startsWith('/api/auth/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
