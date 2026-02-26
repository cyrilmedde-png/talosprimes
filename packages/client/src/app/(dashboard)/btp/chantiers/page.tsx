'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface Chantier {
  id: string;
  reference: string;
  nom: string;
  client: string;
  adresse: string;
  statut: 'planifie' | 'en_preparation' | 'en_cours' | 'suspendu' | 'termine' | 'cloture';
  montantMarche: number;
  tauxAvancement: number;
  dateDebut: string;
  dateFin: string;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

type StatusKey = 'planifie' | 'en_preparation' | 'en_cours' | 'suspendu' | 'termine' | 'cloture';

const statusColors: Record<StatusKey, string> = {
  planifie: 'bg-gray-500/20 text-gray-400',
  en_preparation: 'bg-blue-500/20 text-blue-400',
  en_cours: 'bg-green-500/20 text-green-400',
  suspendu: 'bg-yellow-500/20 text-yellow-400',
  termine: 'bg-purple-500/20 text-purple-400',
  cloture: 'bg-gray-500/20 text-gray-400',
};

const statusLabels: Record<StatusKey, string> = {
  planifie: 'Planifié',
  en_preparation: 'En préparation',
  en_cours: 'En cours',
  suspendu: 'Suspendu',
  termine: 'Terminé',
  cloture: 'Clôturé',
};

interface FormData {
  reference: string;
  nom: string;
  client: string;
  adresse: string;
  statut: StatusKey;
  montantMarche: number;
  tauxAvancement: number;
  dateDebut: string;
  dateFin: string;
  [key: string]: string | number | boolean | null;
}

const defaultFormData: FormData = {
  reference: '',
  nom: '',
  client: '',
  adresse: '',
  statut: 'planifie',
  montantMarche: 0,
  tauxAvancement: 0,
  dateDebut: '',
  dateFin: '',
};

export default function ChantiersPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [filteredChantiers, setFilteredChantiers] = useState<Chantier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusKey | 'all'>('all');
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    error: null,
  });
  const [showModal, setShowModal] = useState(false);
  const [editingChantier, setEditingChantier] = useState<Chantier | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchChantiers = async () => {
    try {
      setLoading({ isLoading: true, error: null });
      const response = await apiClient.btp.chantiers.list();
      const raw = response.data as unknown as { success: boolean; data: Chantier[] };
      setChantiers(raw.data);
      setFilteredChantiers(raw.data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load chantiers';
      setLoading({ isLoading: false, error: errorMessage });
    } finally {
      setLoading((prev) => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchChantiers();
  }, []);

  useEffect(() => {
    let filtered = chantiers;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.reference.toLowerCase().includes(query) ||
          c.nom.toLowerCase().includes(query) ||
          c.client.toLowerCase().includes(query) ||
          c.adresse.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((c) => c.statut === selectedStatus);
    }

    setFilteredChantiers(filtered);
  }, [searchQuery, selectedStatus, chantiers]);

  const handleOpenModal = (chantier: Chantier | null = null) => {
    if (chantier) {
      setEditingChantier(chantier);
      setFormData({
        reference: chantier.reference,
        nom: chantier.nom,
        client: chantier.client,
        adresse: chantier.adresse,
        statut: chantier.statut,
        montantMarche: chantier.montantMarche,
        tauxAvancement: chantier.tauxAvancement,
        dateDebut: chantier.dateDebut,
        dateFin: chantier.dateFin,
      });
    } else {
      setEditingChantier(null);
      setFormData(defaultFormData);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingChantier(null);
    setFormData(defaultFormData);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingChantier) {
        await apiClient.btp.chantiers.update(editingChantier.id, formData);
      } else {
        await apiClient.btp.chantiers.create(formData);
      }
      await fetchChantiers();
      handleCloseModal();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save chantier';
      setLoading((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this chantier?')) {
      try {
        setDeletingId(id);
        await apiClient.btp.chantiers.delete(id);
        await fetchChantiers();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete chantier';
        setLoading((prev) => ({ ...prev, error: errorMessage }));
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (loading.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  if (loading.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          <p>{loading.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Create Button */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Chantiers</h1>
          <p className="mt-2 text-sm text-gray-400">Gestion de tous les chantiers BTP</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Nouveau Chantier
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 rounded-lg bg-gray-800/20 border border-gray-700/30 p-4 backdrop-blur-md">
        {/* Search Bar */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par référence, nom, client ou adresse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 py-2 pl-10 pr-4"
          />
        </div>

        {/* Status Filter */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Statut</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Tous
            </button>
            {(Object.keys(statusLabels) as StatusKey[]).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selectedStatus === status
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chantiers Grid */}
      <div>
        <p className="mb-4 text-sm text-gray-400">
          {filteredChantiers.length} chantier(s) trouvé(s)
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChantiers.length > 0 ? (
            filteredChantiers.map((chantier) => (
              <div
                key={chantier.id}
                className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-6 shadow-lg hover:bg-gray-800/30 transition-colors backdrop-blur-md relative"
              >
                {/* Edit/Delete buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => handleOpenModal(chantier)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(chantier.id)}
                    disabled={deletingId === chantier.id}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === chantier.id ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                    ) : (
                      <TrashIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Reference and Status */}
                <div className="mb-4 flex items-start justify-between pr-20">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      {chantier.reference}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-white">
                      {chantier.nom}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      statusColors[chantier.statut]
                    }`}
                  >
                    {statusLabels[chantier.statut]}
                  </span>
                </div>

                {/* Client and Address */}
                <div className="mb-4 space-y-2 border-t border-gray-700/30 pt-4">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">Client:</span>{' '}
                    {chantier.client}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-white">Adresse:</span>{' '}
                    {chantier.adresse}
                  </p>
                </div>

                {/* Montant Marché */}
                <div className="mb-4 rounded-lg bg-indigo-500/20 p-3 border border-indigo-500/30">
                  <p className="text-xs font-medium text-gray-400">
                    Montant marché
                  </p>
                  <p className="mt-1 text-xl font-bold text-indigo-300">
                    {(chantier.montantMarche / 1000).toLocaleString('fr-FR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                    €k
                  </p>
                </div>

                {/* Taux Avancement */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-400">
                      Taux avancement
                    </p>
                    <span className="font-semibold text-white">
                      {chantier.tauxAvancement}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                      style={{ width: `${chantier.tauxAvancement}%` }}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="border-t border-gray-700/30 pt-4">
                  <p className="text-xs text-gray-500">
                    {chantier.dateDebut} au {chantier.dateFin}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-dashed border-gray-700/30 bg-gray-800/20 py-12 text-center backdrop-blur-md">
              <p className="text-gray-500">Aucun chantier trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingChantier ? 'Modifier Chantier' : 'Créer un Nouveau Chantier'}
              </h2>

              <div className="space-y-4">
                {/* Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Référence
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) =>
                      setFormData({ ...formData, reference: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) =>
                      setFormData({ ...formData, nom: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Client */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Client
                  </label>
                  <input
                    type="text"
                    value={formData.client}
                    onChange={(e) =>
                      setFormData({ ...formData, client: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Adresse */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) =>
                      setFormData({ ...formData, adresse: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Statut
                  </label>
                  <select
                    value={formData.statut}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        statut: e.target.value as StatusKey,
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {(Object.keys(statusLabels) as StatusKey[]).map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Montant Marché */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Montant Marché (€)
                  </label>
                  <input
                    type="number"
                    value={formData.montantMarche}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        montantMarche: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Taux Avancement */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Taux Avancement (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.tauxAvancement}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tauxAvancement: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Date Début */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Date Début
                  </label>
                  <input
                    type="date"
                    value={formData.dateDebut}
                    onChange={(e) =>
                      setFormData({ ...formData, dateDebut: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Date Fin */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Date Fin
                  </label>
                  <input
                    type="date"
                    value={formData.dateFin}
                    onChange={(e) =>
                      setFormData({ ...formData, dateFin: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
