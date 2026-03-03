/**
 * Service de rapprochement bancaire automatique.
 * Parse un relevé CSV (BNP, Crédit Mutuel, Crédit Agricole, Qonto, générique)
 * et matche les transactions crédit avec les factures TTC en attente de paiement.
 *
 * Algorithme de matching :
 * 1. Montant exact (TTC) — tolérance ±0.01€ (arrondis bancaires)
 * 2. Date ± 5 jours (délai entre émission facture et encaissement)
 * 3. Référence facture dans le libellé (si présente)
 */

import { prisma } from '../config/database.js';

// ─── Types ────────────────────────────────────────────────────

export interface CsvTransaction {
  date: string;          // ISO ou DD/MM/YYYY
  label: string;         // libellé de l'opération
  amount: number;        // montant (positif = crédit, négatif = débit)
  reference?: string;    // référence bancaire si dispo
  raw: string;           // ligne brute CSV
}

export interface MatchResult {
  transaction: CsvTransaction;
  invoice: {
    id: string;
    numeroFacture: string;
    montantTtc: number;
    dateFacture: string;
    clientNom: string;
    statut: string;
  } | null;
  confidence: 'high' | 'medium' | 'none';
  reason: string;
}

export interface RapprochementResult {
  totalTransactions: number;
  credits: number;
  debits: number;
  matched: number;
  unmatched: number;
  results: MatchResult[];
  summary: {
    totalCredits: number;
    totalDebits: number;
    totalMatched: number;
  };
}

// ─── CSV Parsing ──────────────────────────────────────────────

/**
 * Parse un CSV bancaire. Supporte les formats courants français :
 * - Séparateur : ; ou ,
 * - Dates : DD/MM/YYYY ou YYYY-MM-DD
 * - Montants : avec virgule décimale (1 234,56) ou point (1234.56)
 * - Encoding : UTF-8 (le frontend doit gérer la conversion si nécessaire)
 */
export function parseBankCsv(csvContent: string): CsvTransaction[] {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('Le fichier CSV est vide ou ne contient que l\'en-tête');

  // Détecter le séparateur (priorité au ; car c'est le standard français)
  const headerLine = lines[0];
  const separator = headerLine.includes(';') ? ';' : ',';

  // Parser l'en-tête pour identifier les colonnes
  const headers = headerLine.split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));

  // Mapping intelligent des colonnes
  const dateCol = findColumn(headers, ['date', 'date opération', 'date operation', 'date valeur', 'date comptable', 'settled_at', 'emitted_at']);
  const labelCol = findColumn(headers, ['libellé', 'libelle', 'label', 'description', 'désignation', 'designation', 'intitulé', 'intitule', 'référence', 'reference']);
  const amountCol = findColumn(headers, ['montant', 'amount', 'somme', 'valeur']);
  const creditCol = findColumn(headers, ['crédit', 'credit', 'encaissement', 'entrée', 'entree']);
  const debitCol = findColumn(headers, ['débit', 'debit', 'décaissement', 'sortie']);
  const refCol = findColumn(headers, ['référence', 'reference', 'ref', 'numéro', 'numero', 'transaction_id']);

  if (dateCol === -1) throw new Error('Colonne date non trouvée dans le CSV. Colonnes détectées : ' + headers.join(', '));
  if (labelCol === -1 && amountCol === -1 && creditCol === -1) {
    throw new Error('Colonnes libellé/montant non trouvées. Colonnes détectées : ' + headers.join(', '));
  }

  const transactions: CsvTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line, separator);
    if (cols.length < 2) continue;

    try {
      const date = parseDate(cols[dateCol]?.trim() || '');
      const label = (cols[labelCol] || '').replace(/"/g, '').trim();

      let amount: number;
      if (amountCol !== -1) {
        // Colonne unique montant (positif/négatif)
        amount = parseAmount(cols[amountCol] || '0');
      } else if (creditCol !== -1 || debitCol !== -1) {
        // Colonnes séparées crédit/débit
        const credit = creditCol !== -1 ? parseAmount(cols[creditCol] || '0') : 0;
        const debit = debitCol !== -1 ? parseAmount(cols[debitCol] || '0') : 0;
        amount = credit > 0 ? credit : -debit;
      } else {
        continue; // pas de montant trouvable
      }

      if (amount === 0) continue; // ignorer les lignes sans montant

      transactions.push({
        date,
        label,
        amount,
        reference: refCol !== -1 ? (cols[refCol] || '').replace(/"/g, '').trim() : undefined,
        raw: line,
      });
    } catch {
      // Ligne non parsable — on skip silencieusement
      continue;
    }
  }

  if (transactions.length === 0) {
    throw new Error('Aucune transaction valide trouvée dans le CSV');
  }

  return transactions;
}

/** Trouve l'index d'une colonne par nom (insensible à la casse et aux accents) */
function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex(h =>
      normalize(h) === normalize(candidate) || normalize(h).includes(normalize(candidate))
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Parse une ligne CSV en tenant compte des guillemets */
function parseCsvLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === sep && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/** Parse une date DD/MM/YYYY ou YYYY-MM-DD → ISO string */
function parseDate(dateStr: string): string {
  const cleaned = dateStr.replace(/"/g, '').trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.substring(0, 10);
  }

  // DD/MM/YYYY
  const match = cleaned.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  throw new Error(`Date non reconnue : ${dateStr}`);
}

/** Parse un montant français (1 234,56) ou anglais (1234.56) */
function parseAmount(amountStr: string): number {
  const cleaned = amountStr
    .replace(/"/g, '')
    .replace(/\s/g, '')      // espaces (séparateur milliers)
    .replace(/€/g, '')       // symbole euro
    .trim();

  if (!cleaned || cleaned === '-') return 0;

  // Si virgule et pas de point → format français
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    return parseFloat(cleaned.replace(',', '.'));
  }

  // Si point ET virgule → le dernier est le séparateur décimal
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // 1.234,56 → format européen
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    } else {
      // 1,234.56 → format US
      return parseFloat(cleaned.replace(/,/g, ''));
    }
  }

  return parseFloat(cleaned) || 0;
}

// ─── Rapprochement ────────────────────────────────────────────

const TOLERANCE_AMOUNT = 0.02;   // ±2 centimes
const TOLERANCE_DAYS = 5;        // ±5 jours

/**
 * Effectue le rapprochement automatique entre transactions CSV et factures.
 * Ne matche que les crédits (entrées d'argent) avec les factures envoyées/en retard.
 */
export async function rapprochement(
  tenantId: string,
  csvContent: string,
  options?: { autoMarkPaid?: boolean }
): Promise<RapprochementResult> {
  const transactions = parseBankCsv(csvContent);

  // Séparer crédits et débits
  const credits = transactions.filter(t => t.amount > 0);
  const debits = transactions.filter(t => t.amount < 0);

  // Récupérer les factures en attente de paiement
  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      statut: { in: ['envoyee', 'en_retard'] },
      deletedAt: null,
      type: { in: ['facture_entreprise', 'facture_client_final'] }, // pas les achats
    },
    include: {
      clientFinal: {
        select: { raisonSociale: true, nom: true, prenom: true },
      },
    },
    orderBy: { dateFacture: 'desc' },
  });

  const results: MatchResult[] = [];
  const matchedInvoiceIds = new Set<string>();

  // Pour chaque crédit, chercher une facture qui matche
  for (const credit of credits) {
    let bestMatch: MatchResult | null = null;

    for (const invoice of pendingInvoices) {
      if (matchedInvoiceIds.has(invoice.id)) continue; // déjà matchée

      const invoiceTtc = Number(invoice.montantTtc);
      const amountDiff = Math.abs(credit.amount - invoiceTtc);

      // Vérifier le montant (tolérance ±2 centimes)
      if (amountDiff > TOLERANCE_AMOUNT) continue;

      // Vérifier la date (±5 jours)
      const creditDate = new Date(credit.date);
      const invoiceDate = new Date(invoice.dateFacture);
      const daysDiff = Math.abs((creditDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));

      const clientNom = invoice.clientFinal?.raisonSociale
        || `${invoice.clientFinal?.prenom || ''} ${invoice.clientFinal?.nom || ''}`.trim()
        || 'Client inconnu';

      const invoiceData = {
        id: invoice.id,
        numeroFacture: invoice.numeroFacture,
        montantTtc: invoiceTtc,
        dateFacture: invoice.dateFacture.toISOString().split('T')[0],
        clientNom,
        statut: invoice.statut,
      };

      // Vérifier si le numéro de facture apparaît dans le libellé
      const refInLabel = credit.label.includes(invoice.numeroFacture)
        || (credit.reference && credit.reference.includes(invoice.numeroFacture));

      if (refInLabel) {
        // Match par référence = haute confiance
        bestMatch = {
          transaction: credit,
          invoice: invoiceData,
          confidence: 'high',
          reason: `Référence facture ${invoice.numeroFacture} trouvée dans le libellé`,
        };
        break; // match parfait, on arrête
      }

      if (daysDiff <= TOLERANCE_DAYS) {
        const confidence: 'high' | 'medium' = amountDiff < 0.01 && daysDiff <= 2 ? 'high' : 'medium';
        const candidate: MatchResult = {
          transaction: credit,
          invoice: invoiceData,
          confidence,
          reason: `Montant ${invoiceTtc}€ (diff: ${amountDiff.toFixed(2)}€) — Date écart: ${Math.round(daysDiff)}j`,
        };

        if (!bestMatch || confidence === 'high' || (bestMatch.confidence !== 'high' && daysDiff < Number(bestMatch.reason.match(/(\d+)j/)?.[1] || 999))) {
          bestMatch = candidate;
        }
      }
    }

    if (bestMatch) {
      results.push(bestMatch);
      matchedInvoiceIds.add(bestMatch.invoice!.id);
    } else {
      results.push({
        transaction: credit,
        invoice: null,
        confidence: 'none',
        reason: `Aucune facture correspondante (${credit.amount.toFixed(2)}€)`,
      });
    }
  }

  // Ajouter les débits (pas de matching, juste pour info)
  for (const debit of debits) {
    results.push({
      transaction: debit,
      invoice: null,
      confidence: 'none',
      reason: 'Débit — pas de rapprochement',
    });
  }

  // Auto-marquer comme payées si demandé (seulement les high confidence)
  if (options?.autoMarkPaid) {
    const highConfidenceMatches = results.filter(r => r.confidence === 'high' && r.invoice);
    for (const match of highConfidenceMatches) {
      await prisma.invoice.update({
        where: { id: match.invoice!.id },
        data: {
          statut: 'payee',
          idExternePaiement: `CSV-${match.transaction.date}-${match.transaction.amount}`,
          modePaiement: 'virement',
        },
      });
    }
  }

  const totalMatched = results.filter(r => r.invoice !== null).length;

  return {
    totalTransactions: transactions.length,
    credits: credits.length,
    debits: debits.length,
    matched: totalMatched,
    unmatched: credits.length - totalMatched,
    results,
    summary: {
      totalCredits: Math.round(credits.reduce((s, t) => s + t.amount, 0) * 100) / 100,
      totalDebits: Math.round(debits.reduce((s, t) => s + Math.abs(t.amount), 0) * 100) / 100,
      totalMatched: Math.round(
        results.filter(r => r.invoice).reduce((s, r) => s + r.transaction.amount, 0) * 100
      ) / 100,
    },
  };
}
