'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  DocumentTextIcon,
  PlusIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useDemoGuard } from '@/hooks/useDemoGuard';

type EcritureLigne = {
  id: string;
  numeroCompte: string;
  libelleCompte?: string;
  libelleLigne: string;
  debit: number;
  credit: number;
};

type Ecriture = {
  id: string;
  numero?: string;
  journalCode: string;
  dateEcriture: string;
  libelle: string;
  statut: string;
  totalDebit?: number;
  totalCredit?: number;
  lignes?: EcritureLigne[];
  createdAt?: string;
};

type ListResponse = {
  ecritures?: Ecriture[];
  total?: number;
  page?: number;
  totalPages?: number;
};

export default function EcrituresPage() {
  const [data, setData] = useState<ListResponse>({});
  const { isDemo, demoAlert } = useDemoGuard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ journalCode: '', statut: '', dateFrom: '', dateTo: '' });
  const [showModal, setShowModal] = useState(false);
  const [detailEcriture, setDetailEcriture] = useState<Ecriture | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Form state
  const [form, setForm] = useState({
    journalCode: 'VE',
    dateEcriture: new Date().toISOString().split('T')[0],
    libelle: '',
    lignes: [
      { numeroCompte: '', libelleLigne: '', debit: 0, credit: 0 },
      { numeroCompte: '', libelleLigne: '', debit: 0, credit: 0 },
    ],
  });

  const loadEcritures = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.comptabilite.ecritures.list({
        page,
        limit: 20,
        journalCode: filters.journalCode || undefined,
        statut: filters.statut || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Erreur de chargement';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { loadEcritures(); }, [loadEcritures]);

  const handleCreate = async () => {
    try {
      setError('');
      const totalDebit = form.lignes.reduce((s, l) => s + (l.debit || 0), 0);
      const totalCredit = form.lignes.reduce((s, l) => s + (l.credit || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        setError(`L'écriture n'est pas équilibrée : Débit=${totalDebit.toFixed(2)} ≠ Crédit=${totalCredit.toFixed(2)}`);
        return;
      }
      const res = await apiClient.comptabilite.ecritures.create({
        journalCode: form.journalCode,
        dateEcriture: form.dateEcriture,
        libelle: form.libelle,
        lignes: form.lignes.filter(l => l.numeroCompte),
      });
      if (res.success) {
        setSuccess('Écriture créée avec succès');
        setShowModal(false);
        setForm({
          journalCode: 'VE',
          dateEcriture: new Date().toISOString().split('T')[0],
          libelle: '',
          lignes: [
            { numeroCompte: '', libelleLigne: '', debit: 0, credit: 0 },
            { numeroCompte: '', libelleLigne: '', debit: 0, credit: 0 },
          ],
        });
        loadEcritures();
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Erreur de création';
      setError(errorMsg);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await apiClient.comptabilite.ecritures.get(id);
      if (res.success && res.data) {
        setDetailEcriture(res.data as unknown as Ecriture);
        setShowDetail(true);
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Erreur de chargement';
      setError(errorMsg);
    }
  };

  const addLigne = () => {
    setForm(f => ({ ...f, lignes: [...f.lignes, { numeroCompte: '', libelleLigne: '', debit: 0, credit: 0 }] }));
  };

  const updateLigne = (idx: number, field: string, value: unknown) => {
    setForm(f => ({
      ...f,
      lignes: f.lignes.map((l, i) => i === idx ? { ...l, [field]: value } : l),
    }));
  };

  const removeLigne = (idx: number) => {
    // demo-guard: removeLigne
    if (isDemo) { demoAlert(); return; }
    if (form.lignes.length <= 2) return;
    setForm(f => ({ ...f, lignes: f.lignes.filter((_, i) => i !== idx) }));
  };

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  const statutBadge = (s: string) => {
    const colors: Record<string, string> = {
      brouillon: 'bg-gray-600 text-gray-200',
      validee: 'bg-green-600/30 text-green-300',
      cloturee: 'bg-blue-600/30 text-blue-300',
    };
    return colors[s] || 'bg-gray-600 text-gray-200';
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="h-8 w-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Écritures comptables</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
        >
          <PlusIcon className="h-5 w-5" /> Nouvelle écriture
        </button>
      </div>

      {error && <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="mb-4 bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg">{success}</div>}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.journalCode}
          onChange={e => setFilters(f => ({ ...f, journalCode: e.target.value }))}
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tous les journaux</option>
          <option value="VE">Ventes (VE)</option>
          <option value="AC">Achats (AC)</option>
          <option value="BQ">Banque (BQ)</option>
          <option value="OD">Opérations Diverses (OD)</option>
          <option value="AN">À Nouveau (AN)</option>
        </select>
        <select
          value={filters.statut}
          onChange={e => setFilters(f => ({ ...f, statut: e.target.value }))}
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tous statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="validee">Validée</option>
          <option value="cloturee">Clôturée</option>
        </select>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          placeholder="Du"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          placeholder="Au"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : !data.ecritures?.length ? (
          <div className="p-8 text-center text-gray-400">Aucune écriture trouvée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700 bg-gray-800/80">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4">N°</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4">Date</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4">Journal</th>
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4">Libellé</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4">Débit</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4">Crédit</th>
                  <th className="text-center py-2 sm:py-3 px-2 sm:px-4">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.ecritures.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => handleViewDetail(e.id)}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                  >
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-white font-mono text-xs">{e.numero || e.id.slice(0, 8)}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-gray-300">{fmtDate(e.dateEcriture)}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4">
                      <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs font-mono">{e.journalCode}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-white">{e.libelle}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-green-400">{fmt(e.totalDebit || 0)}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-red-400">{fmt(e.totalCredit || 0)}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statutBadge(e.statut)}`}>{e.statut}</span>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {(data.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-gray-400 text-sm">{data.total} écriture(s) — Page {data.page}/{data.totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 text-white"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= (data.totalPages ?? 1)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 text-white"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full mx-2 sm:mx-0 max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Nouvelle écriture comptable</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Journal</label>
                <select
                  value={form.journalCode}
                  onChange={e => setForm(f => ({ ...f, journalCode: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2"
                >
                  <option value="VE">Ventes (VE)</option>
                  <option value="AC">Achats (AC)</option>
                  <option value="BQ">Banque (BQ)</option>
                  <option value="OD">Opérations Diverses (OD)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={form.dateEcriture}
                  onChange={e => setForm(f => ({ ...f, dateEcriture: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Libellé</label>
                <input
                  type="text"
                  value={form.libelle}
                  onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                  placeholder="Description de l'écriture"
                  className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <h3 className="text-white font-semibold mb-3">Lignes (partie double)</h3>
            <div className="space-y-2 mb-4">
              {form.lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={l.numeroCompte}
                    onChange={e => updateLigne(i, 'numeroCompte', e.target.value)}
                    placeholder="N° compte"
                    className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded px-2 py-1.5 text-sm font-mono"
                  />
                  <input
                    type="text"
                    value={l.libelleLigne}
                    onChange={e => updateLigne(i, 'libelleLigne', e.target.value)}
                    placeholder="Libellé ligne"
                    className="col-span-4 bg-gray-900 border border-gray-600 text-white rounded px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    value={l.debit || ''}
                    onChange={e => updateLigne(i, 'debit', parseFloat(e.target.value) || 0)}
                    placeholder="Débit"
                    className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded px-2 py-1.5 text-sm text-right"
                  />
                  <input
                    type="number"
                    value={l.credit || ''}
                    onChange={e => updateLigne(i, 'credit', parseFloat(e.target.value) || 0)}
                    placeholder="Crédit"
                    className="col-span-2 bg-gray-900 border border-gray-600 text-white rounded px-2 py-1.5 text-sm text-right"
                  />
                  <div className="col-span-2 flex gap-1">
                    {form.lignes.length > 2 && (
                      <button onClick={() => removeLigne(i)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-6">
              <button onClick={addLigne} className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1">
                <PlusIcon className="h-4 w-4" /> Ajouter une ligne
              </button>
              <div className="text-sm text-gray-400">
                Débit: <span className="text-green-400 font-mono">{fmt(form.lignes.reduce((s, l) => s + (l.debit || 0), 0))}</span>
                {' '}| Crédit: <span className="text-red-400 font-mono">{fmt(form.lignes.reduce((s, l) => s + (l.credit || 0), 0))}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Annuler</button>
              <button
                onClick={handleCreate}
                disabled={!form.libelle || form.lignes.filter(l => l.numeroCompte).length < 2}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg disabled:opacity-50"
              >
                Créer l&apos;écriture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {showDetail && detailEcriture && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full mx-2 sm:mx-0 max-w-2xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Écriture {detailEcriture.numero || detailEcriture.id.slice(0, 8)}</h2>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div><span className="text-gray-400">Journal :</span> <span className="text-white ml-2">{detailEcriture.journalCode}</span></div>
              <div><span className="text-gray-400">Date :</span> <span className="text-white ml-2">{fmtDate(detailEcriture.dateEcriture)}</span></div>
              <div><span className="text-gray-400">Libellé :</span> <span className="text-white ml-2">{detailEcriture.libelle}</span></div>
              <div><span className="text-gray-400">Statut :</span> <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${statutBadge(detailEcriture.statut)}`}>{detailEcriture.statut}</span></div>
            </div>
            {detailEcriture.lignes && detailEcriture.lignes.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 px-3">Compte</th>
                    <th className="text-left py-2 px-3">Libellé</th>
                    <th className="text-right py-2 px-3">Débit</th>
                    <th className="text-right py-2 px-3">Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {detailEcriture.lignes.map((l, i) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td className="py-2 px-3 text-white font-mono">{l.numeroCompte}</td>
                      <td className="py-2 px-3 text-gray-300">{l.libelleLigne || l.libelleCompte}</td>
                      <td className="py-2 px-3 text-right text-green-400">{l.debit ? fmt(l.debit) : ''}</td>
                      <td className="py-2 px-3 text-right text-red-400">{l.credit ? fmt(l.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-600 font-semibold">
                    <td colSpan={2} className="py-2 px-3 text-gray-400">Total</td>
                    <td className="py-2 px-3 text-right text-green-400">{fmt(detailEcriture.totalDebit || 0)}</td>
                    <td className="py-2 px-3 text-right text-red-400">{fmt(detailEcriture.totalCredit || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
