import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';

// ─── Types ───────────────────────────────────────────────────────────

export type DocumentLineForPdf = {
  codeArticle?: string | null;
  designation: string;
  quantite: number;
  prixUnitaireHt: number;
  totalHt: number;
};

export type DocumentForPdf = {
  numero: string;
  dateDocument: Date;
  dateSecondaire?: Date | null; // dateEcheance, dateValidite, etc.
  montantHt: number;
  montantTtc: number;
  tvaTaux: number | null;
  description?: string;
  codeArticle?: string;
  modePaiement?: string;
  statut?: string;
  motif?: string; // pour les avoirs
  lines?: DocumentLineForPdf[];
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
    logoBase64?: string | null;
    adressePostale?: string | null;
    codePostal?: string | null;
    ville?: string | null;
    telephone?: string | null;
    emailContact: string;
  } | null;
};

export type DocumentType = 'facture' | 'devis' | 'avoir' | 'bon_commande' | 'proforma';

// Configuration par type de document
const DOC_CONFIG: Record<DocumentType, {
  title: string;
  numeroLabel: string;
  clientLabel: string;
  dateLabel: string;
  dateSecondaireLabel: string;
  mentionsLegales: string[];
  showPaymentInfo: boolean;
}> = {
  facture: {
    title: 'FACTURE',
    numeroLabel: 'N\u00B0 Facture',
    clientLabel: 'Facturer a',
    dateLabel: 'Date de facturation',
    dateSecondaireLabel: "Date d'echeance",
    mentionsLegales: [
      "En cas de retard, une penalite de 3 fois le taux d'interet legal sera appliquee (art. L441-10 Code de commerce).",
      'Indemnite forfaitaire pour frais de recouvrement : 40,00 EUR.',
    ],
    showPaymentInfo: true,
  },
  devis: {
    title: 'DEVIS',
    numeroLabel: 'N\u00B0 Devis',
    clientLabel: 'Client',
    dateLabel: 'Date du devis',
    dateSecondaireLabel: 'Date de validite',
    mentionsLegales: [
      'Ce devis est valable pour la duree indiquee. Passe ce delai, il devra etre renouvele.',
      'Toute commande implique l\'acceptation des conditions generales de vente.',
    ],
    showPaymentInfo: true,
  },
  avoir: {
    title: 'AVOIR',
    numeroLabel: 'N\u00B0 Avoir',
    clientLabel: 'Client',
    dateLabel: "Date de l'avoir",
    dateSecondaireLabel: '',
    mentionsLegales: [
      'Cet avoir est deductible de vos prochaines factures ou remboursable sur demande.',
    ],
    showPaymentInfo: false,
  },
  bon_commande: {
    title: 'BON DE COMMANDE',
    numeroLabel: 'N\u00B0 Bon de Commande',
    clientLabel: 'Client',
    dateLabel: 'Date du bon',
    dateSecondaireLabel: 'Date de validite',
    mentionsLegales: [
      'Ce bon de commande confirme votre engagement. Les conditions generales de vente s\'appliquent.',
    ],
    showPaymentInfo: true,
  },
  proforma: {
    title: 'FACTURE PROFORMA',
    numeroLabel: 'N\u00B0 Proforma',
    clientLabel: 'Client',
    dateLabel: 'Date du proforma',
    dateSecondaireLabel: 'Date de validite',
    mentionsLegales: [
      'Ce document est une facture proforma et ne constitue pas une facture definitive.',
      'Il est emis a titre indicatif et n\'a pas de valeur comptable.',
    ],
    showPaymentInfo: true,
  },
};

// ─── Legacy type alias for backward compatibility ───────────────────
export type InvoiceLineForPdf = DocumentLineForPdf;
export type InvoiceForPdf = {
  numeroFacture: string;
  dateFacture: Date;
  dateEcheance: Date;
  montantHt: number;
  montantTtc: number;
  tvaTaux: number | null;
  description?: string;
  codeArticle?: string;
  modePaiement?: string;
  statut?: string;
  lines?: InvoiceLineForPdf[];
  clientFinal?: DocumentForPdf['clientFinal'];
  tenant?: DocumentForPdf['tenant'];
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
    case 'acceptee': return 'ACCEPTEE';
    case 'refusee': return 'REFUSEE';
    case 'expiree': return 'EXPIREE';
    case 'facturee': return 'FACTUREE';
    case 'valide': return 'VALIDE';
    case 'validee': return 'VALIDEE';
    case 'facture': return 'FACTURE';
    case 'annule': return 'ANNULE';
    default: return (statut || '').toUpperCase();
  }
}

// ─── PDF principal (générique) ──────────────────────────────────────

export async function generateDocumentPdf(document: DocumentForPdf, documentType: DocumentType): Promise<Uint8Array> {
  const config = DOC_CONFIG[documentType];
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

  // Logo (si disponible)
  let logoOffsetX = 0;
  if (document.tenant?.logoBase64) {
    try {
      const dataUri = document.tenant.logoBase64;
      const isJpeg = dataUri.startsWith('data:image/jpeg') || dataUri.startsWith('data:image/jpg');
      const isPng = dataUri.startsWith('data:image/png');
      const base64Data = dataUri.split(',')[1];
      if (base64Data && (isJpeg || isPng)) {
        const imgBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const image = isPng
          ? await doc.embedPng(imgBytes)
          : await doc.embedJpg(imgBytes);
        const maxW = 80, maxH = 60;
        const scale = Math.min(maxW / image.width, maxH / image.height, 1);
        const drawW = image.width * scale;
        const drawH = image.height * scale;
        page.drawImage(image, {
          x: ml,
          y: height - 15 - drawH,
          width: drawW,
          height: drawH,
        });
        logoOffsetX = drawW + 12;
      }
    } catch (logoErr) {
      // Logo invalide, on continue sans
    }
  }

  // Nom entreprise (gauche, décalé si logo)
  const tenantName = document.tenant?.nomEntreprise || 'TalosPrimes';
  page.drawText(tenantName, {
    x: ml + logoOffsetX, y: height - 30,
    size: 20, font: fontBold, color: COLORS.white,
  });

  // Adresse sur 2 lignes sous le nom
  let headerLeftY = height - 46;
  const textLeftX = ml + logoOffsetX;
  if (document.tenant?.adressePostale) {
    page.drawText(safe(document.tenant.adressePostale), {
      x: textLeftX, y: headerLeftY,
      size: 8.5, font, color: rgb(0.78, 0.85, 0.95),
    });
    headerLeftY -= 12;
  }
  const cpVille = [document.tenant?.codePostal, document.tenant?.ville].filter(Boolean).join(' ');
  if (cpVille) {
    page.drawText(safe(cpVille), {
      x: textLeftX, y: headerLeftY,
      size: 8.5, font, color: rgb(0.78, 0.85, 0.95),
    });
    headerLeftY -= 12;
  }

  // SIRET sous l'adresse (gauche)
  if (document.tenant?.siret) {
    page.drawText(`SIRET : ${safe(document.tenant.siret)}`, {
      x: textLeftX, y: headerLeftY,
      size: 8, font, color: rgb(0.78, 0.85, 0.95),
    });
    headerLeftY -= 12;
  }

  // TVA intra sous le SIRET (gauche)
  if (document.tenant?.tvaIntracom) {
    page.drawText(`TVA Intra : ${safe(document.tenant.tvaIntracom)}`, {
      x: textLeftX, y: headerLeftY,
      size: 8, font, color: rgb(0.78, 0.85, 0.95),
    });
    headerLeftY -= 12;
  }

  // Titre document + statut sur la même ligne à droite
  const statutLabel = getStatutLabel(document.statut);
  const docTitle = statutLabel ? `${config.title} - ${statutLabel}` : config.title;
  drawTextRight(page, docTitle, width - mr, height - 95, fontBold, 14, COLORS.white);

  y = height - headerH - 25;

  // ═══════════════════════════════════════════════════════════════════
  // INFOS DOCUMENT - Numéro + dates (ligne simple)
  // ═══════════════════════════════════════════════════════════════════

  const infoBoxH = 30;
  page.drawRectangle({
    x: ml, y: y - infoBoxH,
    width: contentWidth, height: infoBoxH,
    color: COLORS.primaryLight,
    borderColor: COLORS.border,
    borderWidth: 0.5,
  });

  const infoY = y - 12;
  const col1 = ml + 16;

  // Numéro document
  page.drawText(config.numeroLabel, { x: col1, y: infoY, size: 7, font, color: COLORS.muted });
  page.drawText(safe(document.numero), { x: col1, y: infoY - 13, size: 11, font: fontBold, color: COLORS.primary });

  y -= infoBoxH + 25;

  // ═══════════════════════════════════════════════════════════════════
  // CLIENT
  // ═══════════════════════════════════════════════════════════════════

  page.drawText(config.clientLabel, { x: ml, y, size: 8, font, color: COLORS.muted });
  y -= 16;

  const client = document.clientFinal;
  const clientName =
    (client?.raisonSociale || [client?.prenom, client?.nom].filter(Boolean).join(' ') || '-').trim() || 'Client';

  page.drawText(safe(clientName), { x: ml, y, size: 12, font: fontBold, color: COLORS.dark });
  y -= 15;

  if (client?.adresse) {
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

  // Motif pour les avoirs
  if (documentType === 'avoir' && document.motif) {
    y -= 5;
    page.drawText(`Motif : ${safe(document.motif)}`, { x: ml, y, size: 9, font: fontOblique, color: COLORS.text });
    y -= 13;
  }

  y -= 20;

  // ═══════════════════════════════════════════════════════════════════
  // TABLEAU - Détail des prestations
  // ═══════════════════════════════════════════════════════════════════

  const tableLeft = ml;
  const tableRight = width - mr;
  const tableW = tableRight - tableLeft;

  // Colonnes : Code | Designation | Qte | P.U. HT | Total HT
  const colCode = tableLeft + 12;
  const colDesig = tableLeft + 80;
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
  page.drawText('Code', { x: colCode, y: thY, size: 9, font: fontBold, color: COLORS.white });
  page.drawText('Designation', { x: colDesig, y: thY, size: 9, font: fontBold, color: COLORS.white });
  page.drawText('Qte', { x: colQte, y: thY, size: 9, font: fontBold, color: COLORS.white });
  drawTextRight(page, 'P.U. HT', colPuHt + 55, thY, fontBold, 9, COLORS.white);
  drawTextRight(page, 'Total HT', colTotalHt, thY, fontBold, 9, COLORS.white);

  y -= thH;

  // Lignes de prestation
  const lines: DocumentLineForPdf[] = (document.lines && document.lines.length > 0)
    ? document.lines
    : [{
        codeArticle: document.codeArticle || null,
        designation: document.description || '-',
        quantite: 1,
        prixUnitaireHt: document.montantHt,
        totalHt: document.montantHt,
      }];

  const rowH = 26;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rowBg = i % 2 === 0 ? COLORS.rowAlt : COLORS.white;

    page.drawRectangle({
      x: tableLeft, y: y - rowH,
      width: tableW, height: rowH,
      color: rowBg,
      borderColor: COLORS.border,
      borderWidth: 0.3,
    });

    const rowY = y - 17;
    page.drawText(safe(line.codeArticle) || '-', { x: colCode, y: rowY, size: 9, font, color: COLORS.muted });
    page.drawText(safe(line.designation) || '-', { x: colDesig, y: rowY, size: 9.5, font, color: COLORS.dark });
    page.drawText(String(line.quantite ?? 1), { x: colQte + 8, y: rowY, size: 9.5, font, color: COLORS.text });
    drawTextRight(page, formatMoney(line.prixUnitaireHt), colPuHt + 55, rowY, font, 9.5, COLORS.text);
    drawTextRight(page, formatMoney(line.totalHt), colTotalHt, rowY, font, 9.5, COLORS.dark);

    y -= rowH;
  }

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
  const tva = document.montantTtc - document.montantHt;
  const tvaTaux = document.tvaTaux ?? 20;

  page.drawText('Sous-total HT', { x: totalsX, y, size: 9, font, color: COLORS.text });
  drawTextRight(page, formatMoney(document.montantHt), totalsValX, y, font, 9, COLORS.text);
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

  // Total TTC (encadré bleu)
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
  drawTextRight(page, formatMoney(document.montantTtc), totalsValX - 4, y - 10, fontBold, 13, COLORS.white);

  y -= totalBoxH + 30;

  // ═══════════════════════════════════════════════════════════════════
  // TABLEAU INFORMATIONS DE PAIEMENT (si applicable)
  // ═══════════════════════════════════════════════════════════════════

  if (config.showPaymentInfo) {
    page.drawText('Informations de paiement', { x: ml, y, size: 10, font: fontBold, color: COLORS.primary });
    y -= 18;

    const payInfos: [string, string][] = [
      [config.dateLabel, formatDateShort(document.dateDocument)],
    ];

    if (config.dateSecondaireLabel && document.dateSecondaire) {
      payInfos.push([config.dateSecondaireLabel, formatDateShort(document.dateSecondaire)]);
    }

    payInfos.push(['Mode de paiement', safe(document.modePaiement) || 'Virement bancaire']);
    payInfos.push(['RIB / IBAN', safe(document.tenant?.rib) || '-']);

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
  }

  // Mentions légales
  for (const mention of config.mentionsLegales) {
    page.drawText(mention, {
      x: ml, y, size: 7, font: fontOblique, color: COLORS.light, maxWidth: contentWidth,
    });
    y -= 10;
  }

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
    document.tenant?.siret ? `SIRET ${document.tenant.siret}` : null,
    document.tenant?.emailContact,
    document.tenant?.telephone,
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

// ─── Legacy wrapper for backward compatibility ──────────────────────

export async function generateInvoicePdf(invoice: InvoiceForPdf): Promise<Uint8Array> {
  const docForPdf: DocumentForPdf = {
    numero: invoice.numeroFacture,
    dateDocument: invoice.dateFacture,
    dateSecondaire: invoice.dateEcheance,
    montantHt: invoice.montantHt,
    montantTtc: invoice.montantTtc,
    tvaTaux: invoice.tvaTaux,
    description: invoice.description,
    codeArticle: invoice.codeArticle,
    modePaiement: invoice.modePaiement,
    statut: invoice.statut,
    lines: invoice.lines,
    clientFinal: invoice.clientFinal,
    tenant: invoice.tenant,
  };
  return generateDocumentPdf(docForPdf, 'facture');
}
