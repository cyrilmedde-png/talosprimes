'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient, type Invoice } from '@/lib/api-client';
import type { ClientFinal } from '@talosprimes/shared';
import {
  BanknotesIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  DocumentTextIcon,
  ReceiptRefundIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  payee: 'Payée',
  en_retard: 'En retard',
  annulee: 'Annulée',
};

const TYPE_FACTURE_OPTIONS: { value: 'facture_entreprise' | 'facture_client_final'; label: string }[] = [
  { value: 'facture_client_final', label: 'Facture client final' },
  { value: 'facture_entreprise', label: 'Facture entreprise' },
];

const TYPE_DOCUMENT_OPTIONS: { value: 'facture' | 'devis' | 'proforma' | 'avoir'; label: string }[] = [
  { value: 'facture', label: 'Facture' },
  { value: 'devis', label: 'Devis' },
  { value: 'proforma', label: 'Proforma' },
  { value: 'avoir', label: 'Avoir' },
];

const UNITES_OPTIONS = ['', 'pièce', 'kg', 'm', 'm²', 'h', 'j', 'forfait', 'lot'];

const CONDITIONS_PAIEMENT_OPTIONS = [
  { value: '', label: '—' },
  { value: 'reception', label: 'À réception' },
  { value: '30j', label: '30 jours net' },
  { value: '45j', label: '45 jours net' },
  { value: '60j', label: '60 jours net' },
  { value: 'autre', label: 'Autre' },
];

type LigneArticle = {
  id: string;
  designation: string;
  quantite: string;
  unite: string;
  prixUnitaireHT: string;
  tauxTVA: string;
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

  // Modal Créer une facture / devis / proforma / avoir
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clients, setClients] = useState<ClientFinal[]>([]);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    typeDocument: 'facture' as 'facture' | 'devis' | 'proforma' | 'avoir',
    clientFinalId: '',
    type: 'facture_client_final' as 'facture_entreprise' | 'facture_client_final',
    montantHt: '',
    tvaTaux: '20',
    description: '',
    dateFacture: new Date().toISOString().slice(0, 10),
    dateEcheance: '',
    conditionsPaiement: '',
    reference: '',
    notes: '',
  });
  const [lignes, setLignes] = useState<LigneArticle[]>([]);
  const createSubmittingRef = useRef(false);

  const selectedClient = clients.find((c) => c.id === createForm.clientFinalId);

  const getDefaultLigne = (): LigneArticle => ({
    id: `ligne-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    designation: '',
    quantite: '1',
    unite: '',
    prixUnitaireHT: '',
    tauxTVA: '20',
  });

  const resetCreateForm = () => {
    setCreateForm({
      typeDocument: 'facture',
      clientFinalId: '',
      type: 'facture_client_final',
      montantHt: '',
      tvaTaux: '20',
      description: '',
      dateFacture: new Date().toISOString().slice(0, 10),
      dateEcheance: '',
      conditionsPaiement: '',
      reference: '',
      notes: '',
    });
    setLignes([getDefaultLigne()]);
  };

  // Message "bientôt" pour Devis / Proforma / Avoir
  const [bientotMessage, setBientotMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadInvoices();
  }, [router, page, statutFilter]);

  useEffect(() => {
    if (showCreateModal && clients.length === 0) {
      apiClient.clients.list().then((r) => setClients((r.data.clients as ClientFinal[]) || [])).catch(() => {});
    }
  }, [showCreateModal, clients.length]);

  useEffect(() => {
    if (showCreateModal && lignes.length === 0) {
      setLignes([getDefaultLigne()]);
    }
  }, [showCreateModal, lignes.length]);

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
      const data = response.data;
      setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? data.count ?? 0);
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

  const computeTotauxFromLignes = (): { montantHt: number; montantTva: number; montantTtc: number; tvaTauxMoyen: number } => {
    let totalHt = 0;
    let totalTva = 0;
    lignes.forEach((l) => {
      const qte = parseFloat(l.quantite.replace(',', '.')) || 0;
      const pu = parseFloat(l.prixUnitaireHT.replace(',', '.')) || 0;
      const taux = parseFloat(l.tauxTVA.replace(',', '.')) || 0;
      const mtHt = qte * pu;
      totalHt += mtHt;
      totalTva += mtHt * (taux / 100);
    });
    const tvaMoyen = totalHt > 0 ? (totalTva / totalHt) * 100 : parseFloat(createForm.tvaTaux.replace(',', '.')) || 20;
    return { montantHt: totalHt, montantTva: totalTva, montantTtc: totalHt + totalTva, tvaTauxMoyen: tvaMoyen };
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createSubmittingRef.current) return;
    if (createForm.typeDocument !== 'facture') {
      setBientotMessage(`${createForm.typeDocument === 'devis' ? 'Devis' : createForm.typeDocument === 'proforma' ? 'Proforma' : 'Avoir'} — création disponible prochainement.`);
      setTimeout(() => setBientotMessage(null), 3000);
      return;
    }
    let montantHt: number;
    let tvaTaux: number;
    if (lignes.length > 0 && lignes.some((l) => (parseFloat(l.prixUnitaireHT.replace(',', '.')) || 0) > 0)) {
      const totaux = computeTotauxFromLignes();
      montantHt = Math.round(totaux.montantHt * 100) / 100;
      tvaTaux = Math.round(totaux.tvaTauxMoyen * 100) / 100;
    } else {
      montantHt = parseFloat(createForm.montantHt.replace(',', '.'));
      tvaTaux = parseFloat(createForm.tvaTaux.replace(',', '.')) || 20;
    }
    if (!createForm.clientFinalId || Number.isNaN(montantHt) || montantHt <= 0) {
      setError('Client obligatoire et au moins un montant HT (lignes ou montant global).');
      return;
    }
    createSubmittingRef.current = true;
    try {
      setCreating(true);
      setError(null);
      const parts: string[] = [];
      if (createForm.conditionsPaiement) {
        const lib = CONDITIONS_PAIEMENT_OPTIONS.find((o) => o.value === createForm.conditionsPaiement)?.label || createForm.conditionsPaiement;
        parts.push(`Paiement : ${lib}`);
      }
      if (createForm.reference) parts.push(`Réf. : ${createForm.reference}`);
      if (createForm.notes) parts.push(createForm.notes);
      if (createForm.description) parts.push(createForm.description);
      const description = parts.length > 0 ? parts.join('\n') : undefined;
      const dateEcheance = createForm.dateEcheance
        ? new Date(createForm.dateEcheance).toISOString()
        : new Date(new Date(createForm.dateFacture).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await apiClient.invoices.create({
        clientFinalId: createForm.clientFinalId,
        type: createForm.type,
        montantHt,
        tvaTaux,
        dateFacture: new Date(createForm.dateFacture).toISOString(),
        dateEcheance,
        description,
      });
      setShowCreateModal(false);
      resetCreateForm();
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setCreating(false);
      createSubmittingRef.current = false;
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setError(null);
              resetCreateForm();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium text-sm"
          >
            <PlusIcon className="h-5 w-5" />
            Créer une facture
          </button>
          <button
            type="button"
            title="Bientôt disponible"
            onClick={() => {
              setBientotMessage('Devis — bientôt disponible');
              setTimeout(() => setBientotMessage(null), 2500);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium text-sm border border-gray-600"
          >
            <DocumentTextIcon className="h-5 w-5" />
            Devis
          </button>
          <button
            type="button"
            title="Bientôt disponible"
            onClick={() => {
              setBientotMessage('Proforma — bientôt disponible');
              setTimeout(() => setBientotMessage(null), 2500);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium text-sm border border-gray-600"
          >
            <DocumentTextIcon className="h-5 w-5" />
            Proforma
          </button>
          <button
            type="button"
            title="Bientôt disponible"
            onClick={() => {
              setBientotMessage('Avoir — bientôt disponible');
              setTimeout(() => setBientotMessage(null), 2500);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium text-sm border border-gray-600"
          >
            <ReceiptRefundIcon className="h-5 w-5" />
            Avoir
          </button>
        </div>
      </div>

      {bientotMessage && (
        <div className="rounded-lg bg-gray-700 border border-gray-600 px-4 py-2 text-sm text-gray-300 animate-pulse">
          {bientotMessage}
        </div>
      )}

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
                    <td className="px-4 py-3 text-sm text-right text-white">{(Number(inv.montantTtc) || 0).toFixed(2)} €</td>
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

      {/* Modal Créer facture / devis / proforma / avoir */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] my-8 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <h2 className="text-lg font-semibold text-white">Nouveau document (facture, devis, proforma, avoir)</h2>
              <button type="button" onClick={() => !creating && setShowCreateModal(false)} className="p-1 rounded text-gray-400 hover:text-white">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-5 overflow-y-auto shrink min-h-0 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type de document *</label>
                  <select
                    value={createForm.typeDocument}
                    onChange={(e) => setCreateForm((f) => ({ ...f, typeDocument: e.target.value as 'facture' | 'devis' | 'proforma' | 'avoir' }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-amber-500"
                  >
                    {TYPE_DOCUMENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Type client</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value as 'facture_entreprise' | 'facture_client_final' }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-amber-500"
                  >
                    {TYPE_FACTURE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Client *</label>
                <select
                  required
                  value={createForm.clientFinalId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, clientFinalId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.raisonSociale || [c.prenom, c.nom].filter(Boolean).join(' ') || c.email}
                    </option>
                  ))}
                </select>
                {selectedClient && (
                  <div className="mt-2 rounded-lg bg-gray-700/50 border border-gray-600 p-3 text-sm text-gray-300 space-y-1">
                    <div><strong>Nom / Raison sociale :</strong> {selectedClient.raisonSociale || [selectedClient.prenom, selectedClient.nom].filter(Boolean).join(' ') || selectedClient.email}</div>
                    {selectedClient.adresse && <div><strong>Adresse :</strong> {selectedClient.adresse}</div>}
                    <div><strong>Email :</strong> {selectedClient.email}</div>
                    {selectedClient.telephone && <div><strong>Tél :</strong> {selectedClient.telephone}</div>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date d&apos;émission *</label>
                  <input
                    type="date"
                    required
                    value={createForm.dateFacture}
                    onChange={(e) => setCreateForm((f) => ({ ...f, dateFacture: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Date d&apos;échéance</label>
                  <input
                    type="date"
                    value={createForm.dateEcheance}
                    onChange={(e) => setCreateForm((f) => ({ ...f, dateEcheance: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Conditions de paiement</label>
                  <select
                    value={createForm.conditionsPaiement}
                    onChange={(e) => setCreateForm((f) => ({ ...f, conditionsPaiement: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-amber-500"
                  >
                    {CONDITIONS_PAIEMENT_OPTIONS.map((o) => (
                      <option key={o.value || 'vide'} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Référence (commande, bon…)</label>
                  <input
                    type="text"
                    value={createForm.reference}
                    onChange={(e) => setCreateForm((f) => ({ ...f, reference: e.target.value }))}
                    placeholder="Ex. BC-2024-001"
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">Lignes / Articles</label>
                  <button
                    type="button"
                    onClick={() => setLignes((prev) => [...prev, getDefaultLigne()])}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm"
                  >
                    <PlusIcon className="h-4 w-4" /> Ajouter une ligne
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-600">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-700/70 text-gray-300">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Désignation</th>
                        <th className="px-3 py-2 text-right w-20">Qté</th>
                        <th className="px-3 py-2 text-left w-24">Unité</th>
                        <th className="px-3 py-2 text-right w-28">Prix unit. HT</th>
                        <th className="px-3 py-2 text-right w-20">TVA %</th>
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
                              <input
                                type="text"
                                value={ligne.designation}
                                onChange={(e) => setLignes((prev) => prev.map((l) => (l.id === ligne.id ? { ...l, designation: e.target.value } : l)))}
                                placeholder="Désignation"
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white focus:ring-1 focus:ring-amber-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={ligne.quantite}
                                onChange={(e) => setLignes((prev) => prev.map((l) => (l.id === ligne.id ? { ...l, quantite: e.target.value } : l)))}
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white text-right focus:ring-1 focus:ring-amber-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={ligne.unite}
                                onChange={(e) => setLignes((prev) => prev.map((l) => (l.id === ligne.id ? { ...l, unite: e.target.value } : l)))}
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white focus:ring-1 focus:ring-amber-500"
                              >
                                {UNITES_OPTIONS.map((u) => (
                                  <option key={u || 'v'} value={u}>{u || '—'}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={ligne.prixUnitaireHT}
                                onChange={(e) => setLignes((prev) => prev.map((l) => (l.id === ligne.id ? { ...l, prixUnitaireHT: e.target.value } : l)))}
                                placeholder="0.00"
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white text-right focus:ring-1 focus:ring-amber-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={ligne.tauxTVA}
                                onChange={(e) => setLignes((prev) => prev.map((l) => (l.id === ligne.id ? { ...l, tauxTVA: e.target.value } : l)))}
                                className="w-full px-2 py-1.5 rounded bg-gray-700 border border-gray-600 text-white text-right focus:ring-1 focus:ring-amber-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-300 tabular-nums">{mtHt.toFixed(2)} €</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => setLignes((prev) => prev.filter((l) => l.id !== ligne.id))}
                                disabled={lignes.length <= 1}
                                className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 disabled:opacity-40"
                                title="Supprimer la ligne"
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
                  const tot = computeTotauxFromLignes();
                  return (
                    <div className="mt-2 flex justify-end gap-6 text-sm">
                      <span className="text-gray-400">Total HT : <strong className="text-white">{tot.montantHt.toFixed(2)} €</strong></span>
                      <span className="text-gray-400">TVA : <strong className="text-white">{tot.montantTva.toFixed(2)} €</strong></span>
                      <span className="text-gray-400">Total TTC : <strong className="text-amber-400">{tot.montantTtc.toFixed(2)} €</strong></span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Montant HT global (si pas de lignes)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={createForm.montantHt}
                    onChange={(e) => setCreateForm((f) => ({ ...f, montantHt: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Utilisé si les lignes ci-dessus sont vides</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">TVA % (si pas de lignes)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={createForm.tvaTaux}
                    onChange={(e) => setCreateForm((f) => ({ ...f, tvaTaux: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes / Mentions libres</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Conditions particulières, mentions légales…"
                  className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                <button type="button" onClick={() => !creating && setShowCreateModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600">
                  Annuler
                </button>
                <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium disabled:opacity-50">
                  {creating ? 'Création…' : createForm.typeDocument === 'facture' ? 'Créer la facture' : `Créer (${createForm.typeDocument})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
