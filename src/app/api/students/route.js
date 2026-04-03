export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { parseId, validate } from '@/lib/validate';
const db = require('@/lib/database');
const { requireTenant } = require('@/lib/tenant');

const STUDENT_RULES = {
  full_name: { required: true, type: 'string', minLength: 2, maxLength: 200 },
  total_price: { type: 'number', min: 0 },
  training_duration_days: { type: 'number', min: 1, max: 3650 },
};

export async function GET(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = parseId(searchParams.get('id'));

    if (searchParams.has('id')) {
      if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
      const student = await db.getStudentById(id, tenant.autoEcoleId);
      if (!student) return NextResponse.json({ error: 'Étudiant introuvable' }, { status: 404 });
      return NextResponse.json(student);
    }

    const students = await db.getAllStudents(tenant.autoEcoleId);
    return NextResponse.json(students);
  } catch (error) {
    console.error('[students GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await request.json();
    const { errors, valid } = validate(data, STUDENT_RULES);
    if (!valid) return NextResponse.json({ error: 'Données invalides', details: errors }, { status: 400 });

    const result = await db.createStudent(tenant.autoEcoleId, data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[students POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = parseId(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

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
    console.error('[students PUT]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = parseId(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

    await db.deleteStudent(id, tenant.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[students DELETE]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
