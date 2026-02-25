'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Projet {
  id: string;
  nom: string;
  description: string;
  client: string;
  statut: 'brouillon' | 'planifie' | 'en_cours' | 'en_pause' | 'termine' | 'annule';
  progression: number;
  budget: number;
  budgetUtilise: number;
  dateDebut: string;
  dateFin: string;
  tasksCount?: number;
}

const STATUT_COLORS: Record<Projet['statut'], { bg: string; text: string; badge: string }> = {
  brouillon: { bg: 'bg-gray-100', text: 'text-gray-700', badge: 'bg-gray-200 text-gray-800' },
  planifie: { bg: 'bg-blue-100', text: 'text-blue-700', badge: 'bg-blue-200 text-blue-800' },
  en_cours: { bg: 'bg-amber-100', text: 'text-amber-700', badge: 'bg-amber-200 text-amber-800' },
  en_pause: { bg: 'bg-orange-100', text: 'text-orange-700', badge: 'bg-orange-200 text-orange-800' },
  termine: { bg: 'bg-green-100', text: 'text-green-700', badge: 'bg-green-200 text-green-800' },
  annule: { bg: 'bg-red-100', text: 'text-red-700', badge: 'bg-red-200 text-red-800' },
};

const STATUT_LABELS: Record<Projet['statut'], string> = {
  brouillon: 'Brouillon',
  planifie: 'Planifié',
  en_cours: 'En Cours',
  en_pause: 'En Pause',
  termine: 'Terminé',
  annule: 'Annulé',
};

export default function ProjetsList() {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<Projet['statut'] | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjets = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.projets.list();
        setProjets(Array.isArray(response.data as unknown as Projet[]) ? (response.data as unknown as Projet[]) : []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProjets();
  }, []);

  const filteredProjets = projets.filter((projet) => {
    const matchesSearch =
      projet.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projet.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatut = selectedStatut === 'all' || projet.statut === selectedStatut;
    return matchesSearch && matchesStatut;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Projets</h1>
          <p className="text-gray-600 mt-2">Gérez tous vos projets en un seul endroit</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">Erreur: {error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Chercher un projet ou client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Statut Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value as Projet['statut'] | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="brouillon">Brouillon</option>
                <option value="planifie">Planifié</option>
                <option value="en_cours">En Cours</option>
                <option value="en_pause">En Pause</option>
                <option value="termine">Terminé</option>
                <option value="annule">Annulé</option>
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
            <span className="ml-3 text-gray-600">Chargement des projets...</span>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600">
              {filteredProjets.length} projet{filteredProjets.length !== 1 ? 's' : ''} trouvé
              {filteredProjets.length !== 1 ? 's' : ''}
            </div>

            {/* Projects Grid */}
            {filteredProjets.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">Aucun projet ne correspond à vos critères</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjets.map((projet) => {
                  const colors = STATUT_COLORS[projet.statut];
                  const isExpanded = expandedId === projet.id;

                  return (
                    <div
                      key={projet.id}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                    >
                      {/* Card Header */}
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg">{projet.nom}</h3>
                            <p className="text-sm text-gray-600 mt-1">{projet.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.badge}`}>
                            {STATUT_LABELS[projet.statut]}
                          </span>
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <UserGroupIcon className="w-4 h-4" />
                            {projet.client}
                          </span>
                        </div>

                        {/* Progression Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-600">Progression</span>
                            <span className="text-xs font-semibold text-gray-900">{projet.progression}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors.bg}`}
                              style={{ width: `${projet.progression}%` }}
                            />
                          </div>
                        </div>

                        {/* Budget Info */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 flex items-center gap-1">
                            <CurrencyEuroIcon className="w-4 h-4" />
                            Budget
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(projet.budgetUtilise)} / {formatCurrency(projet.budget)}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {formatDate(projet.dateDebut)}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {formatDate(projet.dateFin)}
                          </span>
                        </div>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : projet.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ChevronDownIcon
                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-6 py-4 bg-blue-50 border-t border-gray-200">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tâches:</span>
                              <span className="font-semibold text-gray-900">{projet.tasksCount || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Utilisation du budget:</span>
                              <span className="font-semibold text-gray-900">
                                {((projet.budgetUtilise / projet.budget) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
