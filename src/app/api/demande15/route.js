import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
const db = require('@/lib/database');
const { requireTenant } = require('@/lib/tenant');

function getUploadsDir(subfolder = '') {
  const base = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
  const uploadsDir = path.join(base, subfolder);
  if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir, { recursive: true }); }
  return uploadsDir;
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
    const cityName = d.city !== undefined ? d.city : (settings.city || '');
    const studentNom = d.nom !== undefined ? d.nom : (student.full_name ? student.full_name.split(' ').slice(-1).join(' ') : '');
    const studentPrenom = d.prenom !== undefined ? d.prenom : (student.full_name ? student.full_name.split(' ').slice(0, -1).join(' ') : '');
    const studentCin = d.cin !== undefined ? d.cin : (student.cin || '');
    const examDate = d.exam_date || '';
    const requestedDate = d.requested_date || '';

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
    const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'arialbd.ttf');
    const fontBytes = fs.readFileSync(fontPath);
    const fontBoldBytes = fs.readFileSync(fontBoldPath);
    const font = await pdfDoc.embedFont(fontBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    const pageWidth = 595.32;
    const pageHeight = 841.92;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const today = new Date();
    const dateStr = d.contract_date || today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const qrCode = student.qr_code || `STU-${studentId}`;

    const BLACK = rgb(0, 0, 0);
    const DARK = rgb(0.15, 0.15, 0.15);
    const GRAY = rgb(0.4, 0.4, 0.4);
    const LIGHT_LINE = rgb(0.7, 0.7, 0.7);

    const mL = 60;
    const mR = 535;
    let y = pageHeight - 55;

    const schoolLabel = schoolName || 'Auto-Ecole';
    const schoolW = fontBold.widthOfTextAtSize(schoolLabel, 14);
    page.drawText(schoolLabel, { x: (pageWidth - schoolW) / 2, y, size: 14, font: fontBold, color: BLACK });
    y -= 16;

    if (schoolAddress || schoolPhone) {
      const sub = [schoolAddress, schoolPhone].filter(Boolean).join('  -  ');
      const subW = font.widthOfTextAtSize(sub, 8);
      page.drawText(sub, { x: (pageWidth - subW) / 2, y, size: 8, font, color: GRAY });
      y -= 12;
    }

    page.drawLine({ start: { x: mL, y }, end: { x: mR, y }, thickness: 1.2, color: BLACK });
    y -= 30;

    const cityDateStr = `${cityName || '..............'}  Le  ${dateStr}`;
    const cdW = font.widthOfTextAtSize(cityDateStr, 11);
    page.drawText(cityDateStr, { x: mR - cdW, y, size: 11, font, color: BLACK });
    y -= 40;

    const drawLabel = (label, value, xLabel, yPos) => {
      page.drawText(label, { x: xLabel, y: yPos, size: 11, font: fontBold, color: DARK });
      const lw = fontBold.widthOfTextAtSize(label, 11);
      page.drawText(String(value || ''), { x: xLabel + lw + 8, y: yPos, size: 11, font, color: BLACK });
    };

    drawLabel('Nom :', studentNom, mL, y); y -= 22;
    drawLabel('Prenom :', studentPrenom, mL, y); y -= 22;
    drawLabel('CINE N° :', studentCin, mL, y); y -= 40;

    const destLines = ["A L'intention de Monsieur", "le Directeur Regional", "de L'Equipement et des Transports"];
    for (const line of destLines) {
      const lw = font.widthOfTextAtSize(line, 12);
      page.drawText(line, { x: (pageWidth - lw) / 2 + 60, y, size: 12, font, color: BLACK });
      y -= 20;
    }
    y -= 25;

    const objetLabel = 'Objet :';
    const objetValue = " Demande d'avancement pour 15 jours";
    page.drawText(objetLabel, { x: mL + 30, y, size: 12, font: fontBold, color: BLACK });
    const objLabelW = fontBold.widthOfTextAtSize(objetLabel, 12);
    page.drawLine({ start: { x: mL + 30, y: y - 2 }, end: { x: mL + 30 + objLabelW, y: y - 2 }, thickness: 0.8, color: BLACK });
    page.drawText(objetValue, { x: mL + 30 + objLabelW, y, size: 12, font, color: BLACK });
    y -= 40;

    const indent = mL + 30;
    page.drawText("Je vous prie de bien vouloir proceder a l'avancement des dates d'examen du", { x: indent, y, size: 11, font, color: BLACK });
    y -= 18;

    const line2a = "permis de conduire. Pour le 2 eme dossier L'examen et prevue le  ";
    page.drawText(line2a, { x: mL, y, size: 11, font, color: BLACK });
    const line2aW = font.widthOfTextAtSize(line2a, 11);
    const examDateDisplay = examDate || '...... / ...... / ..........';
    page.drawText(examDateDisplay, { x: mL + line2aW, y, size: 11, font: fontBold, color: BLACK });
    y -= 25;

    const line3a = "Je vous prie d'avancer la date d'examen du permis de conduire a la date du";
    page.drawText(line3a, { x: indent, y, size: 11, font, color: BLACK });
    y -= 20;
    const requestedDateDisplay = requestedDate || '...... / ...... / ..........';
    page.drawText(requestedDateDisplay, { x: mL, y, size: 11, font: fontBold, color: BLACK });
    y -= 50;

    const closingText = "Je vous prie d'agreer, Monsieur, l'expression de mes respectueuses salutations.";
    const closingW = font.widthOfTextAtSize(closingText, 11);
    page.drawText(closingText, { x: (pageWidth - closingW) / 2, y, size: 11, font, color: BLACK });
    y -= 70;

    const sigLabel = 'Signature :';
    page.drawText(sigLabel, { x: (pageWidth / 2) + 40, y, size: 12, font: fontBold, color: BLACK });
    y -= 50;
    page.drawLine({ start: { x: (pageWidth / 2) + 20, y }, end: { x: (pageWidth / 2) + 180, y }, thickness: 0.5, color: LIGHT_LINE });

    const footerY = 35;
    page.drawLine({ start: { x: mL, y: footerY + 10 }, end: { x: mR, y: footerY + 10 }, thickness: 0.4, color: LIGHT_LINE });
    const footerText = [schoolName, schoolAddress, schoolPhone ? ('Tel: ' + schoolPhone) : ''].filter(Boolean).join('  -  ');
    if (footerText) {
      const ftW = font.widthOfTextAtSize(footerText, 7);
      page.drawText(footerText, { x: (pageWidth - ftW) / 2, y: footerY, size: 7, font, color: GRAY });
    }

    const filledBytes = await pdfDoc.save();
    const filledPdf = await PDFDocument.load(filledBytes);
    const flatDoc = await PDFDocument.create();
    const [flatPage] = await flatDoc.embedPdf(filledPdf, [0]);
    const finalPage = flatDoc.addPage([pageWidth, pageHeight]);
    finalPage.drawPage(flatPage, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    const pdfBytes = await flatDoc.save();
    const demandesDir = getUploadsDir('demandes');
    const fileName = `demande15-${qrCode}-${Date.now()}.pdf`;
    const filePath = path.join(demandesDir, fileName);
    fs.writeFileSync(filePath, pdfBytes);

    const relativePath = ['uploads', 'demandes', fileName].join('/');
    const base64Content = `data:application/pdf;base64,${pdfBytes.toString('base64')}`;
    const docRecord = await db.createDocument(tenant.autoEcoleId, {
      student_id: studentId, type: 'Demande 15j', name: `Demande 15j - ${student.full_name}`,
      file_path: relativePath, file_type: 'pdf', file_size: pdfBytes.length,
      description: `Demande d'avancement 15 jours generee automatiquement le ${dateStr}`,
      file_content: base64Content
    });

    return NextResponse.json({ success: true, path: relativePath, documentId: docRecord.id });
  } catch (error) {
    console.error('Error generating demande 15j:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
