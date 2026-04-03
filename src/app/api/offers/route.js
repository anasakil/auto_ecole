import { NextResponse } from 'next/server';
const db = require('@/lib/database');
const { requireTenant } = require('@/lib/tenant');

export async function GET(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    return NextResponse.json(await db.getAllOffers(tenant.autoEcoleId));
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await request.json();
    const result = await db.createOffer(tenant.autoEcoleId, data);
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
    await db.updateOffer(id, tenant.autoEcoleId, data);
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
    await db.deleteOffer(id, tenant.autoEcoleId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
