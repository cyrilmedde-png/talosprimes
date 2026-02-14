import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type InvoiceForPdf = {
  numeroFacture: string;
  dateFacture: Date;
  dateEcheance: Date;
  montantHt: number;
  montantTtc: number;
  tvaTaux: number | null;
  clientFinal?: {
    raisonSociale?: string | null;
    nom?: string | null;
    prenom?: string | null;
    email?: string | null;
    adresse?: string | null;
  } | null;
};

/**
 * Génère un PDF de facture propre (une page, en-tête, client, tableau, totaux).
 */
export async function generateInvoicePdf(invoice: InvoiceForPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const draw = (text: string, x: number, size: number, bold = false) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= size + 2;
  };

  const label = (text: string, value: string, xLabel: number, xValue: number) => {
    page.drawText(text, { x: xLabel, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(value, { x: xValue, y, size: 10, font, color: rgb(0, 0, 0) });
    y -= 14;
  };

  // --- Titre
  draw('FACTURE', margin, 22, true);
  y -= 8;

  // --- Numéro et dates
  draw(`N° ${invoice.numeroFacture}`, margin, 12);
  const df = formatDate(invoice.dateFacture);
  const de = formatDate(invoice.dateEcheance);
  label('Date facture :', df, margin, 140);
  label('Date d\'échéance :', de, margin, 140);
  y -= 16;

  // --- Client
  const client = invoice.clientFinal;
  const clientName =
    (client?.raisonSociale ?? ([client?.prenom, client?.nom].filter(Boolean).join(' ') || '—')).trim() || 'Client';
  draw('Client', margin, 11, true);
  y -= 6;
  draw(clientName, margin, 10);
  if (client?.email) {
    y -= 12;
    draw(client.email, margin, 10);
  }
  if (client?.adresse) {
    y -= 12;
    page.drawText(client.adresse, {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
      maxWidth: width - 2 * margin,
    });
    y -= 20;
  }
  y -= 20;

  // --- Tableau
  const tva = invoice.montantTtc - invoice.montantHt;
  const tvaTaux = invoice.tvaTaux ?? 20;
  const col1 = margin;
  const col2 = margin + 280;
  const col3 = margin + 380;
  const col4 = margin + 460;

  const line = (a: string, b: string, c: string, d: string, bold = false) => {
    page.drawText(a, { x: col1, y, size: 9, font: bold ? fontBold : font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(b, { x: col2, y, size: 9, font: bold ? fontBold : font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(c, { x: col3, y, size: 9, font: bold ? fontBold : font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(d, { x: col4, y, size: 9, font: bold ? fontBold : font, color: rgb(0.1, 0.1, 0.1) });
    y -= 14;
  };

  line('Désignation', 'Quantité', 'Prix unitaire HT', 'Total TTC');
  y -= 4;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 14;
  line('Prestation / Facture', '1', formatMoney(invoice.montantHt), formatMoney(invoice.montantTtc));
  y -= 20;

  line('Total HT', '', '', formatMoney(invoice.montantHt));
  line(`TVA (${tvaTaux} %)`, '', '', formatMoney(tva));
  line('Total TTC', '', '', formatMoney(invoice.montantTtc), true);
  y -= 30;

  // --- Pied de page
  if (y < 80) y = 80;
  page.drawText('Merci pour votre confiance.', {
    x: margin,
    y,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return doc.save();
}

function formatDate(d: Date): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}
