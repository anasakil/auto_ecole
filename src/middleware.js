import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow login page, auth API, init API, static files
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    (pathname.startsWith('/api/init') && process.env.NODE_ENV !== 'production') ||
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

    // Role-based route protection
    if (pathname.startsWith('/super-admin')) {
      // Only super_admin can access /super-admin routes
      if (payload.role !== 'super_admin') {
        if (payload.slug) {
          return NextResponse.redirect(new URL(`/${payload.slug}`, request.url));
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } else if (pathname === '/') {
      // Root redirect based on role
      if (payload.role === 'super_admin') {
        return NextResponse.redirect(new URL('/super-admin', request.url));
      } else if (payload.slug) {
        return NextResponse.redirect(new URL(`/${payload.slug}`, request.url));
      }
    } else if (!pathname.startsWith('/api/')) {
      // For tenant routes like /some-slug/students
      // Extract the slug from URL
      const urlSlug = pathname.split('/')[1];
      // Skip if it's super-admin (already handled above)
      if (urlSlug && urlSlug !== 'super-admin' && urlSlug !== 'login') {
        // If not super_admin, verify slug matches
        if (payload.role !== 'super_admin' && payload.slug !== urlSlug) {
          if (payload.slug) {
            return NextResponse.redirect(new URL(`/${payload.slug}`, request.url));
          }
          return NextResponse.redirect(new URL('/login', request.url));
        }
      }
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
