import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';

// ─── Types ───────────────────────────────────────────────────────────

export type InvoiceForPdf = {
  numeroFacture: string;
  dateFacture: Date;
  dateEcheance: Date;
  montantHt: number;
  montantTtc: number;
  tvaTaux: number | null;
  statut?: string;
  clientFinal?: {
    raisonSociale?: string | null;
    nom?: string | null;
    prenom?: string | null;
    email?: string | null;
    adresse?: string | null;
  } | null;
  tenant?: {
    nomEntreprise: string;
    siret?: string | null;
    adressePostale?: string | null;
    codePostal?: string | null;
    ville?: string | null;
    telephone?: string | null;
    emailContact: string;
  } | null;
};

// ─── Couleurs ────────────────────────────────────────────────────────

const COLORS = {
  primary: rgb(0.11, 0.27, 0.53),       // Bleu foncé #1C4587
  primaryLight: rgb(0.85, 0.90, 0.97),   // Bleu très clair #D9E6F8
  accent: rgb(0.20, 0.55, 0.86),         // Bleu accent #3388DB
  dark: rgb(0.13, 0.13, 0.13),           // Quasi noir
  text: rgb(0.25, 0.25, 0.25),           // Gris foncé texte
  muted: rgb(0.45, 0.45, 0.45),          // Gris
  light: rgb(0.65, 0.65, 0.65),          // Gris clair
  border: rgb(0.82, 0.82, 0.82),         // Bordure
  white: rgb(1, 1, 1),
  rowAlt: rgb(0.96, 0.97, 0.99),         // Fond alternance #F5F7FC
  success: rgb(0.13, 0.59, 0.33),        // Vert payé
  warning: rgb(0.85, 0.55, 0.08),        // Orange en attente
  danger: rgb(0.80, 0.15, 0.15),         // Rouge en retard
};

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateShort(d: Date): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20AC';
}

function textWidth(text: string, font: PDFFont, size: number): number {
  return font.widthOfTextAtSize(text, size);
}

function drawTextRight(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = COLORS.text) {
  const w = textWidth(text, font, size);
  page.drawText(text, { x: x - w, y, size, font, color });
}

// ─── Statut badge ────────────────────────────────────────────────────

function getStatutInfo(statut?: string): { label: string; color: ReturnType<typeof rgb>; bg: ReturnType<typeof rgb> } {
  switch (statut) {
    case 'payee':
      return { label: 'PAYEE', color: COLORS.success, bg: rgb(0.88, 0.96, 0.90) };
    case 'envoyee':
      return { label: 'ENVOYEE', color: COLORS.accent, bg: rgb(0.90, 0.94, 0.99) };
    case 'en_retard':
      return { label: 'EN RETARD', color: COLORS.danger, bg: rgb(0.98, 0.90, 0.90) };
    case 'brouillon':
      return { label: 'BROUILLON', color: COLORS.muted, bg: rgb(0.94, 0.94, 0.94) };
    default:
      return { label: (statut || '').toUpperCase(), color: COLORS.text, bg: COLORS.primaryLight };
  }
}

// ─── PDF principal ───────────────────────────────────────────────────

export async function generateInvoicePdf(invoice: InvoiceForPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const ml = 50;  // margin left
  const mr = 50;  // margin right
  const contentWidth = width - ml - mr;
  let y = height;

  // ═══════════════════════════════════════════════════════════════════
  // HEADER — Bande bleue en haut
  // ═══════════════════════════════════════════════════════════════════
  const headerH = 90;
  page.drawRectangle({
    x: 0, y: height - headerH,
    width, height: headerH,
    color: COLORS.primary,
  });

  // Nom entreprise (émetteur)
  const tenantName = invoice.tenant?.nomEntreprise || 'TalosPrimes';
  page.drawText(tenantName, {
    x: ml, y: height - 38,
    size: 20, font: fontBold, color: COLORS.white,
  });

  // Sous-titre
  const tenantInfo = [
    invoice.tenant?.adressePostale,
    [invoice.tenant?.codePostal, invoice.tenant?.ville].filter(Boolean).join(' '),
  ].filter(Boolean).join(' — ');
  if (tenantInfo) {
    page.drawText(tenantInfo, {
      x: ml, y: height - 56,
      size: 8.5, font, color: rgb(0.78, 0.85, 0.95),
    });
  }

  // Contact tenant à droite
  const tenantContact = [
    invoice.tenant?.emailContact,
    invoice.tenant?.telephone,
  ].filter(Boolean).join('  |  ');
  if (tenantContact) {
    drawTextRight(page, tenantContact, width - mr, height - 38, font, 8, rgb(0.78, 0.85, 0.95));
  }

  // SIRET à droite
  if (invoice.tenant?.siret) {
    drawTextRight(page, `SIRET : ${invoice.tenant.siret}`, width - mr, height - 52, font, 8, rgb(0.65, 0.75, 0.88));
  }

  // "FACTURE" à droite en gros
  drawTextRight(page, 'FACTURE', width - mr, height - 76, fontBold, 14, COLORS.white);

  y = height - headerH - 30;

  // ═══════════════════════════════════════════════════════════════════
  // INFOS FACTURE — Numéro, dates, statut
  // ═══════════════════════════════════════════════════════════════════

  // Bloc gris clair avec infos facture
  const infoBoxH = 68;
  page.drawRectangle({
    x: ml, y: y - infoBoxH,
    width: contentWidth, height: infoBoxH,
    color: COLORS.primaryLight,
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });

  const infoY = y - 18;
  const col1 = ml + 16;
  const col2 = ml + contentWidth * 0.35;
  const col3 = ml + contentWidth * 0.65;

  // Col 1 : Numéro
  page.drawText('N\u00B0 Facture', { x: col1, y: infoY, size: 7, font, color: COLORS.muted });
  page.drawText(invoice.numeroFacture, { x: col1, y: infoY - 15, size: 11, font: fontBold, color: COLORS.primary });

  // Col 2 : Date
  page.drawText('Date de facturation', { x: col2, y: infoY, size: 7, font, color: COLORS.muted });
  page.drawText(formatDate(invoice.dateFacture), { x: col2, y: infoY - 15, size: 10, font, color: COLORS.dark });
  page.drawText('Date d\'\u00E9ch\u00E9ance', { x: col2, y: infoY - 32, size: 7, font, color: COLORS.muted });
  page.drawText(formatDate(invoice.dateEcheance), { x: col2, y: infoY - 47, size: 10, font, color: COLORS.dark });

  // Col 3 : Statut badge
  if (invoice.statut) {
    const statut = getStatutInfo(invoice.statut);
    const badgeW = textWidth(statut.label, fontBold, 9) + 20;
    const badgeX = col3;
    page.drawText('Statut', { x: badgeX, y: infoY, size: 7, font, color: COLORS.muted });
    page.drawRectangle({
      x: badgeX, y: infoY - 22,
      width: badgeW, height: 18,
      color: statut.bg,
      borderColor: statut.color,
      borderWidth: 0.5,
    });
    page.drawText(statut.label, {
      x: badgeX + 10, y: infoY - 17,
      size: 9, font: fontBold, color: statut.color,
    });
  }

  y -= infoBoxH + 28;

  // ═══════════════════════════════════════════════════════════════════
  // CLIENT — Facturer à
  // ═══════════════════════════════════════════════════════════════════

  page.drawText('Factur\u00E9 \u00E0', { x: ml, y, size: 8, font, color: COLORS.muted });
  y -= 16;

  const client = invoice.clientFinal;
  const clientName =
    (client?.raisonSociale ?? [client?.prenom, client?.nom].filter(Boolean).join(' ') || '\u2014').trim() || 'Client';

  page.drawText(clientName, { x: ml, y, size: 12, font: fontBold, color: COLORS.dark });
  y -= 15;

  if (client?.adresse) {
    page.drawText(client.adresse, { x: ml, y, size: 9, font, color: COLORS.text, maxWidth: 250 });
    y -= 13;
  }
  if (client?.email) {
    page.drawText(client.email, { x: ml, y, size: 9, font: fontOblique, color: COLORS.accent });
    y -= 13;
  }

  y -= 20;

  // ═══════════════════════════════════════════════════════════════════
  // TABLEAU — Détail des prestations
  // ═══════════════════════════════════════════════════════════════════

  const tableLeft = ml;
  const tableRight = width - mr;
  const tableW = tableRight - tableLeft;

  // Colonnes : Désignation (flex) | Qté | PU HT | Total HT
  const colQte = tableRight - 200;
  const colPuHt = tableRight - 130;
  const colTotalHt = tableRight - 10;

  // En-tête tableau
  const thH = 28;
  page.drawRectangle({
    x: tableLeft, y: y - thH,
    width: tableW, height: thH,
    color: COLORS.primary,
  });

  const thY = y - 18;
  page.drawText('D\u00E9signation', { x: tableLeft + 12, y: thY, size: 9, font: fontBold, color: COLORS.white });
  page.drawText('Qt\u00E9', { x: colQte, y: thY, size: 9, font: fontBold, color: COLORS.white });
  drawTextRight(page, 'P.U. HT', colPuHt + 55, thY, fontBold, 9, COLORS.white);
  drawTextRight(page, 'Total HT', colTotalHt, thY, fontBold, 9, COLORS.white);

  y -= thH;

  // Ligne de prestation
  const rowH = 30;
  page.drawRectangle({
    x: tableLeft, y: y - rowH,
    width: tableW, height: rowH,
    color: COLORS.rowAlt,
    borderColor: COLORS.border,
    borderWidth: 0.3,
  });

  const rowY = y - 19;
  page.drawText('Prestation de services', { x: tableLeft + 12, y: rowY, size: 9.5, font, color: COLORS.dark });
  page.drawText('1', { x: colQte + 8, y: rowY, size: 9.5, font, color: COLORS.text });
  drawTextRight(page, formatMoney(invoice.montantHt), colPuHt + 55, rowY, font, 9.5, COLORS.text);
  drawTextRight(page, formatMoney(invoice.montantHt), colTotalHt, rowY, font, 9.5, COLORS.dark);

  y -= rowH;

  // Bordure basse du tableau
  page.drawLine({
    start: { x: tableLeft, y },
    end: { x: tableRight, y },
    thickness: 0.5,
    color: COLORS.border,
  });

  y -= 20;

  // ═══════════════════════════════════════════════════════════════════
  // TOTAUX — Sous-total, TVA, Total TTC
  // ═══════════════════════════════════════════════════════════════════

  const totalsX = tableRight - 200;
  const totalsValX = tableRight - 10;
  const tva = invoice.montantTtc - invoice.montantHt;
  const tvaTaux = invoice.tvaTaux ?? 20;

  // Sous-total HT
  page.drawText('Sous-total HT', { x: totalsX, y, size: 9, font, color: COLORS.text });
  drawTextRight(page, formatMoney(invoice.montantHt), totalsValX, y, font, 9, COLORS.text);
  y -= 16;

  // TVA
  page.drawText(`TVA (${tvaTaux}\u00A0%)`, { x: totalsX, y, size: 9, font, color: COLORS.text });
  drawTextRight(page, formatMoney(tva), totalsValX, y, font, 9, COLORS.text);
  y -= 6;

  // Ligne séparatrice
  page.drawLine({
    start: { x: totalsX, y },
    end: { x: totalsValX, y },
    thickness: 0.8,
    color: COLORS.primary,
  });
  y -= 18;

  // Total TTC (grand, en bleu)
  const totalBoxH = 32;
  page.drawRectangle({
    x: totalsX - 8, y: y - totalBoxH + 10,
    width: totalsValX - totalsX + 18, height: totalBoxH,
    color: COLORS.primary,
  });

  page.drawText('TOTAL TTC', {
    x: totalsX + 4, y: y - 10,
    size: 11, font: fontBold, color: COLORS.white,
  });
  drawTextRight(page, formatMoney(invoice.montantTtc), totalsValX - 4, y - 10, fontBold, 13, COLORS.white);

  y -= totalBoxH + 30;

  // ═══════════════════════════════════════════════════════════════════
  // CONDITIONS DE PAIEMENT
  // ═══════════════════════════════════════════════════════════════════

  page.drawText('Conditions de paiement', { x: ml, y, size: 9, font: fontBold, color: COLORS.primary });
  y -= 14;
  page.drawText(`Paiement d\u00FB avant le ${formatDateShort(invoice.dateEcheance)}.`, {
    x: ml, y, size: 8.5, font, color: COLORS.text,
  });
  y -= 12;
  page.drawText('En cas de retard, une p\u00E9nalit\u00E9 de 3 fois le taux d\'\u00E9int\u00E9r\u00EAt l\u00E9gal sera appliqu\u00E9e (art. L441-10 Code de commerce).', {
    x: ml, y, size: 7.5, font: fontOblique, color: COLORS.light, maxWidth: contentWidth,
  });
  y -= 10;
  page.drawText('Indemnit\u00E9 forfaitaire pour frais de recouvrement : 40,00 \u20AC.', {
    x: ml, y, size: 7.5, font: fontOblique, color: COLORS.light,
  });

  // ═══════════════════════════════════════════════════════════════════
  // FOOTER — Bande en bas
  // ═══════════════════════════════════════════════════════════════════

  const footerH = 40;
  page.drawRectangle({
    x: 0, y: 0,
    width, height: footerH,
    color: rgb(0.95, 0.96, 0.97),
  });
  page.drawLine({
    start: { x: 0, y: footerH },
    end: { x: width, y: footerH },
    thickness: 0.5,
    color: COLORS.border,
  });

  const footerParts = [
    tenantName,
    invoice.tenant?.siret ? `SIRET ${invoice.tenant.siret}` : null,
    invoice.tenant?.emailContact,
    invoice.tenant?.telephone,
  ].filter(Boolean);

  const footerText = footerParts.join('  \u2022  ');
  const footerW = textWidth(footerText, font, 7);
  page.drawText(footerText, {
    x: (width - footerW) / 2,
    y: 16,
    size: 7, font, color: COLORS.light,
  });

  // "Merci pour votre confiance"
  const merci = 'Merci pour votre confiance.';
  const merciW = textWidth(merci, fontOblique, 9);
  page.drawText(merci, {
    x: (width - merciW) / 2,
    y: footerH + 20,
    size: 9, font: fontOblique, color: COLORS.accent,
  });

  return doc.save();
}
