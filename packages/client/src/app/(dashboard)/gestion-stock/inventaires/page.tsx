'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface StockSite {
  id: string;
  code: string;
  designation: string;
}

interface InventoryItem {
  id: string;
  articleId: string;
  quantiteSysteme: number;
  quantiteComptee?: number | null;
  ecart?: number | null;
  article: {
    code: string;
    designation: string;
    unite?: string | null;
  };
}

interface StockInventory {
  id: string;
  numero: string;
  siteId: string;
  dateDebut: string;
  dateFin?: string | null;
  statut: string;
  responsable?: string | null;
  ecartTotal: number;
  notes?: string | null;
  site: { code: string; designation: string };
  items?: InventoryItem[];
  _count?: { items: number };
}

const StatutBadge = ({ statut }: { statut: string }) => {
  const colors: Record<string, string> = {
    en_cours: 'bg-blue-900/40 text-blue-300 border border-blue-700',
    finalisee: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
    validee: 'bg-green-900/40 text-green-300 border border-green-700',
  };

  const labels: Record<string, string> = {
    en_cours: 'En cours',
    finalisee: 'Finalisée',
    validee: 'Validée',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[statut] || colors.en_cours}`}>
      {labels[statut] || statut}
    </span>
  );
};

export default function InventairesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inventories, setInventories] = useState<StockInventory[]>([]);
  const [sites, setSites] = useState<StockSite[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<StockInventory | null>(null);
  const [creatingInventory, setCreatingInventory] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [finalizingInventory, setFinalizingInventory] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // Create modal state
  const [createForm, setCreateForm] = useState({
    siteId: '',
    dateDebut: '',
    responsable: '',
    notes: '',
  });

  // Detail modal edit state
  const [editedItems, setEditedItems] = useState<
    Record<string, { quantiteComptee: number; notes: string }>
  >({});

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
      const [inventoriesRes, sitesRes] = await Promise.all([
        apiClient.stockInventories.list(),
        apiClient.stockSites.list(),
      ]);

      if (inventoriesRes.success && inventoriesRes.data) {
        setInventories(inventoriesRes.data.inventories);
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

  const handleCreateInventory = async () => {
    if (!createForm.siteId || !createForm.dateDebut) {
      setError('Please fill in required fields');
      return;
    }

    try {
      setCreatingInventory(true);
      setError(null);
      const res = await apiClient.stockInventories.create({
        siteId: createForm.siteId,
        dateDebut: createForm.dateDebut,
        responsable: createForm.responsable || null,
        notes: createForm.notes || null,
      });

      if (res.success) {
        setShowCreateModal(false);
        setCreateForm({
          siteId: '',
          dateDebut: '',
          responsable: '',
          notes: '',
        });
        await fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create inventory');
    } finally {
      setCreatingInventory(false);
    }
  };

  const handleOpenDetail = async (inventory: StockInventory) => {
    try {
      setError(null);
      const res = await apiClient.stockInventories.get(inventory.id);
      if (res.success && res.data) {
        setSelectedInventory(res.data.inventory);
        // Initialize edited items
        if (res.data.inventory.items) {
          const itemsMap: Record<string, { quantiteComptee: number; notes: string }> = {};
          res.data.inventory.items.forEach((item) => {
            itemsMap[item.id] = {
              quantiteComptee: item.quantiteComptee ?? 0,
              notes: '',
            };
          });
          setEditedItems(itemsMap);
        }
        setShowDetailModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory details');
    }
  };

  const handleSaveItems = async () => {
    if (!selectedInventory) return;

    const items = Object.entries(editedItems).map(([itemId, data]) => {
      const item = selectedInventory.items?.find((i) => i.id === itemId);
      return {
        articleId: item?.articleId || '',
        quantiteComptee: data.quantiteComptee,
        notes: data.notes || null,
      };
    });

    try {
      setSavingItems(true);
      setError(null);
      const res = await apiClient.stockInventories.updateItems(selectedInventory.id, {
        items,
      });

      if (res.success) {
        await fetchData();
        setShowDetailModal(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save items');
    } finally {
      setSavingItems(false);
    }
  };

  const handleFinalizeInventory = async () => {
    if (!selectedInventory) return;

    try {
      setFinalizingInventory(true);
      setError(null);
      const res = await apiClient.stockInventories.finalize(selectedInventory.id);

      if (res.success) {
        setShowFinalizeConfirm(false);
        await fetchData();
        setShowDetailModal(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finalize inventory');
    } finally {
      setFinalizingInventory(false);
    }
  };

  const updateItemField = (
    itemId: string,
    field: 'quantiteComptee' | 'notes',
    value: string | number
  ) => {
    setEditedItems({
      ...editedItems,
      [itemId]: {
        ...editedItems[itemId],
        [field]: value,
      },
    });
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <ClipboardDocumentListIcon className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold">Inventaires</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition"
          >
            <PlusIcon className="w-5 h-5" />
            Nouvel inventaire
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
                    Site
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Date début
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Date fin
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Responsable
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Écart total
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
                {inventories.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                      Aucun inventaire trouvé
                    </td>
                  </tr>
                ) : (
                  inventories.map((inventory) => (
                    <tr
                      key={inventory.id}
                      className="border-b border-gray-700 hover:bg-gray-800/50 transition"
                    >
                      <td className="px-6 py-4 text-sm font-medium">{inventory.numero}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {inventory.site.code}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <StatutBadge statut={inventory.statut} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {new Date(inventory.dateDebut).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {inventory.dateFin
                          ? new Date(inventory.dateFin).toLocaleDateString('fr-FR')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {inventory.responsable || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {inventory.ecartTotal}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {inventory._count?.items ?? 0}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleOpenDetail(inventory)}
                          className="text-blue-400 hover:text-blue-300 transition"
                          title="Voir détails"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
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
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <PlusIcon className="w-6 h-6" />
                Nouvel inventaire
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Site */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Site *
                </label>
                <select
                  value={createForm.siteId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, siteId: e.target.value })
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

              {/* Date Début */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date de début *
                </label>
                <input
                  type="date"
                  value={createForm.dateDebut}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, dateDebut: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Responsable */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Responsable
                </label>
                <input
                  type="text"
                  value={createForm.responsable}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, responsable: e.target.value })
                  }
                  placeholder="Nom du responsable"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
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
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateInventory}
                disabled={creatingInventory}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {creatingInventory && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Créer inventaire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedInventory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800">
              <h2 className="text-xl font-bold">
                Inventaire {selectedInventory.numero}
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Site</p>
                  <p className="font-medium">
                    {selectedInventory.site.code} -{' '}
                    {selectedInventory.site.designation}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Statut</p>
                  <StatutBadge statut={selectedInventory.statut} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Écart total</p>
                  <p className="font-medium">{selectedInventory.ecartTotal}</p>
                </div>
              </div>

              {selectedInventory.responsable && (
                <div>
                  <p className="text-sm text-gray-400">Responsable</p>
                  <p className="font-medium">{selectedInventory.responsable}</p>
                </div>
              )}

              {selectedInventory.notes && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Notes</p>
                  <p className="text-gray-300">{selectedInventory.notes}</p>
                </div>
              )}

              {/* Items Table */}
              {selectedInventory.items && selectedInventory.items.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Articles</h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left">Article</th>
                          <th className="px-4 py-2 text-left">Qté système</th>
                          <th className="px-4 py-2 text-left">Qté comptée</th>
                          <th className="px-4 py-2 text-left">Écart</th>
                          {selectedInventory.statut === 'en_cours' && (
                            <th className="px-4 py-2 text-left">Notes</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInventory.items.map((item) => (
                          <tr key={item.id} className="border-t border-gray-700">
                            <td className="px-4 py-2">
                              {item.article.code} - {item.article.designation}
                              {item.article.unite && (
                                <span className="text-gray-400 ml-1">
                                  ({item.article.unite})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2">{item.quantiteSysteme}</td>
                            <td className="px-4 py-2">
                              {selectedInventory.statut === 'en_cours' ? (
                                <input
                                  type="number"
                                  value={
                                    editedItems[item.id]?.quantiteComptee ?? ''
                                  }
                                  onChange={(e) =>
                                    updateItemField(
                                      item.id,
                                      'quantiteComptee',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                                />
                              ) : (
                                item.quantiteComptee ?? '-'
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {item.ecart ?? '-'}
                            </td>
                            {selectedInventory.statut === 'en_cours' && (
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={editedItems[item.id]?.notes ?? ''}
                                  onChange={(e) =>
                                    updateItemField(
                                      item.id,
                                      'notes',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Notes..."
                                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                                />
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-700 flex gap-3 justify-end sticky bottom-0 bg-gray-800">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Fermer
              </button>
              {selectedInventory.statut === 'en_cours' && (
                <>
                  <button
                    onClick={handleSaveItems}
                    disabled={savingItems}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingItems && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    Sauvegarder comptage
                  </button>
                  <button
                    onClick={() => setShowFinalizeConfirm(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2"
                  >
                    <CheckIcon className="w-5 h-5" />
                    Finaliser
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Finalize Confirmation Modal */}
      {showFinalizeConfirm && selectedInventory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full border border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Confirmer la finalisation</h2>
              <p className="text-gray-300 mb-6">
                Êtes-vous sûr de vouloir finaliser cet inventaire ? Cette action ne
                pourra pas être annulée.
              </p>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowFinalizeConfirm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                onClick={handleFinalizeInventory}
                disabled={finalizingInventory}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {finalizingInventory && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Finaliser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
