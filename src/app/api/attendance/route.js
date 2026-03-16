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

    if (action === 'today') {
      return NextResponse.json(await db.getTodayAttendance(tenant.autoEcoleId));
    }

    if (action === 'status' && studentId) {
      return NextResponse.json({ status: await db.getStudentAttendanceStatus(tenant.autoEcoleId, Number(studentId)) });
    }

    if (studentId) {
      return NextResponse.json(await db.getAttendanceByStudent(Number(studentId), tenant.autoEcoleId));
    }

    return NextResponse.json(await db.getTodayAttendance(tenant.autoEcoleId));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await request.json();

    if (data.action === 'scanIn') {
      return NextResponse.json(await db.recordAttendanceIn(tenant.autoEcoleId, data.studentId));
    }

    if (data.action === 'scanOut') {
      return NextResponse.json(await db.recordAttendanceOut(tenant.autoEcoleId, data.studentId));
    }

    if (data.action === 'cleanup') {
      return NextResponse.json(await db.cleanupDuplicateAttendance(tenant.autoEcoleId));
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
