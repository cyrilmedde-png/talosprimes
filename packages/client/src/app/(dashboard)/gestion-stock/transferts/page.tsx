'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  TruckIcon,
  PlusIcon,
  XMarkIcon,
  FunnelIcon,
  EyeIcon,
  CheckIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface StockTransfer {
  id: string;
  numero: string;
  siteFromId: string;
  siteToId: string;
  statut: string;
  dateCreation: string;
  dateEnvoi?: string | null;
  dateReception?: string | null;
  notes?: string | null;
  siteFrom: { code: string; designation: string };
  siteTo: { code: string; designation: string };
  lines: Array<{
    id: string;
    articleId: string;
    quantiteEnvoyee: number;
    quantiteRecue?: number | null;
    article: { code: string; designation: string };
  }>;
}

interface StockSite {
  id: string;
  code: string;
  designation: string;
}

const StatutBadge = ({ statut }: { statut: string }) => {
  const colors: Record<string, string> = {
    en_cours: 'bg-blue-900/40 text-blue-300 border border-blue-700',
    confirme: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
    recu: 'bg-green-900/40 text-green-300 border border-green-700',
    annule: 'bg-red-900/40 text-red-300 border border-red-700',
  };

  const labels: Record<string, string> = {
    en_cours: 'En cours',
    confirme: 'Confirmé',
    recu: 'Reçu',
    annule: 'Annulé',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[statut] || colors.en_cours}`}>
      {labels[statut] || statut}
    </span>
  );
};

export default function TransfertsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [sites, setSites] = useState<StockSite[]>([]);
  const [selectedStatut, setSelectedStatut] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [creatingTransfer, setCreatingTransfer] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(false);

  // Create modal state
  const [createForm, setCreateForm] = useState({
    siteFromId: '',
    siteToId: '',
    notes: '',
    lines: [{ articleId: '', quantite: 0 }],
  });

  // Auth check
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [transfersRes, sitesRes] = await Promise.all([
        apiClient.stockTransfers.list(),
        apiClient.stockSites.list(),
      ]);

      if (transfersRes.success && transfersRes.data) {
        setTransfers(transfersRes.data.transfers);
      }
      if (sitesRes.success && sitesRes.data) {
        setSites(sitesRes.data.sites);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (statut: string) => {
    setSelectedStatut(statut);
    try {
      setError(null);
      const res = await apiClient.stockTransfers.list(statut ? { statut } : undefined);
      if (res.success && res.data) {
        setTransfers(res.data.transfers);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to filter transfers');
    }
  };

  const handleCreateTransfer = async () => {
    if (!createForm.siteFromId || !createForm.siteToId) {
      setError('Please select both origin and destination sites');
      return;
    }

    const validLines = createForm.lines.filter(
      (line) => line.articleId.trim() && line.quantite > 0
    );

    if (validLines.length === 0) {
      setError('Please add at least one article');
      return;
    }

    try {
      setCreatingTransfer(true);
      setError(null);
      const res = await apiClient.stockTransfers.create({
        siteFromId: createForm.siteFromId,
        siteToId: createForm.siteToId,
        notes: createForm.notes || null,
        lines: validLines,
      });

      if (res.success) {
        setShowCreateModal(false);
        setCreateForm({
          siteFromId: '',
          siteToId: '',
          notes: '',
          lines: [{ articleId: '', quantite: 0 }],
        });
        await fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transfer');
    } finally {
      setCreatingTransfer(false);
    }
  };

  const handleConfirmTransfer = async (id: string) => {
    try {
      setConfirmingAction(true);
      setError(null);
      const res = await apiClient.stockTransfers.confirm(id);
      if (res.success) {
        await fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm transfer');
    } finally {
      setConfirmingAction(false);
    }
  };

  const handleReceiveTransfer = async (id: string) => {
    try {
      setConfirmingAction(true);
      setError(null);
      const res = await apiClient.stockTransfers.receive(id);
      if (res.success) {
        await fetchData();
        setShowDetailModal(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to receive transfer');
    } finally {
      setConfirmingAction(false);
    }
  };

  const addLine = () => {
    setCreateForm({
      ...createForm,
      lines: [...createForm.lines, { articleId: '', quantite: 0 }],
    });
  };

  const removeLine = (index: number) => {
    setCreateForm({
      ...createForm,
      lines: createForm.lines.filter((_, i) => i !== index),
    });
  };

  const updateLine = (
    index: number,
    field: 'articleId' | 'quantite',
    value: string | number
  ) => {
    const newLines = [...createForm.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setCreateForm({ ...createForm, lines: newLines });
  };

  const filteredTransfers = selectedStatut
    ? transfers.filter((t) => t.statut === selectedStatut)
    : transfers;

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TruckIcon className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold">Transferts inter-sites</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition"
          >
            <PlusIcon className="w-5 h-5" />
            Nouveau transfert
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/40 border border-red-700 rounded-lg flex items-center justify-between">
            <span className="text-red-200">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-300 hover:text-red-200"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex items-center gap-3">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select
            value={selectedStatut}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Tous les statuts</option>
            <option value="en_cours">En cours</option>
            <option value="confirme">Confirmé</option>
            <option value="recu">Reçu</option>
            <option value="annule">Annulé</option>
          </select>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Numéro
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Site Origine → Site Destination
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Date création
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Nb articles
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      Aucun transfert trouvé
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((transfer) => (
                    <tr
                      key={transfer.id}
                      className="border-b border-gray-700 hover:bg-gray-800/50 transition"
                    >
                      <td className="px-6 py-4 text-sm font-medium">{transfer.numero}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          {transfer.siteFrom.code}
                          <ArrowRightIcon className="w-4 h-4 text-gray-500" />
                          {transfer.siteTo.code}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatutBadge statut={transfer.statut} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {new Date(transfer.dateCreation).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {transfer.lines.length}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedTransfer(transfer);
                              setShowDetailModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 transition"
                            title="Voir détails"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          {transfer.statut === 'en_cours' && (
                            <button
                              onClick={() => handleConfirmTransfer(transfer.id)}
                              disabled={confirmingAction}
                              className="text-yellow-400 hover:text-yellow-300 transition disabled:opacity-50"
                              title="Confirmer envoi"
                            >
                              <CheckIcon className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <PlusIcon className="w-6 h-6" />
                Nouveau transfert
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Site From */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Site d'origine *
                </label>
                <select
                  value={createForm.siteFromId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, siteFromId: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Sélectionner un site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.code} - {site.designation}
                    </option>
                  ))}
                </select>
              </div>

              {/* Site To */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Site de destination *
                </label>
                <select
                  value={createForm.siteToId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, siteToId: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Sélectionner un site</option>
                  {sites
                    .filter((site) => site.id !== createForm.siteFromId)
                    .map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.code} - {site.designation}
                      </option>
                    ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, notes: e.target.value })
                  }
                  placeholder="Ajouter des notes..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 h-24"
                />
              </div>

              {/* Articles */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Articles à transférer *
                </label>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {createForm.lines.map((line, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Code article"
                        value={line.articleId}
                        onChange={(e) => updateLine(index, 'articleId', e.target.value)}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Quantité"
                        value={line.quantite || ''}
                        onChange={(e) => updateLine(index, 'quantite', parseInt(e.target.value) || 0)}
                        className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                      />
                      <button
                        onClick={() => removeLine(index)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addLine}
                  className="mt-3 flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition"
                >
                  <PlusIcon className="w-4 h-4" />
                  Ajouter un article
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-700 flex gap-3 justify-end sticky bottom-0 bg-gray-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateTransfer}
                disabled={creatingTransfer}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {creatingTransfer && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                Créer transfert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800">
              <h2 className="text-xl font-bold">
                Transfert {selectedTransfer.numero}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Site d'origine</p>
                  <p className="font-medium">
                    {selectedTransfer.siteFrom.code} -{' '}
                    {selectedTransfer.siteFrom.designation}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Site de destination</p>
                  <p className="font-medium">
                    {selectedTransfer.siteTo.code} -{' '}
                    {selectedTransfer.siteTo.designation}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Statut</p>
                  <StatutBadge statut={selectedTransfer.statut} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Date création</p>
                  <p className="font-medium">
                    {new Date(selectedTransfer.dateCreation).toLocaleDateString(
                      'fr-FR'
                    )}
                  </p>
                </div>
              </div>

              {selectedTransfer.notes && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Notes</p>
                  <p className="text-gray-300">{selectedTransfer.notes}</p>
                </div>
              )}

              {/* Lines Table */}
              <div>
                <h3 className="font-semibold mb-3">Articles</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left">Article</th>
                        <th className="px-4 py-2 text-left">Quantité envoyée</th>
                        {selectedTransfer.statut !== 'en_cours' && (
                          <th className="px-4 py-2 text-left">Quantité reçue</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTransfer.lines.map((line) => (
                        <tr key={line.id} className="border-t border-gray-700">
                          <td className="px-4 py-2">
                            {line.article.code} - {line.article.designation}
                          </td>
                          <td className="px-4 py-2">{line.quantiteEnvoyee}</td>
                          {selectedTransfer.statut !== 'en_cours' && (
                            <td className="px-4 py-2">
                              {line.quantiteRecue ?? '-'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-700 flex gap-3 justify-end sticky bottom-0 bg-gray-800">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Fermer
              </button>
              {selectedTransfer.statut === 'confirme' && (
                <button
                  onClick={() => handleReceiveTransfer(selectedTransfer.id)}
                  disabled={confirmingAction}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  {confirmingAction && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  Confirmer réception
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
