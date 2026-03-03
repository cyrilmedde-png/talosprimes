/**
 * Service Qonto pour l'agent IA : organisation, solde, transactions.
 * Auth API Qonto v2 : header Authorization = "login:secret_key"
 * Doc : https://docs.qonto.com/api-reference/introduction
 */

import { env } from '../config/env.js';

const QONTO_API_BASE = 'https://thirdparty.qonto.com/v2';

// ─── Config helpers ───────────────────────────────────────────

function getAuthHeader(): string | null {
  const login = env.QONTO_LOGIN;
  const secret = env.QONTO_SECRET_KEY;
  if (!login || !secret) return null;
  return `${login}:${secret}`;
}

export function isQontoConfigured(): boolean {
  return !!getAuthHeader();
}

async function qontoFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const auth = getAuthHeader();
  if (!auth) throw new Error('Qonto non configuré. Ajoutez QONTO_LOGIN et QONTO_SECRET_KEY dans .env');

  const url = new URL(`${QONTO_API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Qonto API ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────

export interface QontoOrganization {
  slug: string;
  legal_name: string;
  bank_accounts: QontoBankAccount[];
}

export interface QontoBankAccount {
  slug: string;
  iban: string;
  bic: string;
  currency: string;
  balance: number;
  balance_cents: number;
  authorized_balance: number;
  authorized_balance_cents: number;
  name: string;
  status: string;
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
  emitted_at: string;
  status: string;
  note: string | null;
  reference: string | null;
  category: string | null;
}

// ─── API calls ────────────────────────────────────────────────

/**
 * Récupère l'organisation Qonto avec ses comptes bancaires et soldes.
 */
export async function getOrganization(): Promise<QontoOrganization> {
  const data = await qontoFetch<{ organization: QontoOrganization }>('/organization');
  return data.organization;
}

/**
 * Récupère le solde du compte principal.
 */
export async function getBalance(): Promise<{
  balance: number;
  authorized_balance: number;
  currency: string;
  iban: string;
  name: string;
}> {
  const org = await getOrganization();
  const account = org.bank_accounts[0];
  if (!account) throw new Error('Aucun compte bancaire trouvé sur Qonto');

  return {
    balance: account.balance,
    authorized_balance: account.authorized_balance,
    currency: account.currency,
    iban: account.iban,
    name: account.name,
  };
}

/**
 * Liste les transactions avec filtres optionnels.
 */
export async function listTransactions(params: {
  slug?: string;          // slug du compte (auto-détecté si absent)
  settled_at_from?: string;
  settled_at_to?: string;
  emitted_at_from?: string;
  emitted_at_to?: string;
  side?: 'credit' | 'debit';
  status?: string[];
  per_page?: number;
  current_page?: number;
  sort_by?: 'settled_at' | 'updated_at';
}): Promise<{
  transactions: QontoTransaction[];
  meta: { total_count: number; current_page: number; total_pages: number };
  summary: { total_credits: number; total_debits: number; count: number };
}> {
  // Auto-detect le slug du compte si pas fourni
  let slug = params.slug;
  if (!slug) {
    const org = await getOrganization();
    slug = org.bank_accounts[0]?.slug;
    if (!slug) throw new Error('Aucun compte bancaire trouvé sur Qonto');
  }

  const queryParams: Record<string, string> = {
    slug,
    per_page: String(params.per_page ?? 50),
    current_page: String(params.current_page ?? 1),
  };

  if (params.settled_at_from) queryParams.settled_at_from = params.settled_at_from;
  if (params.settled_at_to) queryParams.settled_at_to = params.settled_at_to;
  if (params.emitted_at_from) queryParams.emitted_at_from = params.emitted_at_from;
  if (params.emitted_at_to) queryParams.emitted_at_to = params.emitted_at_to;
  if (params.side) queryParams.side = params.side;
  if (params.sort_by) queryParams.sort_by = params.sort_by;
  if (params.status?.length) queryParams['status[]'] = params.status.join(',');

  const data = await qontoFetch<{
    transactions: QontoTransaction[];
    meta: { total_count: number; current_page: number; total_pages: number; per_page: number };
  }>('/transactions', queryParams);

  let totalCredits = 0;
  let totalDebits = 0;
  for (const t of data.transactions) {
    if (t.side === 'credit') totalCredits += t.amount;
    else totalDebits += t.amount;
  }

  return {
    transactions: data.transactions,
    meta: data.meta,
    summary: {
      total_credits: Math.round(totalCredits * 100) / 100,
      total_debits: Math.round(totalDebits * 100) / 100,
      count: data.transactions.length,
    },
  };
}
