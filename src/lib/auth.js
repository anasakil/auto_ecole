const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'auto-ecole-secret-key-change-in-production-2026';
const TOKEN_EXPIRY = '7d';

function generateToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
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
