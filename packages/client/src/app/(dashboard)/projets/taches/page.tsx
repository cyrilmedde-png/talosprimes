'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  FunnelIcon,
  CalendarIcon,
  ClockIcon,
  UserCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Tache {
  id: string;
  titre: string;
  projet: string;
  assigneA: string;
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
  statut: 'a_faire' | 'en_cours' | 'en_revue' | 'terminee';
  echeance: string;
  heures: number;
}

const PRIORITE_COLORS: Record<Tache['priorite'], { bg: string; text: string; badge: string }> = {
  urgente: { bg: 'bg-red-600', text: 'text-red-300', badge: 'bg-red-500/20 text-red-400' },
  haute: { bg: 'bg-orange-600', text: 'text-orange-300', badge: 'bg-orange-500/20 text-orange-400' },
  normale: { bg: 'bg-blue-600', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-400' },
  basse: { bg: 'bg-gray-600', text: 'text-gray-300', badge: 'bg-gray-500/20 text-gray-400' },
};

const PRIORITE_LABELS: Record<Tache['priorite'], string> = {
  urgente: 'Urgente',
  haute: 'Haute',
  normale: 'Normale',
  basse: 'Basse',
};

const STATUT_COLORS: Record<Tache['statut'], { bg: string; text: string; badge: string }> = {
  a_faire: { bg: 'bg-gray-600', text: 'text-gray-300', badge: 'bg-gray-500/20 text-gray-400' },
  en_cours: { bg: 'bg-blue-600', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-400' },
  en_revue: { bg: 'bg-amber-600', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-400' },
  terminee: { bg: 'bg-green-600', text: 'text-green-300', badge: 'bg-green-500/20 text-green-400' },
};

const STATUT_LABELS: Record<Tache['statut'], string> = {
  a_faire: 'À Faire',
  en_cours: 'En Cours',
  en_revue: 'En Revue',
  terminee: 'Terminée',
};

export default function TachesPage() {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatut, setSelectedStatut] = useState<Tache['statut'] | 'all'>('all');
  const [selectedPriorite, setSelectedPriorite] = useState<Tache['priorite'] | 'all'>('all');

  useEffect(() => {
    const fetchTaches = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.projets.taches.list('');
        const raw = response.data as unknown as { success?: boolean; data?: Tache[] };
        const tachesData = Array.isArray(raw?.data) ? raw.data : [];
        setTaches(tachesData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tasks';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTaches();
  }, []);

  const filteredTaches = taches.filter((tache) => {
    const matchesStatut = selectedStatut === 'all' || tache.statut === selectedStatut;
    const matchesPriorite = selectedPriorite === 'all' || tache.priorite === selectedPriorite;
    return matchesStatut && matchesPriorite;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const isOverdue = (echeance: string) => {
    return new Date(echeance) < new Date();
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Tâches</h1>
          <p className="mt-2 text-sm text-gray-400">Gérez toutes les tâches de vos projets</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
            <p>Erreur: {error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-start">
          <FunnelIcon className="w-5 h-5 text-gray-400 hidden sm:block mt-6" />

          {/* Statut Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">Statut</label>
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value as Tache['statut'] | 'all')}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="a_faire">À Faire</option>
              <option value="en_cours">En Cours</option>
              <option value="en_revue">En Revue</option>
              <option value="terminee">Terminée</option>
            </select>
          </div>

          {/* Priorité Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">Priorité</label>
            <select
              value={selectedPriorite}
              onChange={(e) => setSelectedPriorite(e.target.value as Tache['priorite'] | 'all')}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Toutes les priorités</option>
              <option value="urgente">Urgente</option>
              <option value="haute">Haute</option>
              <option value="normale">Normale</option>
              <option value="basse">Basse</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-400">
              {filteredTaches.length} tâche{filteredTaches.length !== 1 ? 's' : ''} trouvée
              {filteredTaches.length !== 1 ? 's' : ''}
            </div>

            {/* Tasks Table */}
            {filteredTaches.length === 0 ? (
              <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-8 text-center backdrop-blur-md">
                <p className="text-gray-500">Aucune tâche ne correspond à vos critères</p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Projet
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Titre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Assigné à
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Priorité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Échéance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Heures
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredTaches.map((tache) => {
                        const prioriteColors = PRIORITE_COLORS[tache.priorite];
                        const statutColors = STATUT_COLORS[tache.statut];
                        const overdue = isOverdue(tache.echeance);

                        return (
                          <tr
                            key={tache.id}
                            className="hover:bg-gray-700/50 transition-colors"
                          >
                            {/* Projet */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                              {tache.projet}
                            </td>

                            {/* Titre */}
                            <td className="px-6 py-4 text-sm text-gray-300 max-w-xs">
                              <div className="flex items-center gap-2">
                                {tache.statut === 'terminee' && (
                                  <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
                                )}
                                <span className={tache.statut === 'terminee' ? 'line-through' : ''}>
                                  {tache.titre}
                                </span>
                              </div>
                            </td>

                            {/* Assigné à */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="flex items-center gap-2">
                                <UserCircleIcon className="w-5 h-5 text-gray-400" />
                                {tache.assigneA}
                              </div>
                            </td>

                            {/* Priorité */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${prioriteColors.badge}`}>
                                {PRIORITE_LABELS[tache.priorite]}
                              </span>
                            </td>

                            {/* Statut */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statutColors.badge}`}>
                                {STATUT_LABELS[tache.statut]}
                              </span>
                            </td>

                            {/* Échéance */}
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm ${overdue ? 'text-red-400 font-semibold' : 'text-gray-300'}`}
                            >
                              <div className="flex items-center gap-2">
                                <CalendarIcon className={`w-4 h-4 ${overdue ? 'text-red-400' : 'text-gray-400'}`} />
                                {formatDate(tache.echeance)}
                                {overdue && <span className="text-xs font-semibold">(Dépassée)</span>}
                              </div>
                            </td>

                            {/* Heures */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-gray-400" />
                                {tache.heures}h
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
