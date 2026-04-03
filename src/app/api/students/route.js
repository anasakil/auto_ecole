import { NextResponse } from 'next/server';
const db = require('@/lib/database');
const { requireTenant } = require('@/lib/tenant');

export async function GET(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const student = await db.getStudentById(Number(id), tenant.autoEcoleId);
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      return NextResponse.json(student);
    }

    const students = await db.getAllStudents(tenant.autoEcoleId);
    return NextResponse.json(students);
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await request.json();
    const result = await db.createStudent(tenant.autoEcoleId, data);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    const data = await request.json();

    if (data.action === 'markLicenseObtained') {
      await db.markLicenseObtained(id, tenant.autoEcoleId, data.licenseType, data.dateObtained);
      return NextResponse.json({ success: true });
    }

    if (data.action === 'updateFollowUp') {
      await db.updateStudentFollowUp(id, tenant.autoEcoleId, data);
      return NextResponse.json({ success: true });
    }

    if (data.action === 'updateImage') {
      await db.updateStudentImage(id, tenant.autoEcoleId, data.field, data.imagePath);
      return NextResponse.json({ success: true });
    }

    await db.updateStudent(id, tenant.autoEcoleId, data);
    return NextResponse.json({ success: true });
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
    await db.deleteStudent(id, tenant.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
