import { NextResponse } from 'next/server';
const db = require('@/lib/database');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const action = searchParams.get('action');

    if (action === 'overdue') {
      return NextResponse.json(await db.getOverduePayments());
    }

    if (action === 'upcoming') {
      const days = Number(searchParams.get('days')) || 7;
      return NextResponse.json(await db.getUpcomingPayments(days));
    }

    if (studentId) {
      return NextResponse.json(await db.getPaymentSchedulesByStudent(Number(studentId)));
    }

    return NextResponse.json([]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    if (data.action === 'markPaid') {
      await db.markScheduleAsPaid(data.scheduleId, data.paymentId);
      return NextResponse.json({ success: true });
    }

    const result = await db.createPaymentSchedule(data.studentId, data.schedules);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
