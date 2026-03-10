import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow login page, auth API, init API, static files
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/init') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/fonts')
  ) {
    return NextResponse.next();
  }

  // Check for auth token cookie
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Verify JWT structure and decode payload to check expiry
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');

    // Decode payload (base64) and check expiry
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);

    if (!payload.exp || payload.exp < now) {
      throw new Error('Token expired');
    }

    if (!payload.id || !payload.username) {
      throw new Error('Invalid payload');
    }

    return NextResponse.next();
  } catch {
    // Clear invalid cookie and redirect
    if (!pathname.startsWith('/api/')) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return response;
    }
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};
