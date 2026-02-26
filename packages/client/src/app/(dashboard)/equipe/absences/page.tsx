'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Absence {
  id: string;
  tenantId: string;
  membreId: string;
  membreNom: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  motif: string;
  statut: string;
  approuvePar: string;
  createdAt: string;
}

interface AbsenceFormData {
  membreId: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  motif: string;
  [key: string]: string | number | boolean | null;
}

type AbsenceType = 'Congé' | 'Maladie' | 'Autre';
type AbsenceStatut = 'Approuvé' | 'Rejeté' | 'En attente';

const absenceTypes: AbsenceType[] = ['Congé', 'Maladie', 'Autre'];
const absenceStatuts: AbsenceStatut[] = ['Approuvé', 'Rejeté', 'En attente'];

export default function AbsencesPage(): JSX.Element {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [filteredAbsences, setFilteredAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AbsenceType | ''>('');
  const [selectedStatut, setSelectedStatut] = useState<AbsenceStatut | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AbsenceFormData>({
    membreId: '',
    type: 'Congé',
    dateDebut: '',
    dateFin: '',
    motif: '',
  });

  const fetchAbsences = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiClient.equipe.absences.list();
      const raw = response.data as unknown as { success: boolean; data: { items: Absence[] } };
      const absencesData = raw.data.items;
      setAbsences(absencesData);
      setFilteredAbsences(absencesData);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors du chargement'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsences();
  }, []);

  useEffect(() => {
    let filtered = absences;

    if (selectedType) {
      filtered = filtered.filter((a) => a.type === selectedType);
    }

    if (selectedStatut) {
      filtered = filtered.filter((a) => a.statut === selectedStatut);
    }

    setFilteredAbsences(filtered);
  }, [selectedType, selectedStatut, absences]);

  const handleCreate = (): void => {
    setEditingAbsence(null);
    setFormData({
      membreId: '',
      type: 'Congé',
      dateDebut: '',
      dateFin: '',
      motif: '',
    });
    setShowModal(true);
  };

  const handleEdit = (absence: Absence): void => {
    setEditingAbsence(absence);
    setFormData({
      membreId: absence.membreId,
      type: absence.type,
      dateDebut: absence.dateDebut,
      dateFin: absence.dateFin,
      motif: absence.motif,
    });
    setShowModal(true);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      if (editingAbsence) {
        await apiClient.equipe.absences.update(editingAbsence.id, formData);
      } else {
        await apiClient.equipe.absences.create(formData);
      }
      setShowModal(false);
      await fetchAbsences();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette absence ?')) return;
    setDeletingId(id);
    try {
      await apiClient.equipe.absences.delete(id);
      await fetchAbsences();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleApprove = async (id: string): Promise<void> => {
    try {
      await apiClient.equipe.absences.update(id, { statut: 'Approuvé' });
      await fetchAbsences();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de l\'approbation'
      );
    }
  };

  const handleReject = async (id: string): Promise<void> => {
    try {
      await apiClient.equipe.absences.update(id, { statut: 'Rejeté' });
      await fetchAbsences();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors du rejet'
      );
    }
  };

  const getStatutBadgeColor = (
    statut: string
  ): Record<string, string> => {
    switch (statut) {
      case 'Approuvé':
        return { bg: 'bg-green-500/20', text: 'text-green-400' };
      case 'Rejeté':
        return { bg: 'bg-red-500/20', text: 'text-red-400' };
      case 'En attente':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400' };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-300' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Absences</h1>
          <p className="mt-2 text-sm text-gray-400">Gestion des absences de l'équipe</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Ajouter absence</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as AbsenceType | '')}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les types</option>
            {absenceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Statut Filter */}
          <select
            value={selectedStatut}
            onChange={(e) => setSelectedStatut(e.target.value as AbsenceStatut | '')}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les statuts</option>
            {absenceStatuts.map((statut) => (
              <option key={statut} value={statut}>
                {statut}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-gray-800 rounded-xl border border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Membre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Date début
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Date fin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Motif
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Gestion
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAbsences.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Aucune absence trouvée
                </td>
              </tr>
            ) : (
              filteredAbsences.map((absence) => {
                const badgeColor = getStatutBadgeColor(absence.statut);
                return (
                  <tr key={absence.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm text-white">
                      {absence.membreNom}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {absence.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {new Date(absence.dateDebut).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {new Date(absence.dateFin).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {absence.motif}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeColor.bg} ${badgeColor.text}`}
                      >
                        {absence.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-2">
                        {absence.statut === 'En attente' && (
                          <>
                            <button
                              onClick={() => handleApprove(absence.id)}
                              className="text-green-400 transition-colors hover:text-green-300"
                              title="Approuver"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleReject(absence.id)}
                              className="text-red-400 transition-colors hover:text-red-300"
                              title="Rejeter"
                            >
                              <XCircleIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEdit(absence)}
                          className="text-indigo-400 transition-colors hover:text-indigo-300"
                          title="Modifier"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(absence.id)}
                          disabled={deletingId === absence.id}
                          className="text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-400">
        Affichage de {filteredAbsences.length} sur {absences.length} absences
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingAbsence ? 'Modifier l\'absence' : 'Ajouter une absence'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    ID Membre
                  </label>
                  <input
                    type="text"
                    value={formData.membreId}
                    onChange={(e) =>
                      setFormData({ ...formData, membreId: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {absenceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Date début
                    </label>
                    <input
                      type="date"
                      value={formData.dateDebut}
                      onChange={(e) =>
                        setFormData({ ...formData, dateDebut: e.target.value })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Date fin
                    </label>
                    <input
                      type="date"
                      value={formData.dateFin}
                      onChange={(e) =>
                        setFormData({ ...formData, dateFin: e.target.value })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Motif
                  </label>
                  <textarea
                    value={formData.motif}
                    onChange={(e) =>
                      setFormData({ ...formData, motif: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
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
