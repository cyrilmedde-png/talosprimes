'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface Entretien {
  id: string;
  tenantId: string;
  membreId: string;
  membreNom: string;
  type: 'annuel' | 'professionnel' | 'recadrage' | 'fin_periode_essai';
  dateEntretien: string;
  evaluateur: string;
  compteRendu: string;
  objectifs: string;
  statut: 'planifie' | 'realise' | 'annule';
  createdAt: string;
}

interface EntretienFormData {
  membreId: string;
  type: string;
  dateEntretien: string;
  evaluateur: string;
  compteRendu: string;
  objectifs: string;
  statut?: string;
  [key: string]: string | number | boolean | null | undefined;
}

const TYPE_LABELS: Record<string, string> = {
  annuel: 'Entretien Annuel',
  professionnel: 'Entretien Professionnel',
  recadrage: 'Recadrage',
  fin_periode_essai: 'Fin Période d\'Essai',
};

const TYPE_COLORS: Record<string, string> = {
  annuel: 'bg-blue-900/30 text-blue-400',
  professionnel: 'bg-green-900/30 text-green-400',
  recadrage: 'bg-red-900/30 text-red-400',
  fin_periode_essai: 'bg-amber-900/30 text-amber-400',
};

const STATUT_COLORS: Record<string, string> = {
  planifie: 'bg-amber-900/30 text-amber-400',
  realise: 'bg-green-900/30 text-green-400',
  annule: 'bg-red-900/30 text-red-400',
};

const STATUT_LABELS: Record<string, string> = {
  planifie: 'Planifié',
  realise: 'Réalisé',
  annule: 'Annulé',
};

export default function EntretiensPage() {
  const router = useRouter();
  const [entretiens, setEntretiens] = useState<Entretien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedEntretien, setSelectedEntretien] = useState<Entretien | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<EntretienFormData>({
    membreId: '',
    type: 'annuel',
    dateEntretien: '',
    evaluateur: '',
    compteRendu: '',
    objectifs: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadEntretiens();
  }, [router]);

  const loadEntretiens = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.rh.entretiens.list();
      const raw = response.data as unknown as { success: boolean; data: Entretien[] };
      setEntretiens(raw.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      if (err instanceof Error && err.message.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (): Promise<void> => {
    if (!formData.membreId || !formData.type || !formData.dateEntretien) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiClient.rh.entretiens.create({
        membreId: formData.membreId,
        type: formData.type,
        dateEntretien: formData.dateEntretien,
        evaluateur: formData.evaluateur,
        compteRendu: formData.compteRendu,
        objectifs: formData.objectifs,
      });
      setShowCreateModal(false);
      setFormData({
        membreId: '',
        type: 'annuel',
        dateEntretien: '',
        evaluateur: '',
        compteRendu: '',
        objectifs: '',
      });
      await loadEntretiens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (entretien: Entretien): void => {
    setSelectedEntretien(entretien);
    setFormData({
      membreId: entretien.membreId,
      type: entretien.type,
      dateEntretien: entretien.dateEntretien,
      evaluateur: entretien.evaluateur,
      compteRendu: entretien.compteRendu,
      objectifs: entretien.objectifs,
      statut: entretien.statut,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (): Promise<void> => {
    if (!selectedEntretien) return;
    if (!formData.membreId || !formData.type || !formData.dateEntretien) {
      setError('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiClient.rh.entretiens.update(selectedEntretien.id, {
        membreId: formData.membreId,
        type: formData.type,
        dateEntretien: formData.dateEntretien,
        evaluateur: formData.evaluateur,
        compteRendu: formData.compteRendu,
        objectifs: formData.objectifs,
      });
      setShowEditModal(false);
      setSelectedEntretien(null);
      await loadEntretiens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      setError(null);
      await apiClient.rh.entretiens.delete(id);
      setShowDeleteConfirm(null);
      await loadEntretiens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const filteredEntretiens = entretiens.filter(ent => {
    const matchesSearch =
      ent.membreNom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ent.evaluateur.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || ent.type === selectedType;
    return matchesSearch && matchesType;
  });

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
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Entretiens</h1>
          <p className="mt-2 text-sm text-gray-400">
            Gestion des entretiens des membres
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              membreId: '',
              type: 'annuel',
              dateEntretien: '',
              evaluateur: '',
              compteRendu: '',
              objectifs: '',
            });
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Nouvel entretien
        </button>
      </div>

      {/* Error message */}
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

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
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
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les types</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Entretiens Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {filteredEntretiens.length === 0 ? (
          <div className="p-12 text-center">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">Aucun entretien</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Membre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Évaluateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Compte-Rendu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredEntretiens.map((ent) => (
                  <tr key={ent.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{ent.membreNom}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${TYPE_COLORS[ent.type]}`}>
                        {TYPE_LABELS[ent.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(ent.dateEntretien).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{ent.evaluateur}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <div className="max-w-xs truncate">{ent.compteRendu || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${STATUT_COLORS[ent.statut]}`}>
                        {STATUT_LABELS[ent.statut]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(ent)}
                          className="text-indigo-400 hover:text-indigo-300 transition-colors"
                          title="Modifier"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(ent.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
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
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Nouvel entretien</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Membre ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.membreId}
                  onChange={(e) => setFormData({ ...formData, membreId: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ID du membre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date de l'entretien <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dateEntretien}
                  onChange={(e) => setFormData({ ...formData, dateEntretien: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Évaluateur</label>
                <input
                  type="text"
                  value={formData.evaluateur}
                  onChange={(e) => setFormData({ ...formData, evaluateur: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nom de l'évaluateur"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Compte-Rendu</label>
                <textarea
                  value={formData.compteRendu}
                  onChange={(e) => setFormData({ ...formData, compteRendu: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Compte-rendu de l'entretien"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Objectifs</label>
                <textarea
                  value={formData.objectifs}
                  onChange={(e) => setFormData({ ...formData, objectifs: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Objectifs fixés"
                  rows={4}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                >
                  {submitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedEntretien && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Modifier l'entretien</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedEntretien(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Membre ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.membreId}
                  onChange={(e) => setFormData({ ...formData, membreId: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ID du membre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date de l'entretien <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dateEntretien}
                  onChange={(e) => setFormData({ ...formData, dateEntretien: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Évaluateur</label>
                <input
                  type="text"
                  value={formData.evaluateur}
                  onChange={(e) => setFormData({ ...formData, evaluateur: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nom de l'évaluateur"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Compte-Rendu</label>
                <textarea
                  value={formData.compteRendu}
                  onChange={(e) => setFormData({ ...formData, compteRendu: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Compte-rendu de l'entretien"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Objectifs</label>
                <textarea
                  value={formData.objectifs}
                  onChange={(e) => setFormData({ ...formData, objectifs: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Objectifs fixés"
                  rows={4}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEntretien(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                >
                  {submitting ? 'Mise à jour...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold text-white mb-4">Confirmer la suppression</h2>
            <p className="text-gray-300 mb-6">
              Êtes-vous sûr de vouloir supprimer cet entretien ? Cette action ne peut pas être annulée.
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
