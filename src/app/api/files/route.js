export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import path from 'path';
const { requireAuth } = require('@/lib/tenant');
const db = require('@/lib/database');
const { uploadToStorage, deleteFromStorage, isStorageUrl } = require('@/lib/storage');

const ALLOWED_SUBFOLDERS = new Set(['documents', 'profiles', 'contracts', 'photos', 'logos']);
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const MIME_MAP = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
};

function toBase64(fileName, buffer) {
  const ext = path.extname(fileName).toLowerCase();
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
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage — permanent, works on Vercel
    const publicUrl = await uploadToStorage(buffer, subfolder, fileName, file.type);

    // Also build base64 for instant client preview
    const base64Content = toBase64(file.name, buffer);
    const autoEcoleId = auth.autoEcoleId || null;

    // Save record to DB (file_path = public URL, file_content = base64 for offline fallback)
    try {
      await db.createDocument(autoEcoleId, {
        student_id: null,
        type: file.type.startsWith('image/') ? 'Image' : 'PDF',
        name: file.name,
        file_path: publicUrl,
        file_type: getExt(file.name),
        file_size: file.size,
        file_content: base64Content,
      });
    } catch (dbErr) {
      console.error('[files POST] DB persist error:', dbErr);
    }

    return NextResponse.json({ success: true, filePath: publicUrl, fileName, base64: base64Content });
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

    // If it's already a public Supabase URL, fetch it directly and return as base64
    if (isStorageUrl(rawPath) || rawPath.startsWith('http')) {
      try {
        const res = await fetch(rawPath);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          const contentType = res.headers.get('content-type') || 'application/octet-stream';
          const ext = rawPath.split('.').pop().toLowerCase();
          const mime = MIME_MAP[`.${ext}`] || contentType;
          const data = `data:${mime};base64,${buf.toString('base64')}`;
          return NextResponse.json({ data });
        }
      } catch (fetchErr) {
        console.error('[files GET] fetch URL error:', fetchErr);
      }
      return NextResponse.json({ success: false, error: 'Fichier introuvable' }, { status: 404 });
    }

    // Legacy path (uploads/xxx) — try DB first
    const normalized = rawPath.replace(/\\/g, '/');
    try {
      const pathVariants = [normalized, normalized.replace(/\//g, '\\')];
      for (const p of pathVariants) {
        let doc = auth.autoEcoleId ? await db.getDocumentByPath(p, auth.autoEcoleId) : null;
        if (!doc) doc = await db.getDocumentByPath(p, null);
        if (doc?.file_content) return NextResponse.json({ data: doc.file_content });
        // If DB has a public URL stored, redirect to that
        if (doc?.file_path && isStorageUrl(doc.file_path)) {
          const res = await fetch(doc.file_path);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            const buf = Buffer.from(arrayBuf);
            const ext = doc.file_path.split('.').pop().toLowerCase();
            const mime = MIME_MAP[`.${ext}`] || 'application/octet-stream';
            const data = `data:${mime};base64,${buf.toString('base64')}`;
            return NextResponse.json({ data });
          }
        }
      }
    } catch (dbErr) {
      console.error('[files GET] DB error:', dbErr);
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

    // Delete from Supabase Storage (works for both full URLs and storage paths)
    try {
      await deleteFromStorage(rawPath);
    } catch (e) {
      console.error('[files DELETE] storage error:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[files DELETE]', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
