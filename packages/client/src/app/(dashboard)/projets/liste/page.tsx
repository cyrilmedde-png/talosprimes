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
  PencilIcon,
  TrashIcon,
  PlusIcon,
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
  brouillon: { bg: 'bg-gray-600', text: 'text-gray-300', badge: 'bg-gray-500/20 text-gray-300' },
  planifie: { bg: 'bg-blue-600', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-300' },
  en_cours: { bg: 'bg-amber-600', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300' },
  en_pause: { bg: 'bg-orange-600', text: 'text-orange-300', badge: 'bg-orange-500/20 text-orange-300' },
  termine: { bg: 'bg-green-600', text: 'text-green-300', badge: 'bg-green-500/20 text-green-300' },
  annule: { bg: 'bg-red-600', text: 'text-red-300', badge: 'bg-red-500/20 text-red-300' },
};

const STATUT_LABELS: Record<Projet['statut'], string> = {
  brouillon: 'Brouillon',
  planifie: 'Planifié',
  en_cours: 'En Cours',
  en_pause: 'En Pause',
  termine: 'Terminé',
  annule: 'Annulé',
};

interface ProjetFormData {
  nom: string;
  description: string;
  client: string;
  statut: Projet['statut'];
  budget: number;
  dateDebut: string;
  dateFin: string;
  [key: string]: string | number | boolean | null;
}

export default function ProjetsList() {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatut, setSelectedStatut] = useState<Projet['statut'] | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProjet, setEditingProjet] = useState<Projet | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjetFormData>({
    nom: '',
    description: '',
    client: '',
    statut: 'brouillon' as Projet['statut'],
    budget: 0,
    dateDebut: '',
    dateFin: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.projets.list();
      const raw = response.data as unknown as { success: boolean; data: Projet[] };
      setProjets(raw.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  const openCreateModal = () => {
    setEditingProjet(null);
    setFormData({
      nom: '',
      description: '',
      client: '',
      statut: 'brouillon',
      budget: 0,
      dateDebut: '',
      dateFin: '',
    });
    setShowModal(true);
  };

  const openEditModal = (projet: Projet) => {
    setEditingProjet(projet);
    setFormData({
      nom: projet.nom,
      description: projet.description,
      client: projet.client,
      statut: projet.statut,
      budget: projet.budget,
      dateDebut: projet.dateDebut,
      dateFin: projet.dateFin,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      if (editingProjet) {
        await apiClient.projets.update(editingProjet.id, formData);
      } else {
        await apiClient.projets.create(formData);
      }
      setShowModal(false);
      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save project';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      setError(null);
      await apiClient.projets.delete(id);
      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Projets</h1>
            <p className="mt-2 text-sm text-gray-400">Gérez tous vos projets en un seul endroit</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Nouveau Projet
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
            <p>Erreur: {error}</p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Chercher un projet ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Statut Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value as Projet['statut'] | 'all')}
              className="px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

        {/* Loading State */}
        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-400">
              {filteredProjets.length} projet{filteredProjets.length !== 1 ? 's' : ''} trouvé
              {filteredProjets.length !== 1 ? 's' : ''}
            </div>

            {/* Projects Grid */}
            {filteredProjets.length === 0 ? (
              <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-8 text-center backdrop-blur-md">
                <p className="text-gray-500">Aucun projet ne correspond à vos critères</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjets.map((projet) => {
                  const colors = STATUT_COLORS[projet.statut];
                  const isExpanded = expandedId === projet.id;

                  return (
                    <div
                      key={projet.id}
                      className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg overflow-hidden backdrop-blur-md hover:border-gray-600/50 transition-colors"
                    >
                      {/* Card Header */}
                      <div className="p-6 border-b border-gray-700/30">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white text-lg">{projet.nom}</h3>
                            <p className="text-sm text-gray-400 mt-1">{projet.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.badge}`}>
                            {STATUT_LABELS[projet.statut]}
                          </span>
                          <span className="text-sm text-gray-400 flex items-center gap-1">
                            <UserGroupIcon className="w-4 h-4" />
                            {projet.client}
                          </span>
                        </div>

                        {/* Progression Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-400">Progression</span>
                            <span className="text-xs font-semibold text-white">{projet.progression}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors.bg}`}
                              style={{ width: `${projet.progression}%` }}
                            />
                          </div>
                        </div>

                        {/* Budget Info */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400 flex items-center gap-1">
                            <CurrencyEuroIcon className="w-4 h-4" />
                            Budget
                          </span>
                          <span className="font-semibold text-white">
                            {formatCurrency(projet.budgetUtilise)} / {formatCurrency(projet.budget)}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="px-6 py-4 bg-gray-700/20 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {formatDate(projet.dateDebut)}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {formatDate(projet.dateFin)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(projet)}
                            className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                            title="Modifier"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
                                handleDelete(projet.id);
                              }
                            }}
                            disabled={deletingId === projet.id}
                            className="text-red-400 hover:text-red-300 transition-colors p-1 disabled:opacity-50"
                            title="Supprimer"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : projet.id)}
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            <ChevronDownIcon
                              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-6 py-4 bg-indigo-500/10 border-t border-gray-700/30">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Tâches:</span>
                              <span className="font-semibold text-white">{projet.tasksCount || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Utilisation du budget:</span>
                              <span className="font-semibold text-white">
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingProjet ? 'Modifier Projet' : 'Créer Projet'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nom</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nom du projet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Description du projet"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Client</label>
                  <input
                    type="text"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nom du client"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Statut</label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as Projet['statut'] })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="brouillon">Brouillon</option>
                    <option value="planifie">Planifié</option>
                    <option value="en_cours">En Cours</option>
                    <option value="en_pause">En Pause</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Budget (€)</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Date Début</label>
                  <input
                    type="date"
                    value={formData.dateDebut}
                    onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Date Fin</label>
                  <input
                    type="date"
                    value={formData.dateFin}
                    onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
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
