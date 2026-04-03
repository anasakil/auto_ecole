import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
const db = require('@/lib/database');
const { checkRateLimit } = require('@/lib/rateLimit');

// Public endpoint - no auth required
// Returns auto-école name, logo (base64), and slug for login page branding
export async function GET(request, { params }) {
  try {
    // Rate limit: 20 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const limit = checkRateLimit(`ecole:${ip}`, { maxAttempts: 20, windowMs: 60 * 1000 });
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { slug } = await params;
    const ecole = await db.getAutoEcoleBySlug(slug);

    if (!ecole || !ecole.active) {
      return NextResponse.json({ error: 'Auto-école introuvable' }, { status: 404 });
    }

    // Get settings for logo and school name
    const settings = await db.getSettings(ecole.id);

    // Resolve logo to base64
    let logoBase64 = null;
    if (settings?.logo) {
      // Try filesystem first
      const fullPath = path.resolve(process.cwd(), settings.logo);
      const tmpPath = settings.logo.replace(/^uploads/, '/tmp');

      if (existsSync(fullPath)) {
        const buf = readFileSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'image/png';
        logoBase64 = `data:${mime};base64,${buf.toString('base64')}`;
      } else if (process.env.VERCEL && existsSync(tmpPath)) {
        const buf = readFileSync(tmpPath);
        const ext = path.extname(tmpPath).toLowerCase();
        const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext] || 'image/png';
        logoBase64 = `data:${mime};base64,${buf.toString('base64')}`;
      } else {
        // Try DB fallback (documents table with file_content)
        try {
          const doc = await db.getDocumentByPath(settings.logo, ecole.id);
          if (doc?.file_content) logoBase64 = doc.file_content;
        } catch {}
      }
    }

    return NextResponse.json({
      id: ecole.id,
      name: ecole.name,
      slug: ecole.slug,
      logo: logoBase64,
      school_name: settings?.school_name || ecole.name,
    });
  } catch (error) {
    console.error('Error fetching auto-école:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
