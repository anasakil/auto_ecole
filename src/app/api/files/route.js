export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
const { requireAuth } = require('@/lib/tenant');
const db = require('@/lib/database');

const ALLOWED_SUBFOLDERS = new Set(['documents', 'profiles', 'contracts', 'photos', 'logos']);
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function getUploadsBase() {
  return process.env.VERCEL ? '/tmp' : path.resolve(process.cwd(), 'uploads');
}

async function getUploadsDir(subfolder = 'documents') {
  const safe = subfolder.replace(/[^a-zA-Z0-9_-]/g, '');
  const dir = path.resolve(getUploadsBase(), safe);
  await mkdir(dir, { recursive: true });
  return dir;
}

function generateFileName(originalName) {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}${ext}`;
}

/**
 * Resolve and validate a file path is within allowed directories.
 * Returns the resolved absolute path or null if unauthorized.
 */
function resolveAllowedPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return null;

  // Normalize separators
  const normalized = rawPath.replace(/\\/g, '/');

  // Block null bytes and traversal before resolve
  if (normalized.includes('\0')) return null;

  const uploadsBase = path.resolve(process.cwd(), 'uploads');
  const tmpBase     = path.resolve('/tmp');
  const publicBase  = path.resolve(process.cwd(), 'public');

  const resolved = path.resolve(process.cwd(), normalized);

  const allowed =
    resolved.startsWith(uploadsBase + path.sep) ||
    resolved.startsWith(uploadsBase + '/') ||
    resolved === uploadsBase ||
    resolved.startsWith(tmpBase + path.sep) ||
    resolved.startsWith(tmpBase + '/') ||
    resolved.startsWith(publicBase + path.sep) ||
    resolved.startsWith(publicBase + '/');

  return allowed ? resolved : null;
}

export async function POST(request) {
  try {
    const auth = requireAuth(request);
    if (!auth) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    const rawSubfolder = (formData.get('subfolder') || 'documents').replace(/[^a-zA-Z0-9_-]/g, '');
    const subfolder = ALLOWED_SUBFOLDERS.has(rawSubfolder) ? rawSubfolder : 'documents';

    if (!file) return NextResponse.json({ success: false, error: 'Aucun fichier reçu' }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ success: false, error: 'Type de fichier non autorisé' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ success: false, error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 400 });

    const uploadsDir = await getUploadsDir(subfolder);
    const fileName = generateFileName(file.name);
    const filePath = path.join(uploadsDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const relativePath = ['uploads', subfolder, fileName].join('/');

    // Always persist base64 content in DB so files survive Vercel /tmp resets
    try {
      const base64Content = toBase64(filePath, buffer);
      const autoEcoleId = auth.autoEcoleId || null;
      await db.createDocument(autoEcoleId, {
        student_id: null,
        type: file.type.startsWith('image/') ? 'Image' : 'PDF',
        name: file.name,
        file_path: relativePath,
        file_type: path.extname(file.name).toLowerCase().replace('.', ''),
        file_size: file.size,
        file_content: base64Content,
      });
    } catch (dbErr) {
      // Non-fatal: file is on disk, DB persistence failed
      console.error('[files POST] DB persist error:', dbErr);
    }

    return NextResponse.json({ success: true, filePath: relativePath, fileName });
  } catch (error) {
    console.error('[files POST]', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const auth = requireAuth(request);
    if (!auth) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get('path');

    if (!rawPath) return NextResponse.json({ success: false, error: 'Chemin manquant' }, { status: 400 });

    const fullPath = resolveAllowedPath(rawPath);
    if (!fullPath) return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });

    const normalizedPath = rawPath.replace(/\\/g, '/');

    // Helper: try DB lookup with both slash variants and with/without tenant filter
    async function tryDb(path) {
      const paths = [path, path.replace(/\//g, '\\')];
      for (const p of paths) {
        // Try with tenant filter first, then without (for profile images not linked to a document)
        let doc = auth.autoEcoleId ? await db.getDocumentByPath(p, auth.autoEcoleId) : null;
        if (!doc) doc = await db.getDocumentByPath(p, null);
        if (doc?.file_content) return doc.file_content;
      }
      return null;
    }

    // Always try DB first — base64 content is always stored there for Vercel compatibility
    try {
      const content = await tryDb(normalizedPath);
      if (content) return NextResponse.json({ data: content });
    } catch (dbErr) {
      console.error('[files GET] DB lookup error:', dbErr);
    }

    // Try local filesystem (dev) or /tmp (Vercel)
    const candidates = [fullPath];
    if (process.env.VERCEL) {
      const tmpResolved = resolveAllowedPath(normalizedPath.replace(/^uploads\//, '/tmp/'));
      if (tmpResolved) candidates.push(tmpResolved);
    }

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        const buf = await readFile(candidate);
        return NextResponse.json({ data: toBase64(candidate, buf) });
      }
    }

    return NextResponse.json({ success: false, error: 'Fichier introuvable' }, { status: 404 });
  } catch (error) {
    console.error('[files GET]', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = requireAuth(request);
    if (!auth) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get('path');

    if (!rawPath) return NextResponse.json({ success: false, error: 'Chemin manquant' }, { status: 400 });

    const fullPath = resolveAllowedPath(rawPath);
    if (!fullPath) return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });

    if (existsSync(fullPath)) await unlink(fullPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[files DELETE]', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

function toBase64(filePath, buffer) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
    '.svg': 'image/svg+xml',
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
