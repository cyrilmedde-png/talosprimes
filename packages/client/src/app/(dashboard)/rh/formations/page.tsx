'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  UserPlusIcon,
  CalendarIcon,
  CurrencyEuroIcon,
} from '@heroicons/react/24/outline';

interface Formation {
  id: string;
  tenantId: string;
  titre: string;
  description: string;
  formateur: string;
  dateDebut: string;
  dateFin: string;
  cout: number;
  maxParticipants: number;
  participantsInscrits: number;
  statut: 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
  createdAt: string;
}

interface FormationFormData {
  titre: string;
  description: string;
  formateur: string;
  dateDebut: string;
  dateFin: string;
  cout: number;
  maxParticipants: number;
  [key: string]: string | number | boolean | null;
}

export default function FormationsPage() {
  const router = useRouter();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInscriptionModal, setShowInscriptionModal] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [selectedMembreId, setSelectedMembreId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormationFormData>({
    titre: '',
    description: '',
    formateur: '',
    dateDebut: '',
    dateFin: '',
    cout: 0,
    maxParticipants: 10,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadFormations();
  }, [router]);

  const loadFormations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.rh.formations.list();
      const raw = response.data as unknown as { success: boolean; data: Formation[] };
      setFormations(Array.isArray(raw.data) ? raw.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      if (err instanceof Error && err.message.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.titre || !formData.formateur || !formData.dateDebut || !formData.dateFin) {
        setError('Veuillez remplir tous les champs obligatoires');
        return;
      }

      setIsSubmitting(true);
      await apiClient.rh.formations.create(formData);
      setShowCreateModal(false);
      setFormData({
        titre: '',
        description: '',
        formateur: '',
        dateDebut: '',
        dateFin: '',
        cout: 0,
        maxParticipants: 10,
      });
      await loadFormations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (formation: Formation) => {
    setSelectedFormation(formation);
    setFormData({
      titre: formation.titre,
      description: formation.description,
      formateur: formation.formateur,
      dateDebut: formation.dateDebut,
      dateFin: formation.dateFin,
      cout: formation.cout,
      maxParticipants: formation.maxParticipants,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedFormation) return;
    try {
      if (!formData.titre || !formData.formateur || !formData.dateDebut || !formData.dateFin) {
        setError('Veuillez remplir tous les champs obligatoires');
        return;
      }

      setIsSubmitting(true);
      await apiClient.rh.formations.update(selectedFormation.id, formData);
      setShowEditModal(false);
      setSelectedFormation(null);
      await loadFormations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) return;
    try {
      await apiClient.rh.formations.delete(id);
      await loadFormations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleOpenInscription = (formation: Formation) => {
    setSelectedFormation(formation);
    setSelectedMembreId('');
    setShowInscriptionModal(true);
  };

  const handleInscrire = async () => {
    if (!selectedFormation || !selectedMembreId) {
      setError('Veuillez sélectionner un membre');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.rh.formations.inscrire(selectedFormation.id, { membreId: selectedMembreId });
      setShowInscriptionModal(false);
      setSelectedMembreId('');
      setSelectedFormation(null);
      await loadFormations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFormations = formations.filter(formation => {
    const matchesSearch =
      formation.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formation.formateur.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatut = !statutFilter || formation.statut === statutFilter;
    return matchesSearch && matchesStatut;
  });

  const totalFormations = formations.length;
  const formationsEnCours = formations.filter(f => f.statut === 'en_cours').length;
  const budgetTotal = formations.reduce((sum, f) => sum + (f.cout * f.maxParticipants), 0);

  const getStatutBadge = (statut: string) => {
    const classes: Record<string, string> = {
      planifiee: 'bg-blue-900/30 text-blue-300',
      en_cours: 'bg-amber-900/30 text-amber-300',
      terminee: 'bg-green-900/30 text-green-300',
      annulee: 'bg-red-900/30 text-red-300',
    };
    return classes[statut] || 'bg-gray-900/30 text-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Formations</h1>
          <p className="mt-2 text-sm text-gray-400">Gestion des formations et parcours</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              titre: '',
              description: '',
              formateur: '',
              dateDebut: '',
              dateFin: '',
              cout: 0,
              maxParticipants: 10,
            });
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
        >
          <AcademicCapIcon className="h-5 w-5" />
          Nouvelle formation
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-400 hover:text-red-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium text-gray-400">Total formations</h3>
            <AcademicCapIcon className="h-5 sm:h-6 w-5 sm:w-6 text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{totalFormations}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium text-gray-400">En cours</h3>
            <CalendarIcon className="h-5 sm:h-6 w-5 sm:w-6 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{formationsEnCours}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium text-gray-400">Budget total</h3>
            <CurrencyEuroIcon className="h-5 sm:h-6 w-5 sm:w-6 text-green-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{budgetTotal.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par titre ou formateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tous les statuts</option>
          <option value="planifiee">Planifiée</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
          <option value="annulee">Annulée</option>
        </select>
      </div>

      {filteredFormations.length === 0 ? (
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
          <div className="text-gray-500 text-center py-8">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">Aucune formation pour le moment</p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Titre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Formateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Coût</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Places</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredFormations.map((formation) => (
                  <tr key={formation.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{formation.titre}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{formation.formateur}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      <div>Du {new Date(formation.dateDebut).toLocaleDateString('fr-FR')}</div>
                      <div>Au {new Date(formation.dateFin).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{formation.cout} €</td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {formation.participantsInscrits}/{formation.maxParticipants}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${getStatutBadge(formation.statut)}`}>
                        {formation.statut.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenInscription(formation)}
                          className="text-green-400 hover:text-green-300"
                          title="Inscrire"
                        >
                          <UserPlusIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(formation)}
                          className="text-indigo-400 hover:text-indigo-300"
                          title="Modifier"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(formation.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-2 sm:mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Créer une nouvelle formation</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white flex-shrink-0"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Titre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Formateur <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.formateur}
                  onChange={(e) => setFormData({ ...formData, formateur: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date début <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateDebut}
                    onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date fin <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dateFin}
                    onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Coût (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cout}
                    onChange={(e) => setFormData({ ...formData, cout: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max participants</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 1 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md"
                >
                  {isSubmitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedFormation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-2 sm:mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Modifier la formation</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white flex-shrink-0"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre</label>
                <input
                  type="text"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Formateur</label>
                <input
                  type="text"
                  value={formData.formateur}
                  onChange={(e) => setFormData({ ...formData, formateur: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date début</label>
                  <input
                    type="date"
                    value={formData.dateDebut}
                    onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date fin</label>
                  <input
                    type="date"
                    value={formData.dateFin}
                    onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Coût (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cout}
                    onChange={(e) => setFormData({ ...formData, cout: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max participants</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 1 })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInscriptionModal && selectedFormation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4">
            <div className="flex justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Inscrire un membre</h2>
              <button
                onClick={() => setShowInscriptionModal(false)}
                className="text-gray-400 hover:text-white flex-shrink-0"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-700/30 p-4 rounded-lg">
                <p className="text-sm text-gray-300 mb-2">Formation :</p>
                <p className="text-white font-medium">{selectedFormation.titre}</p>
                <p className="text-sm text-gray-400">
                  {selectedFormation.participantsInscrits}/{selectedFormation.maxParticipants} inscrits
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ID du membre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={selectedMembreId}
                  onChange={(e) => setSelectedMembreId(e.target.value)}
                  placeholder="Entrez l'ID du membre"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowInscriptionModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                >
                  Annuler
                </button>
                <button
                  onClick={handleInscrire}
                  disabled={isSubmitting || !selectedMembreId}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md"
                >
                  {isSubmitting ? 'Inscription...' : 'Inscrire'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
