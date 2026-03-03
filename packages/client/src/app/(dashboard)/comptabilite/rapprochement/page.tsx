'use client';

import { useState, useRef } from 'react';
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { API_URL } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

// ── Types ──────────────────────────────────────────────────────────

type MatchResult = {
  transaction: {
    date: string;
    label: string;
    amount: number;
    reference?: string;
    raw: string;
  };
  invoice: {
    id: string;
    numero: string;
    clientName: string;
    montantTtc: number;
    dateFacture: string;
    statut: string;
  } | null;
  confidence: 'high' | 'medium' | 'none';
  reason: string;
};

type RapprochementResult = {
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
    totalUnmatched: number;
  };
};

// ── Helpers ─────────────────────────────────────────────────────────

const confidenceBadge = (c: string) => {
  switch (c) {
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
          <CheckCircleIcon className="h-3.5 w-3.5" /> Élevée
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Moyenne
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
          <XCircleIcon className="h-3.5 w-3.5" /> Non trouvé
        </span>
      );
  }
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('fr-FR');
  } catch {
    return d;
  }
};

// ── Component ──────────────────────────────────────────────────────

export default function RapprochementPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [result, setResult] = useState<RapprochementResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fileName, setFileName] = useState('');

  // ── Upload CSV ──

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');
    setSuccess('');
    setResult(null);
    setSelectedIds(new Set());

    const text = await file.text();
    if (!text.trim()) {
      setError('Le fichier CSV est vide.');
      return;
    }

    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/rapprochement/csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ csvContent: text }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Erreur serveur');

      setResult(json.data ?? json);

      // Auto-select high confidence matches
      const highIds = new Set<string>();
      (json.data ?? json).results?.forEach((r: MatchResult) => {
        if (r.confidence === 'high' && r.invoice) {
          highIds.add(r.invoice.id);
        }
      });
      setSelectedIds(highIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du rapprochement');
    } finally {
      setLoading(false);
      // Reset input so the same file can be re-uploaded
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── Confirm selected invoices as paid ──

  const handleConfirm = async () => {
    if (selectedIds.size === 0) return;

    setConfirming(true);
    setError('');
    setSuccess('');

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/rapprochement/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoiceIds: Array.from(selectedIds) }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Erreur serveur');

      setSuccess(`${selectedIds.size} facture(s) marquée(s) comme payée(s).`);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de confirmation');
    } finally {
      setConfirming(false);
    }
  };

  // ── Toggle selection ──

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllMatched = () => {
    if (!result) return;
    const ids = new Set<string>();
    result.results.forEach((r) => {
      if (r.invoice && (r.confidence === 'high' || r.confidence === 'medium')) {
        ids.add(r.invoice.id);
      }
    });
    setSelectedIds(ids);
  };

  const deselectAll = () => setSelectedIds(new Set());

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Rapprochement Bancaire</h1>
        <p className="mt-2 text-sm text-gray-400">
          Importez un relevé bancaire CSV pour matcher automatiquement les transactions avec vos factures.
        </p>
      </div>

      {/* Upload zone */}
      <div className="bg-gray-800/20 backdrop-blur-md rounded-lg border border-gray-700/30 p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <label
            htmlFor="csv-upload"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium cursor-pointer transition-colors"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Importer un CSV
          </label>
          <input
            id="csv-upload"
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFile}
          />
          <div className="text-sm text-gray-400">
            {fileName ? (
              <span className="text-gray-300">Fichier : {fileName}</span>
            ) : (
              'Formats supportés : BNP, Crédit Mutuel, Crédit Agricole, Qonto, ou CSV générique'
            )}
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-indigo-400 text-sm">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Analyse en cours...
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-900/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-800/20 backdrop-blur-md rounded-lg border border-gray-700/30 p-4">
              <p className="text-xs text-gray-400 uppercase">Transactions</p>
              <p className="text-2xl font-semibold text-white">{result.totalTransactions}</p>
            </div>
            <div className="bg-gray-800/20 backdrop-blur-md rounded-lg border border-gray-700/30 p-4">
              <p className="text-xs text-gray-400 uppercase">Crédits</p>
              <p className="text-2xl font-semibold text-green-400">{result.credits}</p>
              <p className="text-xs text-gray-500">{formatMoney(result.summary.totalCredits)}</p>
            </div>
            <div className="bg-gray-800/20 backdrop-blur-md rounded-lg border border-gray-700/30 p-4">
              <p className="text-xs text-gray-400 uppercase">Débits</p>
              <p className="text-2xl font-semibold text-red-400">{result.debits}</p>
              <p className="text-xs text-gray-500">{formatMoney(result.summary.totalDebits)}</p>
            </div>
            <div className="bg-gray-800/20 backdrop-blur-md rounded-lg border border-gray-700/30 p-4">
              <p className="text-xs text-gray-400 uppercase">Matchés</p>
              <p className="text-2xl font-semibold text-indigo-400">{result.matched}</p>
              <p className="text-xs text-gray-500">{formatMoney(result.summary.totalMatched)}</p>
            </div>
            <div className="bg-gray-800/20 backdrop-blur-md rounded-lg border border-gray-700/30 p-4">
              <p className="text-xs text-gray-400 uppercase">Non matchés</p>
              <p className="text-2xl font-semibold text-gray-400">{result.unmatched}</p>
              <p className="text-xs text-gray-500">{formatMoney(result.summary.totalUnmatched)}</p>
            </div>
          </div>

          {/* Actions bar */}
          <div className="bg-gray-800/20 backdrop-blur-md rounded-lg border border-gray-700/30 mb-6">
            <div className="px-4 py-3 border-b border-gray-700/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium text-white">Résultats du rapprochement</h3>
                {selectedIds.size > 0 && (
                  <span className="text-sm text-indigo-400">
                    {selectedIds.size} sélectionné(s)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllMatched}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700/50 transition-colors"
                >
                  Tout sélectionner
                </button>
                <button
                  onClick={deselectAll}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700/50 transition-colors"
                >
                  Désélectionner
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={selectedIds.size === 0 || confirming}
                  className="px-4 py-1.5 text-xs rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center gap-1.5"
                >
                  {confirming ? (
                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                  )}
                  Marquer payées
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700/30">
                <thead className="bg-gray-800/30">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase w-10"></th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase">Libellé transaction</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-300 uppercase">Montant</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase">Confiance</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase">Facture matchée</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase">Client</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase">Raison</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                  {result.results.map((r, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-gray-800/30 transition-colors ${
                        r.invoice && selectedIds.has(r.invoice.id) ? 'bg-indigo-900/10' : ''
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        {r.invoice && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.invoice.id)}
                            onChange={() => toggle(r.invoice!.id)}
                            className="rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                          />
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-300 whitespace-nowrap">
                        {formatDate(r.transaction.date)}
                      </td>
                      <td className="px-3 py-3 text-sm text-white max-w-xs truncate" title={r.transaction.label}>
                        {r.transaction.label}
                      </td>
                      <td className={`px-3 py-3 text-sm text-right font-mono whitespace-nowrap ${
                        r.transaction.amount >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatMoney(r.transaction.amount)}
                      </td>
                      <td className="px-3 py-3">{confidenceBadge(r.confidence)}</td>
                      <td className="px-3 py-3 text-sm whitespace-nowrap">
                        {r.invoice ? (
                          <span className="text-indigo-400 font-medium">{r.invoice.numero}</span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-300 max-w-[150px] truncate">
                        {r.invoice?.clientName || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={r.reason}>
                        {r.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {result.results.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune transaction trouvée dans le fichier CSV.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="bg-gray-800/20 backdrop-blur-md rounded-lg border border-gray-700/30 p-12 text-center">
          <BanknotesIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            Aucun rapprochement en cours
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Importez un relevé bancaire au format CSV pour commencer le rapprochement automatique
            avec vos factures. Les crédits seront matchés par montant, date et référence.
          </p>
        </div>
      )}
    </div>
  );
}
