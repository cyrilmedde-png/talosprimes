/**
 * Service Qonto pour l'agent IA : liste des transactions (entrées/sorties).
 * API Business Qonto : https://docs.qonto.com/
 * Requiert QONTO_API_SECRET (Bearer) et QONTO_BANK_ACCOUNT_ID (ou IBAN) dans .env.
 */

import { env } from '../config/env.js';

const QONTO_API_BASE = 'https://thirdparty.qonto.com';

export function isQontoConfigured(): boolean {
  return !!(env.QONTO_API_SECRET && (env.QONTO_ORG_ID || env.QONTO_BANK_ACCOUNT_ID));
}

// QONTO_ORG_ID peut être le bank_account_id (UUID) ou on pourra appeler /v2/organization pour le récupérer
// Pour l'instant on utilise QONTO_BANK_ACCOUNT_ID si défini, sinon QONTO_ORG_ID (documenté comme bank_account_id ou slug)
function getBankAccountId(): string | undefined {
  return env.QONTO_BANK_ACCOUNT_ID ?? env.QONTO_ORG_ID;
}

export interface QontoTransaction {
  id: string;
  transaction_id: string;
  amount: number;
  amount_cents: number;
  side: 'credit' | 'debit';
  operation_type: string;
  currency: string;
  label: string;
  settled_at: string;
  status: string;
  note?: string | null;
}

export interface QontoTransactionsResult {
  error?: string;
  transactions?: QontoTransaction[];
  meta?: { total_count: number; current_page: number; total_pages: number };
  summary?: { total_credits: number; total_debits: number; count: number };
}

export async function listQontoTransactions(params: {
  settledAtFrom?: string;
  settledAtTo?: string;
  side?: 'credit' | 'debit';
  perPage?: number;
  page?: number;
}): Promise<QontoTransactionsResult> {
  if (!env.QONTO_API_SECRET) {
    return { error: 'Qonto non configuré : définir QONTO_API_SECRET dans .env' };
  }
  const bankAccountId = getBankAccountId();
  if (!bankAccountId) {
    return { error: 'Qonto : définir QONTO_BANK_ACCOUNT_ID ou QONTO_ORG_ID (ID du compte bancaire) dans .env' };
  }

  const searchParams = new URLSearchParams();
  searchParams.set('bank_account_id', bankAccountId);
  if (params.settledAtFrom) searchParams.set('settled_at_from', params.settledAtFrom);
  if (params.settledAtTo) searchParams.set('settled_at_to', params.settledAtTo);
  if (params.side) searchParams.set('side', params.side);
  searchParams.set('per_page', String(params.perPage ?? 50));
  if (params.page) searchParams.set('page', String(params.page));

  try {
    const res = await fetch(`${QONTO_API_BASE}/v2/transactions?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.QONTO_API_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: `Qonto API ${res.status}: ${text || res.statusText}` };
    }

    const data = (await res.json()) as {
      transactions?: Array<{
        id: string;
        transaction_id: string;
        amount: number;
        amount_cents: number;
        side: string;
        operation_type: string;
        currency: string;
        label: string;
        settled_at: string;
        status: string;
        note?: string | null;
      }>;
      meta?: { total_count: number; current_page: number; total_pages: number; per_page: number };
    };

    const transactions: QontoTransaction[] = (data.transactions ?? []).map((t) => ({
      id: t.id,
      transaction_id: t.transaction_id,
      amount: t.amount,
      amount_cents: t.amount_cents,
      side: t.side as 'credit' | 'debit',
      operation_type: t.operation_type,
      currency: t.currency,
      label: t.label,
      settled_at: t.settled_at,
      status: t.status,
      note: t.note ?? null,
    }));

    let totalCredits = 0;
    let totalDebits = 0;
    for (const t of transactions) {
      if (t.side === 'credit') totalCredits += t.amount;
      else totalDebits += Math.abs(t.amount);
    }

    return {
      transactions,
      meta: data.meta,
      summary: {
        total_credits: totalCredits,
        total_debits: totalDebits,
        count: transactions.length,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
