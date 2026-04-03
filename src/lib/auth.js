const jwt = require('jsonwebtoken');

const TOKEN_EXPIRY = '24h';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  if (secret.length < 32) {
    console.warn('WARNING: JWT_SECRET should be at least 32 characters for security');
  }
  return secret;
}

function generateToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      username: admin.username,
      role: admin.role || 'admin',
      auto_ecole_id: admin.auto_ecole_id || null,
      slug: admin.slug || null,
    },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

function getTokenFromRequest(request) {
  // Check cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (match) return match[1];

  // Check Authorization header
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);

  return null;
}

function isAuthenticated(request) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

module.exports = { generateToken, verifyToken, getTokenFromRequest, isAuthenticated };
