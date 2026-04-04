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

const MIME_MAP = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
};

function toBase64(filePathOrExt, buffer) {
  const ext = path.extname(filePathOrExt).toLowerCase();
  const mime = MIME_MAP[ext] || 'application/octet-stream';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function getExt(filename) {
  return path.extname(filename).toLowerCase().replace('.', '');
}

function generateFileName(originalName) {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
}

// On Vercel files go to /tmp; locally to uploads/
function getUploadDir(subfolder) {
  const safe = subfolder.replace(/[^a-zA-Z0-9_-]/g, '');
  if (process.env.VERCEL) return path.join('/tmp', safe);
  return path.resolve(process.cwd(), 'uploads', safe);
}

// Validate that a relative path like "uploads/profiles/xxx.jpg" is safe
function isSafePath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return false;
  if (rawPath.includes('\0') || rawPath.includes('..')) return false;
  const normalized = rawPath.replace(/\\/g, '/');
  return (
    normalized.startsWith('uploads/') ||
    normalized.startsWith('/tmp/') ||
    normalized.startsWith('tmp/')
  );
}

// Resolve a stored relative path like "uploads/profiles/xxx.jpg" to an absolute path
// On Vercel: uploads/profiles/xxx  →  /tmp/profiles/xxx
// Locally:   uploads/profiles/xxx  →  <cwd>/uploads/profiles/xxx
function resolveStoredPath(rawPath) {
  const normalized = rawPath.replace(/\\/g, '/');
  if (process.env.VERCEL) {
    // Map uploads/xxx → /tmp/xxx
    const withoutPrefix = normalized.replace(/^uploads\//, '');
    return path.join('/tmp', withoutPrefix);
  }
  return path.resolve(process.cwd(), normalized);
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

    const fileName = generateFileName(file.name);
    const uploadDir = getUploadDir(subfolder);
    await mkdir(uploadDir, { recursive: true });
    const absolutePath = path.join(uploadDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(absolutePath, buffer);

    // Always use uploads/subfolder/filename as the stored path (canonical)
    const relativePath = `uploads/${subfolder}/${fileName}`;

    // Persist base64 in DB — this is the source of truth on Vercel
    const base64Content = toBase64(absolutePath, buffer);
    const autoEcoleId = auth.autoEcoleId || null;
    try {
      await db.createDocument(autoEcoleId, {
        student_id: null,
        type: file.type.startsWith('image/') ? 'Image' : 'PDF',
        name: file.name,
        file_path: relativePath,
        file_type: getExt(file.name),
        file_size: file.size,
        file_content: base64Content,
      });
    } catch (dbErr) {
      console.error('[files POST] DB persist error:', dbErr);
      // Still return success — file is on disk for local dev
    }

    // Return base64 directly so client can display immediately without a second request
    return NextResponse.json({ success: true, filePath: relativePath, fileName, base64: base64Content });
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
    if (!isSafePath(rawPath)) return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });

    const normalized = rawPath.replace(/\\/g, '/');

    // 1. Try DB — try both slash variants and with/without tenant
    try {
      const pathVariants = [normalized, normalized.replace(/\//g, '\\')];
      for (const p of pathVariants) {
        let doc = auth.autoEcoleId ? await db.getDocumentByPath(p, auth.autoEcoleId) : null;
        if (!doc) doc = await db.getDocumentByPath(p, null);
        if (doc?.file_content) return NextResponse.json({ data: doc.file_content });
      }
    } catch (dbErr) {
      console.error('[files GET] DB error:', dbErr);
    }

    // 2. Try filesystem — resolve canonical path (handles Vercel /tmp mapping)
    const fsPaths = [
      resolveStoredPath(normalized),
      // Also try the raw path relative to cwd (local dev fallback)
      path.resolve(process.cwd(), normalized),
    ];

    for (const candidate of fsPaths) {
      try {
        if (existsSync(candidate)) {
          const buf = await readFile(candidate);
          const data = toBase64(candidate, buf);

          // Back-fill DB so next request is instant
          try {
            await db.createDocument(auth.autoEcoleId || null, {
              student_id: null,
              type: buf ? 'Image' : 'PDF',
              name: path.basename(candidate),
              file_path: normalized,
              file_type: getExt(candidate),
              file_size: buf.length,
              file_content: data,
            });
          } catch {}

          return NextResponse.json({ data });
        }
      } catch {}
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

    if (!rawPath || !isSafePath(rawPath)) return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });

    const fsPaths = [
      resolveStoredPath(rawPath.replace(/\\/g, '/')),
      path.resolve(process.cwd(), rawPath.replace(/\\/g, '/')),
    ];

    for (const p of fsPaths) {
      try { if (existsSync(p)) await unlink(p); } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[files DELETE]', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
