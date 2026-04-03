import { NextResponse } from 'next/server';
const db = require('@/lib/database');
const { requireTenant } = require('@/lib/tenant');

export async function GET(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const action = searchParams.get('action');

    if (action === 'overdue') {
      return NextResponse.json(await db.getOverduePayments(tenant.autoEcoleId));
    }

    if (action === 'upcoming') {
      const days = Number(searchParams.get('days')) || 7;
      return NextResponse.json(await db.getUpcomingPayments(tenant.autoEcoleId, days));
    }

    if (studentId) {
      return NextResponse.json(await db.getPaymentSchedulesByStudent(Number(studentId), tenant.autoEcoleId));
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await request.json();

    if (data.action === 'markPaid') {
      await db.markScheduleAsPaid(data.scheduleId, data.paymentId, tenant.autoEcoleId);
      return NextResponse.json({ success: true });
    }

    const result = await db.createPaymentSchedule(tenant.autoEcoleId, data.studentId, data.schedules);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
