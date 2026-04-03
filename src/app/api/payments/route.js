export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { parseId, validate } from '@/lib/validate';
const db = require('@/lib/database');
const { requireTenant } = require('@/lib/tenant');

const PAYMENT_RULES = {
  student_id: { required: true, type: 'number', min: 1 },
  amount:     { required: true, type: 'number', min: 0.01 },
  payment_method: { required: true, enum: ['Cash', 'Transfer', 'Cheque', 'TPE'] },
  payment_date:   { required: true, type: 'string' },
};

export async function GET(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const studentId = parseId(searchParams.get('studentId'));

    if (searchParams.has('studentId')) {
      if (!studentId) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
      return NextResponse.json(await db.getPaymentsByStudent(studentId, tenant.autoEcoleId));
    }

    return NextResponse.json(await db.getAllPayments(tenant.autoEcoleId));
  } catch (error) {
    console.error('[payments GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await request.json();
    const { errors, valid } = validate(data, PAYMENT_RULES);
    if (!valid) return NextResponse.json({ error: 'Données invalides', details: errors }, { status: 400 });

    const result = await db.createPayment(tenant.autoEcoleId, data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[payments POST]', error);
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

    await db.deletePayment(id, tenant.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[payments DELETE]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
