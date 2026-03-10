import { NextResponse } from 'next/server';
const db = require('@/lib/database');

export async function GET() {
  try {
    return NextResponse.json(await db.getDashboardStats());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
