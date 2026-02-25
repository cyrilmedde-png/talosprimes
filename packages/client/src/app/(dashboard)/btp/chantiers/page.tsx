'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
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
  planifie: 'bg-gray-100 text-gray-800',
  en_preparation: 'bg-blue-100 text-blue-800',
  en_cours: 'bg-green-100 text-green-800',
  suspendu: 'bg-yellow-100 text-yellow-800',
  termine: 'bg-purple-100 text-purple-800',
  cloture: 'bg-gray-100 text-gray-800',
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
        setChantiers(response.data as unknown as Chantier[]);
        setFilteredChantiers(response.data as unknown as Chantier[]);
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
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
        </div>
      </div>
    );
  }

  if (loading.error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{loading.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Chantiers</h1>
        <p className="mt-2 text-gray-600">Gestion de tous les chantiers BTP</p>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par référence, nom, client ou adresse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Statut</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <p className="mb-4 text-sm text-gray-600">
          {filteredChantiers.length} chantier(s) trouvé(s)
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChantiers.length > 0 ? (
            filteredChantiers.map((chantier) => (
              <div
                key={chantier.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Reference and Status */}
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      {chantier.reference}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-gray-900">
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
                <div className="mb-4 space-y-2 border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Client:</span>{' '}
                    {chantier.client}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Adresse:</span>{' '}
                    {chantier.adresse}
                  </p>
                </div>

                {/* Montant Marché */}
                <div className="mb-4 rounded-lg bg-blue-50 p-3">
                  <p className="text-xs font-medium text-gray-600">
                    Montant marché
                  </p>
                  <p className="mt-1 text-xl font-bold text-blue-900">
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
                    <p className="text-xs font-medium text-gray-600">
                      Taux avancement
                    </p>
                    <span className="font-semibold text-gray-900">
                      {chantier.tauxAvancement}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{ width: `${chantier.tauxAvancement}%` }}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-500">
                    {chantier.dateDebut} au {chantier.dateFin}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
              <p className="text-gray-600">Aucun chantier trouvé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
