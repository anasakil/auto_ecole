import { NextResponse } from 'next/server';
const db = require('@/lib/database');
const { requireSuperAdmin } = require('@/lib/tenant');

export async function GET(request) {
  try {
    const admin = requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    return NextResponse.json(await db.getSuperAdminDashboardStats());
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
