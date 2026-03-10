import { NextResponse } from 'next/server';
const db = require('@/lib/database');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const studentId = searchParams.get('studentId');

    if (id) {
      const invoice = await db.getInvoiceById(Number(id));
      if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      return NextResponse.json(invoice);
    }

    if (studentId) {
      return NextResponse.json(await db.getInvoicesByStudent(Number(studentId)));
    }

    return NextResponse.json(await db.getAllInvoices());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const result = await db.createInvoice(data);
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
    await db.updateInvoiceStatus(id, data.status);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    await db.deleteInvoice(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
