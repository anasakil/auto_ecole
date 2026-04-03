export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
const db = require('@/lib/database');
const { requireTenant } = require('@/lib/tenant');

export async function GET(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const studentId = searchParams.get('studentId');

    if (id) {
      const doc = await db.getDocumentById(Number(id), tenant.autoEcoleId);
      if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      return NextResponse.json(doc);
    }

    if (studentId) {
      return NextResponse.json(await db.getDocumentsByStudent(Number(studentId), tenant.autoEcoleId));
    }

    return NextResponse.json(await db.getAllDocuments(tenant.autoEcoleId));
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await request.json();
    const result = await db.createDocument(tenant.autoEcoleId, data);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    await db.deleteDocument(id, tenant.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
