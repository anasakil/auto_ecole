import { NextResponse } from 'next/server';
const { initDb } = require('@/lib/database');

export async function GET() {
  try {
    await initDb();
    return NextResponse.json({ success: true, message: 'Database initialized successfully' });
  } catch (error) {
    console.error('DB init error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
