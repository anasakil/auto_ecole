import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return response;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  return new TextEncoder().encode(secret);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow static files early
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/fonts')) {
    return NextResponse.next();
  }

  // Block /api/init in production
  if (pathname.startsWith('/api/init') && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  // Allow public routes
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/ecoles/') ||
    (pathname.startsWith('/api/init') && process.env.NODE_ENV !== 'production')
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow tenant login pages: /[slug]/login
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 2 && segments[1] === 'login' && segments[0] !== 'super-admin') {
    return addSecurityHeaders(NextResponse.next());
  }

  // Check for auth token cookie
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    if (!pathname.startsWith('/api/')) {
      const urlSlug = segments[0];
      if (urlSlug && urlSlug !== 'super-admin' && urlSlug !== 'login') {
        return NextResponse.redirect(new URL(`/${urlSlug}/login`, request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Verify JWT signature + expiry using jose (Edge-compatible)
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] });

    if (!payload.id || !payload.username) {
      throw new Error('Invalid payload');
    }

    // Role-based route protection
    if (pathname.startsWith('/super-admin')) {
      if (payload.role !== 'super_admin') {
        if (payload.slug) {
          return NextResponse.redirect(new URL(`/${payload.slug}`, request.url));
        }
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } else if (pathname === '/') {
      if (payload.role === 'super_admin') {
        return NextResponse.redirect(new URL('/super-admin', request.url));
      } else if (payload.slug) {
        return NextResponse.redirect(new URL(`/${payload.slug}`, request.url));
      }
    } else if (!pathname.startsWith('/api/')) {
      const urlSlug = segments[0];
      if (urlSlug && urlSlug !== 'super-admin' && urlSlug !== 'login') {
        // Already authed on login page → redirect to dashboard
        if (segments[1] === 'login') {
          if (payload.role === 'super_admin' || payload.slug === urlSlug) {
            return NextResponse.redirect(new URL(`/${urlSlug}`, request.url));
          }
        }
        // Verify slug matches for non-super-admin
        if (payload.role !== 'super_admin' && payload.slug !== urlSlug) {
          if (payload.slug) {
            return NextResponse.redirect(new URL(`/${payload.slug}`, request.url));
          }
          return NextResponse.redirect(new URL('/login', request.url));
        }
      }
    }

    return addSecurityHeaders(NextResponse.next());
  } catch {
    if (!pathname.startsWith('/api/')) {
      const urlSlug = segments[0];
      if (urlSlug && urlSlug !== 'super-admin' && urlSlug !== 'login') {
        const response = NextResponse.redirect(new URL(`/${urlSlug}/login`, request.url));
        response.cookies.set('auth_token', '', { maxAge: 0, path: '/' });
        return response;
      }
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
