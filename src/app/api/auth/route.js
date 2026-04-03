import { NextResponse } from 'next/server';
const bcrypt = require('bcryptjs');
const { getAdminByUsername, initDb } = require('@/lib/database');
const { generateToken, isAuthenticated } = require('@/lib/auth');
const { checkRateLimit } = require('@/lib/rateLimit');

export async function POST(request) {
  try {
    // Rate limit: 5 login attempts per 15 minutes per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const limit = checkRateLimit(`login:${ip}`, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.resetMs / 1000)) } }
      );
    }

    await initDb();
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Nom d\'utilisateur et mot de passe requis' }, { status: 400 });
    }

    const admin = await getAdminByUsername(username);
    if (!admin) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const token = generateToken(admin);

    const response = NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
        role: admin.role || 'admin',
        auto_ecole_id: admin.auto_ecole_id || null,
        slug: admin.slug || null,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours (matches TOKEN_EXPIRY)
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const user = isAuthenticated(request);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role || 'admin',
        auto_ecole_id: user.auto_ecole_id || null,
        slug: user.slug || null,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
