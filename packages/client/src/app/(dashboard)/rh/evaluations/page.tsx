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
  StarIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Evaluation {
  id: string;
  tenantId: string;
  membreId: string;
  membreNom: string;
  evaluateurId: string;
  evaluateurNom: string;
  periode: 'T1' | 'T2' | 'T3' | 'T4' | 'annuel';
  annee: number;
  noteGlobale: number;
  commentaires: string;
  objectifsAtteints: string;
  objectifsFuturs: string;
  statut: 'brouillon' | 'soumise' | 'validee';
  createdAt: string;
}

interface EvaluationFormData {
  membreId: string;
  evaluateurId: string;
  periode: string;
  annee: number;
  noteGlobale: number;
  commentaires: string;
  objectifsAtteints: string;
  objectifsFuturs: string;
  [key: string]: string | number | boolean | null;
}

export default function EvaluationsPage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodeFilter, setPeriodeFilter] = useState('');
  const [anneeFilter, setAnneeFilter] = useState(new Date().getFullYear().toString());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<EvaluationFormData>({
    membreId: '',
    evaluateurId: '',
    periode: 'T1',
    annee: new Date().getFullYear(),
    noteGlobale: 10,
    commentaires: '',
    objectifsAtteints: '',
    objectifsFuturs: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadEvaluations();
  }, [router]);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.rh.evaluations.list();
      const raw = response.data as unknown as { success: boolean; data: Evaluation[] };
      setEvaluations(Array.isArray(raw.data) ? raw.data : []);
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
      if (!formData.membreId || !formData.evaluateurId) {
        setError('Veuillez remplir tous les champs obligatoires');
        return;
      }

      setIsSubmitting(true);
      await apiClient.rh.evaluations.create(formData);
      setShowCreateModal(false);
      setFormData({
        membreId: '',
        evaluateurId: '',
        periode: 'T1',
        annee: new Date().getFullYear(),
        noteGlobale: 10,
        commentaires: '',
        objectifsAtteints: '',
        objectifsFuturs: '',
      });
      await loadEvaluations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setFormData({
      membreId: evaluation.membreId,
      evaluateurId: evaluation.evaluateurId,
      periode: evaluation.periode,
      annee: evaluation.annee,
      noteGlobale: evaluation.noteGlobale,
      commentaires: evaluation.commentaires,
      objectifsAtteints: evaluation.objectifsAtteints,
      objectifsFuturs: evaluation.objectifsFuturs,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedEvaluation) return;
    try {
      if (!formData.membreId || !formData.evaluateurId) {
        setError('Veuillez remplir tous les champs obligatoires');
        return;
      }

      setIsSubmitting(true);
      await apiClient.rh.evaluations.update(selectedEvaluation.id, formData);
      setShowEditModal(false);
      setSelectedEvaluation(null);
      await loadEvaluations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette évaluation ?')) return;
    try {
      await apiClient.rh.evaluations.delete(id);
      await loadEvaluations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesSearch =
      evaluation.membreNom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluation.evaluateurNom.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPeriode = !periodeFilter || evaluation.periode === periodeFilter;
    const matchesAnnee = !anneeFilter || evaluation.annee.toString() === anneeFilter;
    return matchesSearch && matchesPeriode && matchesAnnee;
  });

  const averageNote =
    evaluations.length > 0
      ? (evaluations.reduce((sum, e) => sum + e.noteGlobale, 0) / evaluations.length).toFixed(2)
      : '0.00';
  const totalEvaluations = evaluations.length;
  const evaluationsEnAttente = evaluations.filter(e => e.statut !== 'validee').length;

  const getNoteColor = (note: number) => {
    if (note >= 15) return 'text-green-400';
    if (note >= 10) return 'text-amber-400';
    return 'text-red-400';
  };

  const getStatutBadge = (statut: string) => {
    const classes: Record<string, string> = {
      brouillon: 'bg-gray-900/30 text-gray-300',
      soumise: 'bg-amber-900/30 text-amber-300',
      validee: 'bg-green-900/30 text-green-300',
    };
    return classes[statut] || 'bg-gray-900/30 text-gray-300';
  };

  const truncateText = (text: string, length: number = 50) => {
    return text.length > length ? text.substring(0, length) + '...' : text;
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
          <h1 className="text-3xl font-bold text-white">Évaluations</h1>
          <p className="mt-2 text-sm text-gray-400">Gestion des évaluations de performance</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              membreId: '',
              evaluateurId: '',
              periode: 'T1',
              annee: new Date().getFullYear(),
              noteGlobale: 10,
              commentaires: '',
              objectifsAtteints: '',
              objectifsFuturs: '',
            });
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
        >
          <DocumentCheckIcon className="h-5 w-5" />
          Nouvelle évaluation
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
            <h3 className="text-xs sm:text-sm font-medium text-gray-400">Note moyenne</h3>
            <StarIcon className="h-5 sm:h-6 w-5 sm:w-6 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{averageNote}/20</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium text-gray-400">Total évaluations</h3>
            <DocumentCheckIcon className="h-5 sm:h-6 w-5 sm:w-6 text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{totalEvaluations}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium text-gray-400">En attente</h3>
            <CheckCircleIcon className="h-5 sm:h-6 w-5 sm:w-6 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{evaluationsEnAttente}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par membre ou évaluateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={periodeFilter}
          onChange={(e) => setPeriodeFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Toutes périodes</option>
          <option value="T1">T1</option>
          <option value="T2">T2</option>
          <option value="T3">T3</option>
          <option value="T4">T4</option>
          <option value="annuel">Annuel</option>
        </select>
        <input
          type="number"
          value={anneeFilter}
          onChange={(e) => setAnneeFilter(e.target.value)}
          min="2020"
          max={new Date().getFullYear() + 1}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32"
        />
      </div>

      {filteredEvaluations.length === 0 ? (
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
          <div className="text-gray-500 text-center py-8">
            <DocumentCheckIcon className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">Aucune évaluation pour le moment</p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Membre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Évaluateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Période/Année</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Note</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Objectifs atteints</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredEvaluations.map((evaluation) => (
                  <tr key={evaluation.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-white font-medium">{evaluation.membreNom}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{evaluation.evaluateurNom}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {evaluation.periode} {evaluation.annee}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${getNoteColor(evaluation.noteGlobale)}`}>
                      {evaluation.noteGlobale}/20
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {truncateText(evaluation.objectifsAtteints)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${getStatutBadge(evaluation.statut)}`}>
                        {evaluation.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(evaluation)}
                          className="text-indigo-400 hover:text-indigo-300"
                          title="Modifier"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(evaluation.id)}
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
              <h2 className="text-lg sm:text-xl font-bold text-white">Créer une nouvelle évaluation</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white flex-shrink-0"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Membre <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.membreId}
                    onChange={(e) => setFormData({ ...formData, membreId: e.target.value })}
                    placeholder="ID du membre"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Évaluateur <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.evaluateurId}
                    onChange={(e) => setFormData({ ...formData, evaluateurId: e.target.value })}
                    placeholder="ID de l'évaluateur"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Période</label>
                  <select
                    value={formData.periode}
                    onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="T1">T1</option>
                    <option value="T2">T2</option>
                    <option value="T3">T3</option>
                    <option value="T4">T4</option>
                    <option value="annuel">Annuel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Année</label>
                  <input
                    type="number"
                    value={formData.annee}
                    onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) || new Date().getFullYear() })}
                    min="2020"
                    max={new Date().getFullYear() + 1}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Note globale (0-20)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={formData.noteGlobale}
                    onChange={(e) => setFormData({ ...formData, noteGlobale: parseInt(e.target.value) || 10 })}
                    className="flex-1"
                  />
                  <span className={`text-2xl font-bold ${getNoteColor(formData.noteGlobale as number)}`}>
                    {formData.noteGlobale}/20
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Commentaires</label>
                <textarea
                  value={formData.commentaires}
                  onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Objectifs atteints</label>
                <textarea
                  value={formData.objectifsAtteints}
                  onChange={(e) => setFormData({ ...formData, objectifsAtteints: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Objectifs futurs</label>
                <textarea
                  value={formData.objectifsFuturs}
                  onChange={(e) => setFormData({ ...formData, objectifsFuturs: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
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

      {showEditModal && selectedEvaluation && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-2 sm:mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Modifier l'évaluation</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white flex-shrink-0"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Membre</label>
                  <input
                    type="text"
                    value={formData.membreId}
                    onChange={(e) => setFormData({ ...formData, membreId: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Évaluateur</label>
                  <input
                    type="text"
                    value={formData.evaluateurId}
                    onChange={(e) => setFormData({ ...formData, evaluateurId: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Période</label>
                  <select
                    value={formData.periode}
                    onChange={(e) => setFormData({ ...formData, periode: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="T1">T1</option>
                    <option value="T2">T2</option>
                    <option value="T3">T3</option>
                    <option value="T4">T4</option>
                    <option value="annuel">Annuel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Année</label>
                  <input
                    type="number"
                    value={formData.annee}
                    onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) || new Date().getFullYear() })}
                    min="2020"
                    max={new Date().getFullYear() + 1}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Note globale (0-20)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={formData.noteGlobale}
                    onChange={(e) => setFormData({ ...formData, noteGlobale: parseInt(e.target.value) || 10 })}
                    className="flex-1"
                  />
                  <span className={`text-2xl font-bold ${getNoteColor(formData.noteGlobale as number)}`}>
                    {formData.noteGlobale}/20
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Commentaires</label>
                <textarea
                  value={formData.commentaires}
                  onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Objectifs atteints</label>
                <textarea
                  value={formData.objectifsAtteints}
                  onChange={(e) => setFormData({ ...formData, objectifsAtteints: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Objectifs futurs</label>
                <textarea
                  value={formData.objectifsFuturs}
                  onChange={(e) => setFormData({ ...formData, objectifsFuturs: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
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
    </div>
  );
}
