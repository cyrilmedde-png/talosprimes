'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient, type Proforma, type ArticleCode } from '@/lib/api-client';
import type { ClientFinal } from '@talosprimes/shared';
import {
  DocumentCheckIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  expiree: 'Expirée',
  facturee: 'Facturée',
};

type LigneProforma = {
  id: string;
  codeArticle: string;
  designation: string;
  quantite: string;
  prixUnitaireHT: string;
};

export default function ProformaPage() {
  const router = useRouter();
  const [proformasList, setProformasList] = useState<Proforma[]>([]);
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
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    clientFinalId: '',
    description: '',
    modePaiement: '',
    tvaTaux: '20',
    dateValidite: '',
  });
  const [lignes, setLignes] = useState<LigneProforma[]>([]);
  const createSubmittingRef = useRef(false);

  const getDefaultLigne = (): LigneProforma => ({
    id: `l-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    codeArticle: '',
    designation: '',
    quantite: '1',
    prixUnitaireHT: '',
  });

  const resetCreateForm = () => {
    setCreateForm({ clientFinalId: '', description: '', modePaiement: '', tvaTaux: '20', dateValidite: '' });
    setLignes([getDefaultLigne()]);
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    loadProformas();
  }, [router, page, statutFilter]);

  useEffect(() => {
    if (showCreateModal && clients.length === 0) {
      apiClient.clients.list().then((r) => setClients((r.data.clients as ClientFinal[]) || [])).catch(() => {});
    }
    if (showCreateModal && articleCodes.length === 0) {
      apiClient.articleCodes.list().then((r) => { if (r.success) setArticleCodes(r.data.articles || []); }).catch(() => {});
    }
  }, [showCreateModal, clients.length, articleCodes.length]);

  useEffect(() => {
    if (showCreateModal && lignes.length === 0) setLignes([getDefaultLigne()]);
  }, [showCreateModal, lignes.length]);

  const loadProformas = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statutFilter) params.statut = statutFilter;
      const res = await apiClient.proformas.list(params as Parameters<typeof apiClient.proformas.list>[0]);
      setProformasList(res.data.proformas || []);
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

      await apiClient.proformas.create({
        clientFinalId: createForm.clientFinalId,
        montantHt: Math.round(tot.montantHt * 100) / 100,
        tvaTaux: parseFloat(createForm.tvaTaux.replace(',', '.')) || 20,
        description: createForm.description || undefined,
        modePaiement: createForm.modePaiement || undefined,
        dateValidite: createForm.dateValidite || undefined,
        lines: apiLines.length > 0 ? apiLines : undefined,
      });
      setShowCreateModal(false);
      resetCreateForm();
      setSuccess('Proforma créée');
      await loadProformas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création');
    } finally {
      setCreating(false);
      createSubmittingRef.current = false;
    }
  };

  const handleSend = async (id: string) => {
    try {
      setActionLoading(id);
      await apiClient.proformas.send(id);
      setSuccess('Proforma envoyée');
      await loadProformas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      setActionLoading(id);
      await apiClient.proformas.accept(id);
      setSuccess('Proforma acceptée');
      await loadProformas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur acceptation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvert = async (id: string) => {
    if (!confirm('Convertir cette proforma en facture ?')) return;
    try {
      setActionLoading(id);
      await apiClient.proformas.convertToInvoice(id);
      setSuccess('Facture créée depuis la proforma');
      await loadProformas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur conversion');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (proforma: Proforma) => {
    if (!confirm(`Supprimer la proforma ${proforma.numeroProforma} ?`)) return;
    try {
      setActionLoading(proforma.id);
      await apiClient.proformas.delete(proforma.id);
      setSuccess('Proforma supprimée');
      await loadProformas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return d; }
  };

  const clientLabel = (proforma: Proforma) => {
    const c = proforma.clientFinal;
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
              <DocumentCheckIcon className="h-8 w-8 text-teal-400" />
              Gestion des Proformas
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-400 ml-10">Créez et gérez vos proformas, convertissez-les en factures.</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreateModal(true); setError(null); resetCreateForm(); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm"
        >
          <PlusIcon className="h-5 w-5" />
          Créer une proforma
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
        <label htmlFor="statut-proforma" className="text-sm text-gray-400">Statut</label>
        <select
          id="statut-proforma"
          value={statutFilter}
          onChange={(e) => { setStatutFilter(e.target.value); setPage(1); }}
          className="rounded-lg bg-gray-800 border border-gray-600 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Tous</option>
          {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="rounded-xl bg-gray-800/50 border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Chargement…</div>
        ) : proformasList.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Aucune proforma.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">N° Proforma</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Validité</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Montant TTC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {proformasList.map((proforma) => (
                  <tr key={proforma.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm font-mono text-white">PRO-{proforma.numeroProforma}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{clientLabel(proforma)}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{formatDate(proforma.dateProforma)}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{proforma.dateValidite ? formatDate(proforma.dateValidite) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-right text-white">{(Number(proforma.montantTtc) || 0).toFixed(2)} €</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        proforma.statut === 'facturee' ? 'bg-green-500/20 text-green-300' :
                        proforma.statut === 'acceptee' ? 'bg-blue-500/20 text-blue-300' :
                        proforma.statut === 'envoyee' ? 'bg-teal-500/20 text-teal-300' :
                        proforma.statut === 'refusee' ? 'bg-red-500/20 text-red-300' :
                        proforma.statut === 'expiree' ? 'bg-gray-500/20 text-gray-400' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {STATUT_LABELS[proforma.statut] ?? proforma.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setActionLoading(proforma.id);
                              await apiClient.proformas.downloadPdf(proforma.id);
                            } catch {
                              alert('Impossible de charger le PDF.');
                            } finally {
                              setActionLoading(null);
                            }
                          }}
                          disabled={!!actionLoading}
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Voir le PDF"
                        >
                          <DocumentArrowDownIcon className="h-5 w-5" />
                        </button>
                        {proforma.statut === 'brouillon' && (
                          <button
                            type="button"
                            onClick={() => handleSend(proforma.id)}
                            disabled={!!actionLoading}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-teal-400 hover:bg-gray-600 disabled:opacity-40"
                            title="Envoyer"
                          >
                            <PaperAirplaneIcon className="h-4 w-4" />Envoyer
                          </button>
                        )}
                        {proforma.statut === 'envoyee' && (
                          <button
                            type="button"
                            onClick={() => handleAccept(proforma.id)}
                            disabled={!!actionLoading}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-blue-400 hover:bg-gray-600 disabled:opacity-40"
                            title="Accepter"
                          >
                            <CheckCircleIcon className="h-4 w-4" />Accepter
                          </button>
                        )}
                        {(proforma.statut === 'acceptee') && (
                          <button
                            type="button"
                            onClick={() => handleConvert(proforma.id)}
                            disabled={!!actionLoading}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-green-400 hover:bg-gray-600 disabled:opacity-40"
                            title="Convertir en facture"
                          >
                            <DocumentArrowDownIcon className="h-4 w-4" />Facturer
                          </button>
                        )}
                        {proforma.statut !== 'facturee' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(proforma)}
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
            <span>{total} proformas</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50">Précédent</button>
              <span className="py-1">Page {page} / {totalPages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Créer proforma */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] my-8 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <h2 className="text-lg font-semibold text-white">Nouvelle proforma</h2>
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
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.raisonSociale || [c.prenom, c.nom].filter(Boolean).join(' ') || c.email}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">TVA % *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={createForm.tvaTaux}
                    onChange={(e) => setCreateForm((f) => ({ ...f, tvaTaux: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Mode de paiement</label>
                  <input
                    type="text"
                    value={createForm.modePaiement}
                    onChange={(e) => setCreateForm((f) => ({ ...f, modePaiement: e.target.value }))}
                    placeholder="Virement, CB..."
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date de validité</label>
                  <input
                    type="date"
                    value={createForm.dateValidite}
                    onChange={(e) => setCreateForm((f) => ({ ...f, dateValidite: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-teal-500"
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
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white text-sm focus:ring-1 focus:ring-teal-500"
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
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={ligne.quantite}
                                onChange={(e) => setLignes((prev) => prev.map((l) => l.id === ligne.id ? { ...l, quantite: e.target.value } : l))}
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white text-right focus:ring-1 focus:ring-teal-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={ligne.prixUnitaireHT}
                                onChange={(e) => setLignes((prev) => prev.map((l) => l.id === ligne.id ? { ...l, prixUnitaireHT: e.target.value } : l))}
                                placeholder="0.00"
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white text-right focus:ring-1 focus:ring-teal-500"
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
                      <span className="text-gray-400">Total TTC : <strong className="text-teal-400">{tot.montantTtc.toFixed(2)} €</strong></span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                <button type="button" onClick={() => !creating && setShowCreateModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600">Annuler</button>
                <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium disabled:opacity-50">
                  {creating ? 'Création…' : 'Créer la proforma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
