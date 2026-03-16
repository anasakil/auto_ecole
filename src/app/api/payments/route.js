import { NextResponse } from 'next/server';
const db = require('@/lib/database');
const { requireTenant } = require('@/lib/tenant');

export async function GET(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (studentId) {
      return NextResponse.json(await db.getPaymentsByStudent(Number(studentId), tenant.autoEcoleId));
    }

    return NextResponse.json(await db.getAllPayments(tenant.autoEcoleId));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await request.json();
    const result = await db.createPayment(tenant.autoEcoleId, data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    await db.deletePayment(id, tenant.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
