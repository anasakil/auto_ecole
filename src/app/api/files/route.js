import { NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
const { requireAuth } = require('@/lib/tenant');
const db = require('@/lib/database');

function getUploadsDir(subfolder = '') {
  const base = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
  const uploadsDir = path.join(base, subfolder);
  if (!existsSync(uploadsDir)) {
    require('fs').mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

function generateFileName(originalName) {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}${ext}`;
}

const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request) {
  try {
    const auth = requireAuth(request);
    if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    const subfolder = (formData.get('subfolder') || 'documents').replace(/[^a-zA-Z0-9_-]/g, '');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 400 });
    }

    const uploadsDir = getUploadsDir(subfolder);
    const fileName = generateFileName(file.name);
    const filePath = path.join(uploadsDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const relativePath = ['uploads', subfolder, fileName].join('/');
    return NextResponse.json({ filePath: relativePath, fileName });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const auth = requireAuth(request);
    if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get('path');

    if (!rawPath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    // Normalize path separators (Windows backslashes → forward slashes)
    const filePath = rawPath.replace(/\\/g, '/');

    // Try both local uploads and /tmp (Vercel)
    let fullPath = path.resolve(process.cwd(), filePath);

    // Path traversal protection
    const uploadsBase = path.resolve(process.cwd(), 'uploads');
    const publicBase = path.resolve(process.cwd(), 'public');
    const tmpBase = '/tmp'; // Vercel ephemeral storage

    const isAuthorized = fullPath.startsWith(uploadsBase) ||
                       fullPath.startsWith(publicBase) ||
                       (process.env.VERCEL && filePath.startsWith('uploads'));

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // On Vercel, try DB first since /tmp is ephemeral and files won't persist across invocations
    if (process.env.VERCEL) {
      try {
        // Try both forward-slash and backslash versions of the path
        let doc = await db.getDocumentByPath(filePath, auth.autoEcoleId);
        if (!doc) {
          const backslashPath = filePath.replace(/\//g, '\\');
          doc = await db.getDocumentByPath(backslashPath, auth.autoEcoleId);
        }
        if (doc && doc.file_content) {
          return NextResponse.json({ data: doc.file_content });
        }
      } catch (dbError) {
        console.error('Database fallback error:', dbError);
      }

      // Then try /tmp as last resort
      const tmpPath = filePath.replace(/^uploads/, '/tmp');
      const resolvedTmpPath = path.resolve(tmpPath);
      if (existsSync(resolvedTmpPath)) {
        fullPath = resolvedTmpPath;
      } else {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
    }

    if (!existsSync(fullPath)) {
      // Fallback: Check database for file content
      try {
        const doc = await db.getDocumentByPath(filePath, auth.autoEcoleId);
        if (doc && doc.file_content) {
          return NextResponse.json({ data: doc.file_content });
        }
      } catch (dbError) {
        console.error('Database fallback error:', dbError);
      }
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    const base64 = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

    return NextResponse.json({ data: base64 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = requireAuth(request);
    if (!auth) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    const fullPath = path.resolve(process.cwd(), filePath);

    // Path traversal protection
    const uploadsBase = path.resolve(process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads'));
    if (!fullPath.startsWith(uploadsBase) && !fullPath.startsWith(path.resolve(process.cwd(), 'public'))) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
