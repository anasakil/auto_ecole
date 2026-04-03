export const dynamic = 'force-dynamic';
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

    if (action === 'today') return NextResponse.json(await db.getTodayStages(tenant.autoEcoleId));
    if (action === 'upcoming') return NextResponse.json(await db.getUpcomingStages(tenant.autoEcoleId, Number(searchParams.get('days')) || 7));
    if (action === 'sessionTimeStats') return NextResponse.json(await db.getSessionTimeStats(tenant.autoEcoleId));
    if (action === 'studentSessionTimeStats' && studentId) return NextResponse.json(await db.getStudentSessionTimeStats(Number(studentId), tenant.autoEcoleId));
    if (studentId) return NextResponse.json(await db.getStagesByStudent(Number(studentId), tenant.autoEcoleId));

    return NextResponse.json(await db.getAllStages(tenant.autoEcoleId));
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await request.json();
    const result = await db.createStage(tenant.autoEcoleId, data);
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
    await db.updateStage(id, tenant.autoEcoleId, data);
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
    await db.deleteStage(id, tenant.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
