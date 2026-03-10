import { NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

function getUploadsDir(subfolder = '') {
  const uploadsDir = path.join(process.cwd(), 'uploads', subfolder);
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

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const subfolder = formData.get('subfolder') || 'documents';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const uploadsDir = getUploadsDir(subfolder);
    const fileName = generateFileName(file.name);
    const filePath = path.join(uploadsDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const relativePath = path.join('uploads', subfolder, fileName);
    return NextResponse.json({ filePath: relativePath, fileName });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    const fullPath = path.join(process.cwd(), filePath);
    if (!existsSync(fullPath)) {
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
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    const fullPath = path.join(process.cwd(), filePath);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
