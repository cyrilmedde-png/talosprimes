'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  FunnelIcon,
  CalendarIcon,
  ClockIcon,
  UserCircleIcon,
  CheckCircleIcon,
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

interface TacheFormData {
  titre: string;
  projetId: string;
  assigneA: string;
  priorite: Tache['priorite'];
  statut: Tache['statut'];
  echeance: string;
  heures: number;
  [key: string]: string | number | boolean | null;
}

export default function TachesPage() {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [selectedProjetId, setSelectedProjetId] = useState<string>('');
  const [taches, setTaches] = useState<Tache[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatut, setSelectedStatut] = useState<Tache['statut'] | 'all'>('all');
  const [selectedPriorite, setSelectedPriorite] = useState<Tache['priorite'] | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTache, setEditingTache] = useState<Tache | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TacheFormData>({
    titre: '',
    projetId: '',
    assigneA: '',
    priorite: 'normale' as Tache['priorite'],
    statut: 'a_faire' as Tache['statut'],
    echeance: '',
    heures: 0,
  });

  const fetchProjets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.projets.list();
      const raw = response.data as unknown as { success: boolean; data: Projet[] };
      setProjets(raw.data);
      if (raw.data.length > 0) {
        setSelectedProjetId(raw.data[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaches = async (projetId: string) => {
    if (!projetId) return;
    try {
      setError(null);
      const response = await apiClient.projets.taches.list(projetId);
      const raw = response.data as unknown as { success: boolean; data: Tache[] };
      setTaches(raw.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(errorMessage);
    }
  };

  useEffect(() => {
    fetchProjets();
  }, []);

  useEffect(() => {
    if (selectedProjetId) {
      fetchTaches(selectedProjetId);
    }
  }, [selectedProjetId]);

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

  const openCreateModal = () => {
    setEditingTache(null);
    setFormData({
      titre: '',
      projetId: selectedProjetId,
      assigneA: '',
      priorite: 'normale',
      statut: 'a_faire',
      echeance: '',
      heures: 0,
    });
    setShowModal(true);
  };

  const openEditModal = (tache: Tache) => {
    setEditingTache(tache);
    setFormData({
      titre: tache.titre,
      projetId: selectedProjetId,
      assigneA: tache.assigneA,
      priorite: tache.priorite,
      statut: tache.statut,
      echeance: tache.echeance,
      heures: tache.heures,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      if (editingTache) {
        await apiClient.projets.taches.update(editingTache.id, formData);
      } else {
        await apiClient.projets.taches.create(selectedProjetId, formData);
      }
      setShowModal(false);
      await fetchTaches(selectedProjetId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save task';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      setError(null);
      await apiClient.projets.taches.delete(id);
      await fetchTaches(selectedProjetId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
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
            <h1 className="text-3xl font-bold text-white">Tâches</h1>
            <p className="mt-2 text-sm text-gray-400">Gérez toutes les tâches de vos projets</p>
          </div>
          {selectedProjetId && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Nouvelle Tâche
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
            <p>Erreur: {error}</p>
          </div>
        )}

        {/* Project Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">Sélectionner un Projet</label>
          <select
            value={selectedProjetId}
            onChange={(e) => setSelectedProjetId(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Aucun projet sélectionné --</option>
            {projets.map((projet) => (
              <option key={projet.id} value={projet.id}>
                {projet.nom}
              </option>
            ))}
          </select>
        </div>

        {/* Filters */}
        {selectedProjetId && (
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
        )}

        {/* Loading State */}
        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {!selectedProjetId ? (
              <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-8 text-center backdrop-blur-md">
                <p className="text-gray-500">Veuillez sélectionner un projet pour afficher les tâches</p>
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Actions
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

                                {/* Actions */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => openEditModal(tache)}
                                      className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                                      title="Modifier"
                                    >
                                      <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
                                          handleDelete(tache.id);
                                        }
                                      }}
                                      disabled={deletingId === tache.id}
                                      className="text-red-400 hover:text-red-300 transition-colors p-1 disabled:opacity-50"
                                      title="Supprimer"
                                    >
                                      <TrashIcon className="w-5 h-5" />
                                    </button>
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
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingTache ? 'Modifier Tâche' : 'Créer Tâche'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Titre</label>
                  <input
                    type="text"
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Titre de la tâche"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Assigné à</label>
                  <input
                    type="text"
                    value={formData.assigneA}
                    onChange={(e) => setFormData({ ...formData, assigneA: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nom de la personne"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Priorité</label>
                  <select
                    value={formData.priorite}
                    onChange={(e) => setFormData({ ...formData, priorite: e.target.value as Tache['priorite'] })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Statut</label>
                  <select
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value as Tache['statut'] })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="a_faire">À Faire</option>
                    <option value="en_cours">En Cours</option>
                    <option value="en_revue">En Revue</option>
                    <option value="terminee">Terminée</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={formData.echeance}
                    onChange={(e) => setFormData({ ...formData, echeance: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Heures</label>
                  <input
                    type="number"
                    value={formData.heures}
                    onChange={(e) => setFormData({ ...formData, heures: parseFloat(e.target.value) })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                    min="0"
                    step="0.5"
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
