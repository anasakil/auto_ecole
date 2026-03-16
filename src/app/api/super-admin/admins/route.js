import { NextResponse } from 'next/server';
const db = require('@/lib/database');
const { requireSuperAdmin } = require('@/lib/tenant');

export async function GET(request) {
  try {
    const admin = requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const autoEcoleId = searchParams.get('autoEcoleId') || searchParams.get('ecoleId');

    if (!autoEcoleId) {
      return NextResponse.json({ error: 'autoEcoleId requis' }, { status: 400 });
    }

    const admins = await db.getAdminsByAutoEcole(Number(autoEcoleId));
    return NextResponse.json(admins);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await request.json();

    const autoEcoleId = data.autoEcoleId || data.auto_ecole_id;
    if (!autoEcoleId || !data.username || !data.password) {
      return NextResponse.json({ error: 'autoEcoleId, username et password requis' }, { status: 400 });
    }

    // Check username uniqueness
    const existing = await db.getAdminByUsername(data.username);
    if (existing) {
      return NextResponse.json({ error: 'Ce nom d\'utilisateur est déjà utilisé' }, { status: 400 });
    }

    const result = await db.createTenantAdmin(autoEcoleId, data.username, data.password);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const admin = requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const adminId = Number(searchParams.get('id'));
    const data = await request.json();

    if (!data.password) {
      return NextResponse.json({ error: 'Nouveau mot de passe requis' }, { status: 400 });
    }

    await db.updateTenantAdminPassword(adminId, data.password);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const admin = requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const adminId = Number(searchParams.get('id'));
    await db.deleteTenantAdmin(adminId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
