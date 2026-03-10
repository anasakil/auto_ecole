import { NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
const db = require('@/lib/database');

function getUploadsDir(subfolder = '') {
  const uploadsDir = path.join(process.cwd(), 'uploads', subfolder);
  if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir, { recursive: true }); }
  return uploadsDir;
}

export async function POST(request) {
  try {
    const { studentId, overrideData } = await request.json();
    const student = await db.getStudentById(Number(studentId));
    if (!student) throw new Error('Étudiant non trouvé');
    const settings = await db.getSettings();
    const d = overrideData || {};

    const schoolName = d.school_name !== undefined ? d.school_name : (settings.school_name || '');
    const schoolAddress = d.address !== undefined ? d.address : (settings.address || '');
    const schoolPhone = d.phone !== undefined ? d.phone : (settings.phone || '');
    const cityName = d.city !== undefined ? d.city : (settings.city || '');
    const studentFullName = d.full_name !== undefined ? d.full_name : (student.full_name || '');
    const studentCin = d.cin !== undefined ? d.cin : (student.cin || '');
    const studentBirthDate = d.birth_date !== undefined ? d.birth_date : (student.birth_date || '');
    const studentBirthPlace = d.birth_place !== undefined ? d.birth_place : (student.birth_place || '');
    const studentAddress = d.student_address !== undefined ? d.student_address : (student.address || '');
    const licenseType = d.license_type !== undefined ? d.license_type : (student.license_type || 'B');
    const examCodeDate = d.exam_code_date || '';
    const examConduitDate = d.exam_conduit_date || '';
    const requestedCodeDate = d.requested_code_date || '';
    const requestedConduitDate = d.requested_conduit_date || '';
    const motif = d.motif || '';
    const webReference = d.web_reference !== undefined ? d.web_reference : (student.web_reference || '');

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
    const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'arialbd.ttf');
    const fontBytes = fs.readFileSync(fontPath);
    const fontBoldBytes = fs.readFileSync(fontBoldPath);
    const font = await pdfDoc.embedFont(fontBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    const pageWidth = 595.32; const pageHeight = 841.92;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const today = new Date();
    const dateStr = d.contract_date || today.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const BLACK = rgb(0, 0, 0); const DARK_GRAY = rgb(0.2, 0.2, 0.2);
    const GRAY = rgb(0.4, 0.4, 0.4); const LINE_COLOR = rgb(0.3, 0.3, 0.3);
    const LIGHT_BG = rgb(0.95, 0.95, 0.97);
    const marginLeft = 50; const marginRight = 545; const contentWidth = marginRight - marginLeft;
    let y = pageHeight - 50;

    const headerText = schoolName || 'Auto-École';
    const headerWidth = fontBold.widthOfTextAtSize(headerText, 16);
    page.drawText(headerText, { x: (pageWidth - headerWidth) / 2, y, size: 16, font: fontBold, color: BLACK });
    y -= 18;

    const subHeader = [schoolAddress, schoolPhone].filter(Boolean).join(' - ');
    if (subHeader) {
      const subWidth = font.widthOfTextAtSize(subHeader, 9);
      page.drawText(subHeader, { x: (pageWidth - subWidth) / 2, y, size: 9, font, color: GRAY });
      y -= 14;
    }
    y -= 4;
    page.drawLine({ start: { x: marginLeft, y }, end: { x: marginRight, y }, thickness: 1.5, color: LINE_COLOR });
    y -= 25;

    const cityDateText = `${cityName || '...........'} Le ${dateStr}`;
    const cityDateWidth = font.widthOfTextAtSize(cityDateText, 11);
    page.drawText(cityDateText, { x: marginRight - cityDateWidth, y, size: 11, font, color: BLACK });
    y -= 35;

    const titleText = "CONTRAT D'AVANCEMENT"; const titleSize = 15;
    const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
    const titleX = (pageWidth - titleWidth) / 2;
    page.drawText(titleText, { x: titleX, y, size: titleSize, font: fontBold, color: BLACK });
    page.drawLine({ start: { x: titleX - 5, y: y - 3 }, end: { x: titleX + titleWidth + 5, y: y - 3 }, thickness: 1, color: BLACK });
    y -= 18;

    const subtitleText = `Permis de conduire - Catégorie : ${licenseType}`;
    const subtitleWidth = font.widthOfTextAtSize(subtitleText, 10);
    page.drawText(subtitleText, { x: (pageWidth - subtitleWidth) / 2, y, size: 10, font, color: DARK_GRAY });
    y -= 30;

    page.drawRectangle({ x: marginLeft, y: y - 3, width: contentWidth, height: 18, color: LIGHT_BG });
    page.drawText('INFORMATIONS DU CANDIDAT', { x: marginLeft + 10, y: y + 1, size: 10, font: fontBold, color: BLACK });
    y -= 25;

    const drawField = (label, value, xPos, yPos) => {
      page.drawText(label, { x: xPos, y: yPos, size: 9, font: fontBold, color: DARK_GRAY });
      const labelW = fontBold.widthOfTextAtSize(label, 9);
      page.drawText(String(value || ''), { x: xPos + labelW + 5, y: yPos, size: 10, font, color: BLACK });
    };

    drawField('Nom et Prénom :', studentFullName, marginLeft + 10, y); y -= 18;
    drawField('CIN N° :', studentCin, marginLeft + 10, y);
    drawField('Né(e) le :', studentBirthDate, 300, y); y -= 18;
    drawField('Lieu de naissance :', studentBirthPlace, marginLeft + 10, y); y -= 18;
    drawField('Adresse :', studentAddress, marginLeft + 10, y); y -= 18;
    if (webReference) { drawField('Réf. Web :', webReference, marginLeft + 10, y); y -= 18; }

    y -= 5;
    page.drawLine({ start: { x: marginLeft + 10, y }, end: { x: marginRight - 10, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 20;

    page.drawRectangle({ x: marginLeft, y: y - 3, width: contentWidth, height: 18, color: LIGHT_BG });
    page.drawText("OBJET DE LA DEMANDE D'AVANCEMENT", { x: marginLeft + 10, y: y + 1, size: 10, font: fontBold, color: BLACK });
    y -= 30;

    const bodyLines = [
      `Je soussigné(e) ${studentFullName}, titulaire de la CIN N° ${studentCin},`,
      `demande par la présente l'avancement de la date de passage de l'examen`,
      `du permis de conduire catégorie ${licenseType}.`,
    ];
    for (const line of bodyLines) { page.drawText(line, { x: marginLeft + 10, y, size: 10, font, color: BLACK }); y -= 16; }
    y -= 10;

    page.drawRectangle({ x: marginLeft + 10, y: y - 5, width: contentWidth - 20, height: 42, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.5, color: rgb(1, 1, 1) });
    page.drawText('Examen de Code :', { x: marginLeft + 20, y: y + 18, size: 10, font: fontBold, color: DARK_GRAY });
    drawField('Date prévue :', examCodeDate || '....../....../......', marginLeft + 30, y + 2);
    drawField('Date demandée :', requestedCodeDate || '....../....../......', 300, y + 2);
    y -= 55;

    page.drawRectangle({ x: marginLeft + 10, y: y - 5, width: contentWidth - 20, height: 42, borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.5, color: rgb(1, 1, 1) });
    page.drawText('Examen de Conduite :', { x: marginLeft + 20, y: y + 18, size: 10, font: fontBold, color: DARK_GRAY });
    drawField('Date prévue :', examConduitDate || '....../....../......', marginLeft + 30, y + 2);
    drawField('Date demandée :', requestedConduitDate || '....../....../......', 300, y + 2);
    y -= 55;

    page.drawText('Motif de la demande :', { x: marginLeft + 10, y, size: 10, font: fontBold, color: DARK_GRAY });
    y -= 16;

    const motifText = motif || '..........................................................................................................................';
    const maxLineWidth = contentWidth - 40;
    const words = motifText.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = font.widthOfTextAtSize(testLine, 10);
      if (testWidth > maxLineWidth && currentLine) {
        page.drawText(currentLine, { x: marginLeft + 20, y, size: 10, font, color: BLACK }); y -= 15;
        currentLine = word;
      } else { currentLine = testLine; }
    }
    if (currentLine) { page.drawText(currentLine, { x: marginLeft + 20, y, size: 10, font, color: BLACK }); y -= 15; }

    for (let i = 0; i < 2; i++) {
      y -= 5;
      for (let dx = marginLeft + 20; dx < marginRight - 20; dx += 6) {
        page.drawLine({ start: { x: dx, y }, end: { x: Math.min(dx + 3, marginRight - 20), y }, thickness: 0.3, color: rgb(0.6, 0.6, 0.6) });
      }
      y -= 12;
    }
    y -= 15;

    page.drawLine({ start: { x: marginLeft + 10, y: y + 5 }, end: { x: marginRight - 10, y: y + 5 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 5;

    const engagementLines = ["Je m'engage à respecter les conditions fixées par l'auto-école et à me présenter", "à la nouvelle date d'examen qui me sera communiquée."];
    for (const line of engagementLines) { page.drawText(line, { x: marginLeft + 10, y, size: 9, font, color: DARK_GRAY }); y -= 14; }
    y -= 30;

    page.drawText('Signature du Candidat', { x: marginLeft + 20, y, size: 10, font: fontBold, color: BLACK });
    const sigSchoolText = "Cachet et Signature de l'Auto-École";
    const sigSchoolWidth = fontBold.widthOfTextAtSize(sigSchoolText, 10);
    page.drawText(sigSchoolText, { x: marginRight - 20 - sigSchoolWidth, y, size: 10, font: fontBold, color: BLACK });
    y -= 50;
    page.drawLine({ start: { x: marginLeft + 10, y }, end: { x: marginLeft + 170, y }, thickness: 0.5, color: LINE_COLOR });
    page.drawLine({ start: { x: marginRight - 180, y }, end: { x: marginRight - 10, y }, thickness: 0.5, color: LINE_COLOR });

    const footerY = 40;
    page.drawLine({ start: { x: marginLeft, y: footerY + 10 }, end: { x: marginRight, y: footerY + 10 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    const footerText = `${schoolName} - ${schoolAddress} - Tél: ${schoolPhone}`;
    const footerWidth = font.widthOfTextAtSize(footerText, 7);
    page.drawText(footerText, { x: (pageWidth - footerWidth) / 2, y: footerY, size: 7, font, color: GRAY });

    const filledBytes = await pdfDoc.save();
    const filledPdf = await PDFDocument.load(filledBytes);
    const flatDoc = await PDFDocument.create();
    const [flatPage] = await flatDoc.embedPdf(filledPdf, [0]);
    const finalPage = flatDoc.addPage([pageWidth, pageHeight]);
    finalPage.drawPage(flatPage, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    const pdfBytes = await flatDoc.save();
    const contractsDir = getUploadsDir('contracts');
    const qrCode = student.qr_code || `STU-${studentId}`;
    const fileName = `contrat-avancement-${qrCode}-${Date.now()}.pdf`;
    const filePath = path.join(contractsDir, fileName);
    fs.writeFileSync(filePath, pdfBytes);

    const relativePath = path.join('uploads', 'contracts', fileName);
    const docRecord = await db.createDocument({
      student_id: studentId, type: "Contrat d'Avancement",
      name: `Contrat d'Avancement - ${student.full_name}`,
      file_path: relativePath, file_type: 'pdf', file_size: pdfBytes.length,
      description: `Contrat d'avancement généré automatiquement le ${dateStr}`
    });

    return NextResponse.json({ success: true, path: relativePath, documentId: docRecord.id });
  } catch (error) {
    console.error("Error generating contrat d'avancement:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
