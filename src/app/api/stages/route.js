import { NextResponse } from 'next/server';
const db = require('@/lib/database');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const action = searchParams.get('action');

    if (action === 'today') return NextResponse.json(await db.getTodayStages());
    if (action === 'upcoming') return NextResponse.json(await db.getUpcomingStages(Number(searchParams.get('days')) || 7));
    if (action === 'sessionTimeStats') return NextResponse.json(await db.getSessionTimeStats());
    if (action === 'studentSessionTimeStats' && studentId) return NextResponse.json(await db.getStudentSessionTimeStats(Number(studentId)));
    if (studentId) return NextResponse.json(await db.getStagesByStudent(Number(studentId)));

    return NextResponse.json(await db.getAllStages());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const result = await db.createStage(data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    const data = await request.json();
    await db.updateStage(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    await db.deleteStage(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
