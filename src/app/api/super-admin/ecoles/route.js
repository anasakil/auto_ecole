import { NextResponse } from 'next/server';
const db = require('@/lib/database');
const { requireSuperAdmin } = require('@/lib/tenant');

export async function GET(request) {
  try {
    const admin = requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Return single école with settings and admins
      const ecoles = await db.getAllAutoEcoles();
      const ecole = ecoles.find(e => String(e.id) === String(id));
      if (!ecole) return NextResponse.json({ error: 'Auto-école introuvable' }, { status: 404 });

      const settings = await db.getSettings(Number(id));
      const admins = await db.getAdminsByAutoEcole(Number(id));
      return NextResponse.json({ ...ecole, settings, admins });
    }

    return NextResponse.json(await db.getAllAutoEcoles());
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const data = await request.json();

    if (!data.name || !data.slug) {
      return NextResponse.json({ error: 'Nom et slug requis' }, { status: 400 });
    }

    const existing = await db.getAutoEcoleBySlug(data.slug);
    if (existing) {
      return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 });
    }

    const result = await db.createAutoEcole(data);

    // Create settings with all provided info
    await db.createSettingsForAutoEcole(result.id, {
      school_name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      fax: data.fax,
      city: data.city,
      tax_register: data.tax_register,
      commercial_register: data.commercial_register,
      web_reference: data.web_reference,
      logo: data.logo,
    });

    // Create admin if provided
    if (data.adminUsername && data.adminPassword) {
      const existingAdmin = await db.getAdminByUsername(data.adminUsername);
      if (existingAdmin) {
        return NextResponse.json({ error: "Ce nom d'utilisateur est déjà utilisé" }, { status: 400 });
      }
      await db.createTenantAdmin(result.id, data.adminUsername, data.adminPassword);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const admin = requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    const data = await request.json();

    if (!data.name || !data.slug) {
      return NextResponse.json({ error: 'Nom et slug requis' }, { status: 400 });
    }

    // Check slug uniqueness (exclude current record)
    const existing = await db.getAutoEcoleBySlug(data.slug);
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 });
    }

    await db.updateAutoEcole(id, data);

    // Update settings if provided
    if (data.settings) {
      await db.updateSettings(id, data.settings);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const admin = requireSuperAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    await db.deleteAutoEcole(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error); return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
