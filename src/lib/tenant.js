const { isAuthenticated } = require('./auth');
const db = require('./database');

function getTenantContext(request) {
  const user = isAuthenticated(request);
  if (!user) return null;
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    autoEcoleId: user.auto_ecole_id,
    slug: user.slug,
    isSuperAdmin: user.role === 'super_admin',
  };
}

async function requireTenant(request) {
  const ctx = getTenantContext(request);
  if (!ctx) return null;

  // If super_admin, resolve autoEcoleId from X-Tenant-Slug header
  if (ctx.isSuperAdmin && !ctx.autoEcoleId) {
    const slug = request.headers.get('x-tenant-slug');
    if (slug) {
      const ecole = await db.getAutoEcoleBySlug(slug);
      if (ecole) {
        ctx.autoEcoleId = ecole.id;
        ctx.slug = slug;
        return ctx;
      }
    }
    return null;
  }

  if (!ctx.autoEcoleId) return null;
  return ctx;
}

function requireSuperAdmin(request) {
  const ctx = getTenantContext(request);
  if (!ctx || !ctx.isSuperAdmin) return null;
  return ctx;
}

function requireAuth(request) {
  const ctx = getTenantContext(request);
  if (!ctx) return null;
  return ctx;
}

module.exports = { getTenantContext, requireTenant, requireSuperAdmin, requireAuth };
