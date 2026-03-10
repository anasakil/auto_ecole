import { NextResponse } from 'next/server';
const db = require('@/lib/database');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const action = searchParams.get('action');

    if (action === 'unresolved') return NextResponse.json(await db.getUnresolvedIncidents());
    if (action === 'count' && studentId) return NextResponse.json(await db.getStudentIncidentsCount(Number(studentId)));
    if (studentId) return NextResponse.json(await db.getIncidentsByStudent(Number(studentId)));

    return NextResponse.json(await db.getAllIncidents());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const result = await db.createIncident(data);
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
    await db.resolveIncident(id, data.notes);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    await db.deleteIncident(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
