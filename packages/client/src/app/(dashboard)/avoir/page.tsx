'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient, type Avoir, type ArticleCode, type Invoice } from '@/lib/api-client';
import type { ClientFinal } from '@talosprimes/shared';
import {
  ReceiptRefundIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  validee: 'Validée',
  annulee: 'Annulée',
};

type LigneAvoir = {
  id: string;
  codeArticle: string;
  designation: string;
  quantite: string;
  prixUnitaireHT: string;
};

export default function AvoirPage() {
  const router = useRouter();
  const [avoirsList, setAvoirsList] = useState<Avoir[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statutFilter, setStatutFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal créer
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clients, setClients] = useState<ClientFinal[]>([]);
  const [articleCodes, setArticleCodes] = useState<ArticleCode[]>([]);
  const [factures, setFactures] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    clientFinalId: '',
    invoiceId: '',
    motif: '',
    description: '',
    tvaTaux: '20',
  });
  const [lignes, setLignes] = useState<LigneAvoir[]>([]);
  const createSubmittingRef = useRef(false);

  const getDefaultLigne = (): LigneAvoir => ({
    id: `l-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    codeArticle: '',
    designation: '',
    quantite: '1',
    prixUnitaireHT: '',
  });

  const resetCreateForm = () => {
    setCreateForm({ clientFinalId: '', invoiceId: '', motif: '', description: '', tvaTaux: '20' });
    setLignes([getDefaultLigne()]);
    setSelectedInvoiceId('');
  };

  const handleInvoiceSelect = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    if (!invoiceId) {
      setCreateForm((f) => ({ ...f, invoiceId: '' }));
      return;
    }
    setCreateForm((f) => ({ ...f, invoiceId }));
    try {
      const res = await apiClient.invoices.get(invoiceId);
      const inv = res.data?.invoice || res.data;
      if (inv) {
        const i = inv as Invoice & { lines?: { codeArticle?: string | null; designation: string; quantite: number; prixUnitaireHt: number | string }[] };
        setCreateForm((f) => ({
          ...f,
          invoiceId,
          clientFinalId: i.clientFinalId || f.clientFinalId,
          tvaTaux: i.tvaTaux != null ? String(Number(i.tvaTaux)) : f.tvaTaux,
          motif: `Avoir sur facture ${i.numeroFacture || ''}`,
          description: (i.description as string) || f.description,
        }));
        if (i.lines && i.lines.length > 0) {
          setLignes(i.lines.map((il: { codeArticle?: string | null; designation: string; quantite: number; prixUnitaireHt: number | string }) => ({
            id: `l-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            codeArticle: il.codeArticle || '',
            designation: il.designation || '',
            quantite: String(il.quantite || 1),
            prixUnitaireHT: String(Number(il.prixUnitaireHt) || 0),
          })));
        }
      }
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    loadAvoirs();
  }, [router, page, statutFilter]);

  useEffect(() => {
    if (showCreateModal && clients.length === 0) {
      apiClient.clients.list().then((r) => setClients((r.data.clients as ClientFinal[]) || [])).catch(() => {});
    }
    if (showCreateModal && articleCodes.length === 0) {
      apiClient.articleCodes.list().then((r) => { if (r.success) setArticleCodes(r.data.articles || []); }).catch(() => {});
    }
    if (showCreateModal) {
      apiClient.invoices.list({ limit: 200 }).then((r) => {
        const inv = (r.data?.invoices || []) as Invoice[];
        // Filtrer les factures non-brouillon et non-annulée
        setFactures(inv.filter((f) => f.statut !== 'brouillon' && f.statut !== 'annulee'));
      }).catch(() => {});
    }
  }, [showCreateModal, clients.length, articleCodes.length]);

  useEffect(() => {
    if (showCreateModal && lignes.length === 0) setLignes([getDefaultLigne()]);
  }, [showCreateModal, lignes.length]);

  const loadAvoirs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statutFilter) params.statut = statutFilter;
      const res = await apiClient.avoirs.list(params as Parameters<typeof apiClient.avoirs.list>[0]);
      setAvoirsList(res.data.avoirs || []);
      setTotalPages(res.data.totalPages ?? 1);
      setTotal(res.data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const computeTotaux = () => {
    let totalHt = 0;
    lignes.forEach((l) => {
      const qte = parseFloat(l.quantite.replace(',', '.')) || 0;
      const pu = parseFloat(l.prixUnitaireHT.replace(',', '.')) || 0;
      totalHt += qte * pu;
    });
    const tva = parseFloat(createForm.tvaTaux.replace(',', '.')) || 20;
    return { montantHt: totalHt, montantTtc: totalHt * (1 + tva / 100) };
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createSubmittingRef.current) return;
    const tot = computeTotaux();
    if (!createForm.clientFinalId || tot.montantHt <= 0) {
      setError('Client obligatoire et au moins une ligne avec un prix.');
      return;
    }
    createSubmittingRef.current = true;
    try {
      setCreating(true);
      setError(null);
      const apiLines = lignes
        .filter((l) => l.designation.trim() && (parseFloat(l.prixUnitaireHT.replace(',', '.')) || 0) > 0)
        .map((l) => ({
          codeArticle: l.codeArticle || undefined,
          designation: l.designation.trim(),
          quantite: Math.max(1, Math.round(parseFloat(l.quantite.replace(',', '.')) || 1)),
          prixUnitaireHt: parseFloat(l.prixUnitaireHT.replace(',', '.')) || 0,
        }));

      await apiClient.avoirs.create({
        clientFinalId: createForm.clientFinalId,
        invoiceId: createForm.invoiceId || undefined,
        montantHt: Math.round(tot.montantHt * 100) / 100,
        tvaTaux: parseFloat(createForm.tvaTaux.replace(',', '.')) || 20,
        motif: createForm.motif || undefined,
        description: createForm.description || undefined,
        lines: apiLines.length > 0 ? apiLines : undefined,
      });
      setShowCreateModal(false);
      resetCreateForm();
      setSuccess('Avoir créé');
      await loadAvoirs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création');
    } finally {
      setCreating(false);
      createSubmittingRef.current = false;
    }
  };

  const handleValidate = async (id: string) => {
    try {
      setActionLoading(id);
      await apiClient.avoirs.validate(id);
      setSuccess('Avoir validé');
      await loadAvoirs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur validation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (avoir: Avoir) => {
    if (!confirm(`Supprimer l'avoir ${avoir.numeroAvoir} ?`)) return;
    try {
      setActionLoading(avoir.id);
      await apiClient.avoirs.delete(avoir.id);
      setSuccess('Avoir supprimé');
      await loadAvoirs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return d; }
  };

  const clientLabel = (avoir: Avoir) => {
    const c = avoir.clientFinal;
    if (!c) return '—';
    if (c.raisonSociale) return c.raisonSociale;
    return [c.prenom, c.nom].filter(Boolean).join(' ') || c.email;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              type="button"
              onClick={() => router.push('/factures')}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
              title="Retour aux factures"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ReceiptRefundIcon className="h-8 w-8 text-rose-400" />
              Gestion des Avoirs
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-400 ml-10">Créez et gérez vos avoirs (notes de crédit).</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreateModal(true); setError(null); resetCreateForm(); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm"
        >
          <PlusIcon className="h-5 w-5" />
          Créer un avoir
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-200 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4 text-sm text-green-200">
          {success}
        </div>
      )}

      <div className="flex items-center gap-2">
        <label htmlFor="statut-avoir" className="text-sm text-gray-400">Statut</label>
        <select
          id="statut-avoir"
          value={statutFilter}
          onChange={(e) => { setStatutFilter(e.target.value); setPage(1); }}
          className="rounded-lg bg-gray-800 border border-gray-600 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500"
        >
          <option value="">Tous</option>
          {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="rounded-xl bg-gray-800/50 border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Chargement…</div>
        ) : avoirsList.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Aucun avoir.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">N° Avoir</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Montant TTC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {avoirsList.map((avoir) => (
                  <tr key={avoir.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm font-mono text-white">{avoir.numeroAvoir}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{clientLabel(avoir)}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(avoir.dateAvoir)}</td>
                    <td className="px-4 py-3 text-sm text-right text-white">{(Number(avoir.montantTtc) || 0).toFixed(2)} €</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        avoir.statut === 'validee' ? 'bg-green-500/20 text-green-300' :
                        avoir.statut === 'annulee' ? 'bg-red-500/20 text-red-300' :
                        'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {STATUT_LABELS[avoir.statut] ?? avoir.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {avoir.statut === 'brouillon' && (
                          <button
                            type="button"
                            onClick={() => handleValidate(avoir.id)}
                            disabled={!!actionLoading}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-green-400 hover:bg-gray-600 disabled:opacity-40"
                            title="Valider"
                          >
                            <CheckCircleIcon className="h-4 w-4" />Valider
                          </button>
                        )}
                        {avoir.statut !== 'validee' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(avoir)}
                            disabled={!!actionLoading}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-red-400 hover:bg-gray-600 disabled:opacity-40"
                            title="Supprimer"
                          >
                            <TrashIcon className="h-4 w-4" />Supprimer
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
            <span>{total} avoirs</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50">Précédent</button>
              <span className="py-1">Page {page} / {totalPages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Créer avoir */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] my-8 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <h2 className="text-lg font-semibold text-white">Nouvel avoir</h2>
              <button type="button" onClick={() => !creating && setShowCreateModal(false)} className="p-1 rounded text-gray-400 hover:text-white">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5 overflow-y-auto shrink min-h-0 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Client *</label>
                <select
                  required
                  value={createForm.clientFinalId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, clientFinalId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.raisonSociale || [c.prenom, c.nom].filter(Boolean).join(' ') || c.email}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Facture liée</label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Aucune (optionnel)</option>
                    {factures.map((f) => (
                      <option key={f.id} value={f.id}>{f.numeroFacture} — {(Number(f.montantTtc) || 0).toFixed(2)} € ({f.statut})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">TVA % *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={createForm.tvaTaux}
                    onChange={(e) => setCreateForm((f) => ({ ...f, tvaTaux: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Motif</label>
                  <input
                    type="text"
                    value={createForm.motif}
                    onChange={(e) => setCreateForm((f) => ({ ...f, motif: e.target.value }))}
                    placeholder="Motif du crédit"
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">Lignes / Articles</label>
                  <button type="button" onClick={() => setLignes((prev) => [...prev, getDefaultLigne()])} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm">
                    <PlusIcon className="h-4 w-4" /> Ajouter
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-600">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-700/70 text-gray-300">
                      <tr>
                        <th className="px-3 py-2 text-left w-28 font-medium">Code Art.</th>
                        <th className="px-3 py-2 text-left font-medium">Désignation</th>
                        <th className="px-3 py-2 text-right w-20">Qté</th>
                        <th className="px-3 py-2 text-right w-28">Prix unit. HT</th>
                        <th className="px-3 py-2 text-right w-28">Montant HT</th>
                        <th className="px-3 py-2 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {lignes.map((ligne) => {
                        const qte = parseFloat(ligne.quantite.replace(',', '.')) || 0;
                        const pu = parseFloat(ligne.prixUnitaireHT.replace(',', '.')) || 0;
                        const mtHt = Math.round(qte * pu * 100) / 100;
                        return (
                          <tr key={ligne.id} className="bg-gray-800/50">
                            <td className="px-3 py-2">
                              <select
                                value={ligne.codeArticle}
                                onChange={(e) => {
                                  const code = e.target.value;
                                  const found = articleCodes.find((a) => a.code === code);
                                  setLignes((prev) => prev.map((l) => l.id === ligne.id ? {
                                    ...l,
                                    codeArticle: code,
                                    designation: found ? found.designation : l.designation,
                                    prixUnitaireHT: found?.prixUnitaireHt ? String(Number(found.prixUnitaireHt)) : l.prixUnitaireHT,
                                  } : l));
                                }}
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white text-sm focus:ring-1 focus:ring-rose-500"
                              >
                                <option value="">—</option>
                                {articleCodes.filter((a) => a.actif).map((a) => (
                                  <option key={a.id} value={a.code}>{a.code}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={ligne.designation}
                                onChange={(e) => setLignes((prev) => prev.map((l) => l.id === ligne.id ? { ...l, designation: e.target.value } : l))}
                                placeholder="Désignation"
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white focus:ring-1 focus:ring-rose-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={ligne.quantite}
                                onChange={(e) => setLignes((prev) => prev.map((l) => l.id === ligne.id ? { ...l, quantite: e.target.value } : l))}
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white text-right focus:ring-1 focus:ring-rose-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={ligne.prixUnitaireHT}
                                onChange={(e) => setLignes((prev) => prev.map((l) => l.id === ligne.id ? { ...l, prixUnitaireHT: e.target.value } : l))}
                                placeholder="0.00"
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white text-right focus:ring-1 focus:ring-rose-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-300 tabular-nums">{mtHt.toFixed(2)} €</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => setLignes((prev) => prev.filter((l) => l.id !== ligne.id))}
                                disabled={lignes.length <= 1}
                                className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 disabled:opacity-40"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {lignes.length > 0 && (() => {
                  const tot = computeTotaux();
                  return (
                    <div className="mt-2 flex justify-end gap-6 text-sm">
                      <span className="text-gray-400">Total HT : <strong className="text-white">{tot.montantHt.toFixed(2)} €</strong></span>
                      <span className="text-gray-400">Total TTC : <strong className="text-rose-400">{tot.montantTtc.toFixed(2)} €</strong></span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                <button type="button" onClick={() => !creating && setShowCreateModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600">Annuler</button>
                <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium disabled:opacity-50">
                  {creating ? 'Création…' : 'Créer l\'avoir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
