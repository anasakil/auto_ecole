import { NextResponse } from 'next/server';
const db = require('@/lib/database');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'counts') {
      return NextResponse.json(await db.getAlertsCounts());
    }

    return NextResponse.json(await db.getAllAlerts());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
