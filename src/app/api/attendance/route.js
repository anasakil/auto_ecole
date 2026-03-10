import { NextResponse } from 'next/server';
const db = require('@/lib/database');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const action = searchParams.get('action');

    if (action === 'today') {
      return NextResponse.json(await db.getTodayAttendance());
    }

    if (action === 'status' && studentId) {
      return NextResponse.json({ status: await db.getStudentAttendanceStatus(Number(studentId)) });
    }

    if (studentId) {
      return NextResponse.json(await db.getAttendanceByStudent(Number(studentId)));
    }

    return NextResponse.json(await db.getTodayAttendance());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();

    if (data.action === 'scanIn') {
      return NextResponse.json(await db.recordAttendanceIn(data.studentId));
    }

    if (data.action === 'scanOut') {
      return NextResponse.json(await db.recordAttendanceOut(data.studentId));
    }

    if (data.action === 'cleanup') {
      return NextResponse.json(await db.cleanupDuplicateAttendance());
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
