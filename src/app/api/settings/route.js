import { NextResponse } from 'next/server';
const db = require('@/lib/database');

export async function GET() {
  try {
    return NextResponse.json(await db.getSettings());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    await db.updateSettings(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
