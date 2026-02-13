'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient, type Invoice } from '@/lib/api-client';
import {
  BanknotesIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  payee: 'Payée',
  en_retard: 'En retard',
  annulee: 'Annulée',
};

export default function FacturesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadInvoices();
  }, [router, page, statutFilter]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { page?: number; limit?: number; statut?: string } = {
        page,
        limit: 20,
      };
      if (statutFilter) params.statut = statutFilter;
      const response = await apiClient.invoices.list(params);
      setInvoices(response.data.invoices);
      setTotalPages(response.data.totalPages);
      setTotal(response.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      if (err instanceof Error && err.message.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (id: string) => {
    try {
      setActionLoading(id);
      await apiClient.invoices.send(id);
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      setActionLoading(id);
      await apiClient.invoices.markPaid(id);
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur marquage payée');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const clientLabel = (inv: Invoice) => {
    const c = inv.clientFinal;
    if (!c) return '—';
    if (c.raisonSociale) return c.raisonSociale;
    return [c.prenom, c.nom].filter(Boolean).join(' ') || c.email;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BanknotesIcon className="h-8 w-8 text-amber-400" />
            Factures
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Liste des factures (conformité aux normes européennes : numéro, dates, TVA, mentions légales).
          </p>
        </div>
      </div>

      {/* Rappel normes européennes */}
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 text-sm text-amber-200">
        <strong>Facturation aux normes européennes :</strong> les factures générées respectent les obligations UE (numéro unique, date d&apos;émission, date d&apos;échéance, TVA, identité vendeur/acheteur, devise). Configurez l&apos;en-tête et le pied de page dans{' '}
        <button
          type="button"
          onClick={() => router.push('/settings?tab=facturation')}
          className="underline hover:text-amber-100"
        >
          Paramètres → Facturation
        </button>
        .
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-200 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="statut" className="text-sm text-gray-400">Statut</label>
          <select
            id="statut"
            value={statutFilter}
            onChange={(e) => { setStatutFilter(e.target.value); setPage(1); }}
            className="rounded-lg bg-gray-800 border border-gray-600 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">Tous</option>
            {Object.entries(STATUT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl bg-gray-800/50 border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Chargement des factures…</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Aucune facture.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">N° Facture</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Montant TTC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm font-mono text-white">{inv.numeroFacture}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{clientLabel(inv)}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(inv.dateFacture)}</td>
                    <td className="px-4 py-3 text-sm text-right text-white">{inv.montantTtc.toFixed(2)} €</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        inv.statut === 'payee' ? 'bg-green-500/20 text-green-300' :
                        inv.statut === 'envoyee' ? 'bg-blue-500/20 text-blue-300' :
                        inv.statut === 'en_retard' ? 'bg-red-500/20 text-red-300' :
                        inv.statut === 'annulee' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {STATUT_LABELS[inv.statut] ?? inv.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.lienPdf && (
                          <a
                            href={inv.lienPdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-600"
                            title="Télécharger PDF"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </a>
                        )}
                        {inv.statut === 'brouillon' && (
                          <button
                            type="button"
                            onClick={() => handleSend(inv.id)}
                            disabled={!!actionLoading}
                            className="p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-gray-600 disabled:opacity-50"
                            title="Envoyer"
                          >
                            <PaperAirplaneIcon className="h-5 w-5" />
                          </button>
                        )}
                        {(inv.statut === 'envoyee' || inv.statut === 'en_retard') && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(inv.id)}
                            disabled={!!actionLoading}
                            className="p-2 rounded-lg text-gray-400 hover:text-green-400 hover:bg-gray-600 disabled:opacity-50"
                            title="Marquer payée"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between text-sm text-gray-400">
            <span>
              {total} facture{total !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="py-1">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
