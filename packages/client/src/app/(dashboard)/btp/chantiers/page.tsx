'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
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

export default function ChantiersPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [filteredChantiers, setFilteredChantiers] = useState<Chantier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusKey | 'all'>('all');
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        setLoading({ isLoading: true, error: null });
        const response = await apiClient.btp.chantiers.list();
        const raw = response.data as unknown as { success: boolean; data: Chantier[] };
        const chantiersData = raw.data;
        setChantiers(chantiersData);
        setFilteredChantiers(chantiersData);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load chantiers';
        setLoading({ isLoading: false, error: errorMessage });
      } finally {
        setLoading({ isLoading: false, error: null });
      }
    };

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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Chantiers</h1>
        <p className="mt-2 text-sm text-gray-400">Gestion de tous les chantiers BTP</p>
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
                className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-6 shadow-lg hover:bg-gray-800/30 transition-colors backdrop-blur-md"
              >
                {/* Reference and Status */}
                <div className="mb-4 flex items-start justify-between">
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
    </div>
  );
}
