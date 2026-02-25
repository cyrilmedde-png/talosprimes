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
  urgente: { bg: 'bg-red-100', text: 'text-red-700', badge: 'bg-red-200 text-red-800' },
  haute: { bg: 'bg-orange-100', text: 'text-orange-700', badge: 'bg-orange-200 text-orange-800' },
  normale: { bg: 'bg-blue-100', text: 'text-blue-700', badge: 'bg-blue-200 text-blue-800' },
  basse: { bg: 'bg-gray-100', text: 'text-gray-700', badge: 'bg-gray-200 text-gray-800' },
};

const PRIORITE_LABELS: Record<Tache['priorite'], string> = {
  urgente: 'Urgente',
  haute: 'Haute',
  normale: 'Normale',
  basse: 'Basse',
};

const STATUT_COLORS: Record<Tache['statut'], { bg: string; text: string; badge: string }> = {
  a_faire: { bg: 'bg-gray-100', text: 'text-gray-700', badge: 'bg-gray-200 text-gray-800' },
  en_cours: { bg: 'bg-blue-100', text: 'text-blue-700', badge: 'bg-blue-200 text-blue-800' },
  en_revue: { bg: 'bg-amber-100', text: 'text-amber-700', badge: 'bg-amber-200 text-amber-800' },
  terminee: { bg: 'bg-green-100', text: 'text-green-700', badge: 'bg-green-200 text-green-800' },
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
        setTaches(Array.isArray(response.data as unknown as Tache[]) ? (response.data as unknown as Tache[]) : []);
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tâches</h1>
          <p className="text-gray-600 mt-2">Gérez toutes les tâches de vos projets</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">Erreur: {error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <FunnelIcon className="w-5 h-5 text-gray-400 hidden md:block" />

            {/* Statut Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value as Tache['statut'] | 'all')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
              <select
                value={selectedPriorite}
                onChange={(e) => setSelectedPriorite(e.target.value as Tache['priorite'] | 'all')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="all">Toutes les priorités</option>
                <option value="urgente">Urgente</option>
                <option value="haute">Haute</option>
                <option value="normale">Normale</option>
                <option value="basse">Basse</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-spin" />
            </div>
            <span className="ml-3 text-gray-600">Chargement des tâches...</span>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600">
              {filteredTaches.length} tâche{filteredTaches.length !== 1 ? 's' : ''} trouvée
              {filteredTaches.length !== 1 ? 's' : ''}
            </div>

            {/* Tasks Table */}
            {filteredTaches.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">Aucune tâche ne correspond à vos critères</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Projet
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Titre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Assigné à
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Priorité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Échéance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Heures
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTaches.map((tache) => {
                        const prioriteColors = PRIORITE_COLORS[tache.priorite];
                        const statutColors = STATUT_COLORS[tache.statut];
                        const overdue = isOverdue(tache.echeance);

                        return (
                          <tr
                            key={tache.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            {/* Projet */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {tache.projet}
                            </td>

                            {/* Titre */}
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                              <div className="flex items-center gap-2">
                                {tache.statut === 'terminee' && (
                                  <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                                )}
                                <span className={tache.statut === 'terminee' ? 'line-through' : ''}>
                                  {tache.titre}
                                </span>
                              </div>
                            </td>

                            {/* Assigné à */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
                              className={`px-6 py-4 whitespace-nowrap text-sm ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}
                            >
                              <div className="flex items-center gap-2">
                                <CalendarIcon className={`w-4 h-4 ${overdue ? 'text-red-600' : 'text-gray-400'}`} />
                                {formatDate(tache.echeance)}
                                {overdue && <span className="text-xs font-semibold">(Dépassée)</span>}
                              </div>
                            </td>

                            {/* Heures */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
