import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow login page and auth API
  if (pathname === '/login' || pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Check for auth token cookie
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    // Redirect to login for page requests
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Return 401 for API requests
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Basic JWT structure check (full verification happens in API routes)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    return NextResponse.next();
  } catch {
    if (!pathname.startsWith('/api/')) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
      return response;
    }
    return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
