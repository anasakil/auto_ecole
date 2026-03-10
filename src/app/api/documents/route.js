import { NextResponse } from 'next/server';
const db = require('@/lib/database');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const studentId = searchParams.get('studentId');

    if (id) {
      const doc = await db.getDocumentById(Number(id));
      if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      return NextResponse.json(doc);
    }

    if (studentId) {
      return NextResponse.json(await db.getDocumentsByStudent(Number(studentId)));
    }

    return NextResponse.json(await db.getAllDocuments());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const result = await db.createDocument(data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    await db.deleteDocument(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
