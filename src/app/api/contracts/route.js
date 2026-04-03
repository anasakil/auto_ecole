export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
const db = require('@/lib/database');
const { requireTenant } = require('@/lib/tenant');

function getUploadsDir(subfolder = '') {
  const base = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
  const uploadsDir = path.join(base, subfolder);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

function drawTextRTL(page, text, rightX, y, font, size) {
  if (!text) return;
  const textWidth = font.widthOfTextAtSize(String(text), size);
  page.drawText(String(text), { x: rightX - textWidth, y, size, font });
}

function drawTextCenter(page, text, centerX, y, font, size) {
  if (!text) return;
  const textWidth = font.widthOfTextAtSize(String(text), size);
  page.drawText(String(text), { x: centerX - textWidth / 2, y, size, font });
}

export async function POST(request) {
  try {
    const tenant = await requireTenant(request);
    if (!tenant) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { studentId, overrideData } = await request.json();

    const student = await db.getStudentById(Number(studentId), tenant.autoEcoleId);
    if (!student) throw new Error('Étudiant non trouvé');

    const settings = (await db.getSettings(tenant.autoEcoleId)) || {};
    const d = overrideData || {};

    const schoolName = d.school_name !== undefined ? d.school_name : (settings.school_name || '');
    const schoolAddress = d.address !== undefined ? d.address : (settings.address || '');
    const schoolPhone = d.phone !== undefined ? d.phone : (settings.phone || '');
    const schoolEmail = d.email !== undefined ? d.email : (settings.email || '');
    const schoolFax = d.fax !== undefined ? d.fax : (settings.fax || '');
    const webReference = d.web_reference !== undefined ? d.web_reference : (student.web_reference || '');
    const taxRegister = d.tax_register !== undefined ? d.tax_register : (settings.tax_register || '');
    const commercialRegister = d.commercial_register !== undefined ? d.commercial_register : (settings.commercial_register || '');
    const studentFullName = d.full_name !== undefined ? d.full_name : (student.full_name || '');
    const studentCin = d.cin !== undefined ? d.cin : (student.cin || '');
    const studentBirthPlace = d.birth_place !== undefined ? d.birth_place : (student.birth_place || '');
    const studentBirthDate = d.birth_date !== undefined ? d.birth_date : (student.birth_date || '');
    const studentAddress = d.student_address !== undefined ? d.student_address : (student.address || '');
    const licenseType = d.license_type !== undefined ? d.license_type : (student.license_type || 'B');
    const contractNumber = d.contract_number || '1';

    const templatePath = path.join(process.cwd(), 'public', 'CONTRAT -VIDE 1F.pdf');
    if (!fs.existsSync(templatePath)) {
      throw new Error('Modèle de contrat introuvable: ' + templatePath);
    }

    const templateBytes = fs.readFileSync(templatePath);
    const templatePdf = await PDFDocument.load(templateBytes);

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const [templatePage] = await pdfDoc.embedPdf(templatePdf, [0]);

    const pageWidth = 595.32;
    const pageHeight = 841.92;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    page.drawPage(templatePage, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
    const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'arialbd.ttf');

    const fontBytes = fs.readFileSync(fontPath);
    const fontBoldBytes = fs.readFileSync(fontBoldPath);
    const font = await pdfDoc.embedFont(fontBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    const today = new Date();
    const dateStr = d.contract_date || today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const regDate = d.registration_date || (student.registration_date
      ? new Date(student.registration_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : dateStr);

    drawTextCenter(page, licenseType, 256, 801, fontBold, 11);
    page.drawText(contractNumber, { x: 520, y: 787, size: 9, font });
    page.drawText(regDate, { x: 390, y: 787, size: 9, font });
    drawTextRTL(page, schoolName, 465, 750, font, 9);
    page.drawText(webReference, { x: 230, y: 623, size: 9, font });
    drawTextRTL(page, schoolAddress, 505, 728, font, 9);
    drawTextRTL(page, taxRegister, 420, 717, font, 9);
    drawTextRTL(page, commercialRegister, 400, 705, font, 9);

    const cityName = d.city !== undefined ? d.city : (settings.city || (schoolAddress ? schoolAddress.split(',').pop().trim() : ''));
    drawTextRTL(page, cityName || '', 180, 705, font, 9);
    drawTextRTL(page, schoolPhone, 505, 693, font, 9);
    drawTextRTL(page, schoolFax, 185, 693, font, 9);
    drawTextRTL(page, schoolEmail, 465, 681, font, 9);
    drawTextRTL(page, studentFullName, 500, 658, font, 10);
    drawTextRTL(page, studentCin, 488, 647, font, 9);
    drawTextRTL(page, studentBirthPlace, 308, 647, font, 9);
    page.drawText(studentBirthDate, { x: 90, y: 647, size: 9, font });
    drawTextRTL(page, studentAddress, 488, 635, font, 9);
    drawTextCenter(page, licenseType, 510, 543, fontBold, 10);
    drawTextCenter(page, cityName || '', 398, 157, font, 9);
    drawTextCenter(page, regDate, 202, 157, font, 9);

    const contractsDir = getUploadsDir('contracts');
    const fileName = `contrat-${student.qr_code}-${Date.now()}.pdf`;
    const filePath = path.join(contractsDir, fileName);

    const filledBytes = await pdfDoc.save();
    const filledPdf = await PDFDocument.load(filledBytes);
    const flatDoc = await PDFDocument.create();
    const [flatPage] = await flatDoc.embedPdf(filledPdf, [0]);
    const finalPage = flatDoc.addPage([pageWidth, pageHeight]);
    finalPage.drawPage(flatPage, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    const pdfBytes = await flatDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
    fs.writeFileSync(filePath, pdfBuffer);

    const relativePath = ['uploads', 'contracts', fileName].join('/');
    const base64Content = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    const docRecord = await db.createDocument(tenant.autoEcoleId, {
      student_id: studentId,
      type: 'Contrat',
      name: `Contrat - ${student.full_name}`,
      file_path: relativePath,
      file_type: 'pdf',
      file_size: pdfBytes.length,
      description: `Contrat de formation généré automatiquement le ${dateStr}`,
      file_content: base64Content
    });

    return NextResponse.json({ success: true, path: relativePath, documentId: docRecord.id });
  } catch (error) {
    console.error('Error generating contract:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
