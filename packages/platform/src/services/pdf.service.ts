import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';

// ─── Types ───────────────────────────────────────────────────────────

export type InvoiceForPdf = {
  numeroFacture: string;
  dateFacture: Date;
  dateEcheance: Date;
  montantHt: number;
  montantTtc: number;
  tvaTaux: number | null;
  description?: string;
  modePaiement?: string;
  statut?: string;
  clientFinal?: {
    raisonSociale?: string | null;
    nom?: string | null;
    prenom?: string | null;
    email?: string | null;
    telephone?: string | null;
    adresse?: string | null;
  } | null;
  tenant?: {
    nomEntreprise: string;
    siret?: string | null;
    tvaIntracom?: string | null;
    rib?: string | null;
    adressePostale?: string | null;
    codePostal?: string | null;
    ville?: string | null;
    telephone?: string | null;
    emailContact: string;
  } | null;
};

// ─── Couleurs ────────────────────────────────────────────────────────

const COLORS = {
  primary: rgb(0.11, 0.27, 0.53),
  primaryLight: rgb(0.85, 0.90, 0.97),
  accent: rgb(0.20, 0.55, 0.86),
  dark: rgb(0.13, 0.13, 0.13),
  text: rgb(0.25, 0.25, 0.25),
  muted: rgb(0.45, 0.45, 0.45),
  light: rgb(0.65, 0.65, 0.65),
  border: rgb(0.82, 0.82, 0.82),
  white: rgb(1, 1, 1),
  rowAlt: rgb(0.96, 0.97, 0.99),
  success: rgb(0.13, 0.59, 0.33),
  warning: rgb(0.85, 0.55, 0.08),
  danger: rgb(0.80, 0.15, 0.15),
};

// ─── Helpers ─────────────────────────────────────────────────────────

function winAnsiSafe(text: string): string {
  return text
    .replace(/\u202F/g, ' ')
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"');
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '-';
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '-';
    return winAnsiSafe(date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));
  } catch { return '-'; }
}

function formatDateShort(d: Date | string | null | undefined): string {
  if (!d) return '-';
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '-';
    return winAnsiSafe(date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  } catch { return '-'; }
}

function formatMoney(n: number | null | undefined): string {
  const val = Number(n);
  if (isNaN(val)) return '0,00 EUR';
  return winAnsiSafe(val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ' EUR';
}

function safe(v: unknown): string {
  if (v == null) return '';
  return winAnsiSafe(String(v));
}

function textWidth(text: string, font: PDFFont, size: number): number {
  return font.widthOfTextAtSize(text, size);
}

function drawTextRight(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = COLORS.text) {
  const w = textWidth(text, font, size);
  page.drawText(text, { x: x - w, y, size, font, color });
}

function getStatutLabel(statut?: string): string {
  switch (statut) {
    case 'payee': return 'PAYEE';
    case 'envoyee': return 'ENVOYEE';
    case 'en_retard': return 'EN RETARD';
    case 'brouillon': return 'BROUILLON';
    case 'annulee': return 'ANNULEE';
    default: return (statut || '').toUpperCase();
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
  const ml = 50;
  const mr = 50;
  const contentWidth = width - ml - mr;
  let y = height;

  // ═══════════════════════════════════════════════════════════════════
  // HEADER - Bande bleue avec infos entreprise
  // ═══════════════════════════════════════════════════════════════════
  const headerH = 110;
  page.drawRectangle({
    x: 0, y: height - headerH,
    width, height: headerH,
    color: COLORS.primary,
  });

  // Nom entreprise (gauche)
  const tenantName = invoice.tenant?.nomEntreprise || 'TalosPrimes';
  page.drawText(tenantName, {
    x: ml, y: height - 30,
    size: 20, font: fontBold, color: COLORS.white,
  });

  // Adresse sur 2 lignes sous le nom
  let headerLeftY = height - 46;
  if (invoice.tenant?.adressePostale) {
    page.drawText(safe(invoice.tenant.adressePostale), {
      x: ml, y: headerLeftY,
      size: 8.5, font, color: rgb(0.78, 0.85, 0.95),
    });
    headerLeftY -= 12;
  }
  const cpVille = [invoice.tenant?.codePostal, invoice.tenant?.ville].filter(Boolean).join(' ');
  if (cpVille) {
    page.drawText(safe(cpVille), {
      x: ml, y: headerLeftY,
      size: 8.5, font, color: rgb(0.78, 0.85, 0.95),
    });
    headerLeftY -= 12;
  }

  // SIRET sous l'adresse (gauche)
  if (invoice.tenant?.siret) {
    page.drawText(`SIRET : ${safe(invoice.tenant.siret)}`, {
      x: ml, y: headerLeftY,
      size: 8, font, color: rgb(0.78, 0.85, 0.95),
    });
    headerLeftY -= 12;
  }

  // TVA intra sous le SIRET (gauche)
  if (invoice.tenant?.tvaIntracom) {
    page.drawText(`TVA Intra : ${safe(invoice.tenant.tvaIntracom)}`, {
      x: ml, y: headerLeftY,
      size: 8, font, color: rgb(0.78, 0.85, 0.95),
    });
    headerLeftY -= 12;
  }

  // "FACTURE" + statut sur la meme ligne a droite
  const statutLabel = getStatutLabel(invoice.statut);
  const factureStatut = statutLabel ? `FACTURE - ${statutLabel}` : 'FACTURE';
  drawTextRight(page, factureStatut, width - mr, height - 95, fontBold, 14, COLORS.white);

  y = height - headerH - 25;

  // ═══════════════════════════════════════════════════════════════════
  // INFOS FACTURE - Numero + dates (ligne simple)
  // ═══════════════════════════════════════════════════════════════════

  const infoBoxH = 35;
  page.drawRectangle({
    x: ml, y: y - infoBoxH,
    width: contentWidth, height: infoBoxH,
    color: COLORS.primaryLight,
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });

  const infoY = y - 14;
  const col1 = ml + 16;
  const col2 = ml + contentWidth * 0.40;

  // Numero facture
  page.drawText('N\u00B0 Facture', { x: col1, y: infoY, size: 7, font, color: COLORS.muted });
  page.drawText(safe(invoice.numeroFacture), { x: col1, y: infoY - 14, size: 11, font: fontBold, color: COLORS.primary });

  // Date de facturation uniquement (echeance en bas dans le tableau paiement)
  page.drawText(`Date : ${formatDate(invoice.dateFacture)}`, { x: col2, y: infoY - 7, size: 9, font, color: COLORS.dark });

  y -= infoBoxH + 25;

  // ═══════════════════════════════════════════════════════════════════
  // CLIENT - Facturer a
  // ═══════════════════════════════════════════════════════════════════

  page.drawText('Facturer a', { x: ml, y, size: 8, font, color: COLORS.muted });
  y -= 16;

  const client = invoice.clientFinal;
  const clientName =
    (client?.raisonSociale ?? ([client?.prenom, client?.nom].filter(Boolean).join(' ') || '-')).trim() || 'Client';

  page.drawText(safe(clientName), { x: ml, y, size: 12, font: fontBold, color: COLORS.dark });
  y -= 15;

  if (client?.adresse) {
    // Adresse peut contenir des retours a la ligne, on split
    const adresseLines = safe(client.adresse).split('\n').filter(Boolean);
    for (const line of adresseLines) {
      page.drawText(line.trim(), { x: ml, y, size: 9, font, color: COLORS.text });
      y -= 13;
    }
  }
  if (client?.email) {
    page.drawText(safe(client.email), { x: ml, y, size: 9, font: fontOblique, color: COLORS.accent });
    y -= 13;
  }
  if (client?.telephone) {
    page.drawText(safe(client.telephone), { x: ml, y, size: 9, font, color: COLORS.text });
    y -= 13;
  }

  y -= 20;

  // ═══════════════════════════════════════════════════════════════════
  // TABLEAU - Detail des prestations
  // ═══════════════════════════════════════════════════════════════════

  const tableLeft = ml;
  const tableRight = width - mr;
  const tableW = tableRight - tableLeft;

  const colQte = tableRight - 200;
  const colPuHt = tableRight - 130;
  const colTotalHt = tableRight - 10;

  // En-tete tableau
  const thH = 28;
  page.drawRectangle({
    x: tableLeft, y: y - thH,
    width: tableW, height: thH,
    color: COLORS.primary,
  });

  const thY = y - 18;
  page.drawText('Designation', { x: tableLeft + 12, y: thY, size: 9, font: fontBold, color: COLORS.white });
  page.drawText('Qte', { x: colQte, y: thY, size: 9, font: fontBold, color: COLORS.white });
  drawTextRight(page, 'P.U. HT', colPuHt + 55, thY, fontBold, 9, COLORS.white);
  drawTextRight(page, 'Total HT', colTotalHt, thY, fontBold, 9, COLORS.white);

  y -= thH;

  // Ligne de prestation - description reelle de la facture
  const designation = safe(invoice.description) || 'Prestation de services';
  const rowH = 30;
  page.drawRectangle({
    x: tableLeft, y: y - rowH,
    width: tableW, height: rowH,
    color: COLORS.rowAlt,
    borderColor: COLORS.border,
    borderWidth: 0.3,
  });

  const rowY = y - 19;
  page.drawText(designation, { x: tableLeft + 12, y: rowY, size: 9.5, font, color: COLORS.dark });
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
  // TOTAUX - Sous-total, TVA, Total TTC
  // ═══════════════════════════════════════════════════════════════════

  const totalsX = tableRight - 200;
  const totalsValX = tableRight - 10;
  const tva = invoice.montantTtc - invoice.montantHt;
  const tvaTaux = invoice.tvaTaux ?? 20;

  page.drawText('Sous-total HT', { x: totalsX, y, size: 9, font, color: COLORS.text });
  drawTextRight(page, formatMoney(invoice.montantHt), totalsValX, y, font, 9, COLORS.text);
  y -= 16;

  page.drawText(`TVA (${tvaTaux} %)`, { x: totalsX, y, size: 9, font, color: COLORS.text });
  drawTextRight(page, formatMoney(tva), totalsValX, y, font, 9, COLORS.text);
  y -= 6;

  page.drawLine({
    start: { x: totalsX, y },
    end: { x: totalsValX, y },
    thickness: 0.8,
    color: COLORS.primary,
  });
  y -= 18;

  // Total TTC (encadre bleu)
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
  // TABLEAU INFORMATIONS DE PAIEMENT
  // ═══════════════════════════════════════════════════════════════════

  page.drawText('Informations de paiement', { x: ml, y, size: 10, font: fontBold, color: COLORS.primary });
  y -= 18;

  // Tableau 2 colonnes : label | valeur
  const payInfos: [string, string][] = [
    ['Date de facturation', formatDateShort(invoice.dateFacture)],
    ['Date d\'echeance', formatDateShort(invoice.dateEcheance)],
    ['Mode de paiement', safe(invoice.modePaiement) || 'Virement bancaire'],
  ];
  if (invoice.tenant?.rib) {
    payInfos.push(['RIB / IBAN', safe(invoice.tenant.rib)]);
  }

  const payColLabelW = 160;
  const payRowH = 20;

  for (let i = 0; i < payInfos.length; i++) {
    const [label, value] = payInfos[i];
    const rowBg = i % 2 === 0 ? COLORS.rowAlt : COLORS.white;

    page.drawRectangle({
      x: ml, y: y - payRowH,
      width: contentWidth, height: payRowH,
      color: rowBg,
      borderColor: COLORS.border,
      borderWidth: 0.3,
    });

    page.drawText(label, { x: ml + 10, y: y - 14, size: 8.5, font: fontBold, color: COLORS.text });
    page.drawText(value, { x: ml + payColLabelW, y: y - 14, size: 8.5, font, color: COLORS.dark });

    y -= payRowH;
  }

  y -= 14;

  // Mentions legales
  page.drawText('En cas de retard, une penalite de 3 fois le taux d\'interet legal sera appliquee (art. L441-10 Code de commerce).', {
    x: ml, y, size: 7, font: fontOblique, color: COLORS.light, maxWidth: contentWidth,
  });
  y -= 10;
  page.drawText('Indemnite forfaitaire pour frais de recouvrement : 40,00 EUR.', {
    x: ml, y, size: 7, font: fontOblique, color: COLORS.light,
  });

  // ═══════════════════════════════════════════════════════════════════
  // FOOTER - Bande en bas
  // ═══════════════════════════════════════════════════════════════════

  const footerH = 35;
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

  const footerText = footerParts.join('  |  ');
  const footerW = textWidth(footerText, font, 7);
  page.drawText(footerText, {
    x: (width - footerW) / 2,
    y: 14,
    size: 7, font, color: COLORS.light,
  });

  return doc.save();
}
