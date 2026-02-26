'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { PlusIcon, ClockIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Pointage {
  id: string;
  tenantId: string;
  membreId: string;
  membreNom: string;
  date: string;
  heureArrivee: string;
  heureDepart: string;
  heuresTravaillees: number;
  statut: string;
  createdAt: string;
}

interface PointageFormData {
  membreId: string;
  date: string;
  heureArrivee: string;
  heureDepart: string;
  [key: string]: string | number | boolean | null;
}

export default function PointagePage(): JSX.Element {
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showModal, setShowModal] = useState(false);
  const [editingPointage, setEditingPointage] = useState<Pointage | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PointageFormData>({
    membreId: '',
    date: selectedDate,
    heureArrivee: '',
    heureDepart: '',
  });

  const fetchPointages = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiClient.equipe.pointages.list({ dateFrom: selectedDate });
      const raw = response.data as unknown as { success: boolean; data: { items: Pointage[] } };
      setPointages(raw.data.items);
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
    fetchPointages();
  }, [selectedDate]);

  const formatTime = (time: string): string => {
    if (!time) return '--:--';
    return time.substring(0, 5);
  };

  const handleCreate = (): void => {
    setEditingPointage(null);
    setFormData({
      membreId: '',
      date: selectedDate,
      heureArrivee: '',
      heureDepart: '',
    });
    setShowModal(true);
  };

  const handleEdit = (pointage: Pointage): void => {
    setEditingPointage(pointage);
    setFormData({
      membreId: pointage.membreId,
      date: pointage.date,
      heureArrivee: pointage.heureArrivee,
      heureDepart: pointage.heureDepart,
    });
    setShowModal(true);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      if (editingPointage) {
        await apiClient.equipe.pointages.update(editingPointage.id, formData);
      } else {
        await apiClient.equipe.pointages.create(formData);
      }
      setShowModal(false);
      await fetchPointages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce pointage ?')) return;
    setDeletingId(id);
    try {
      await apiClient.equipe.pointages.delete(id);
      await fetchPointages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
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
          <h1 className="text-3xl font-bold text-white">Pointage</h1>
          <p className="mt-2 text-sm text-gray-400">Gestion des heures de travail</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Ajouter pointage</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Date Selector */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Sélectionner une date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-gray-800 rounded-xl border border-gray-700 mb-6">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Membre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Arrivée
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Départ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Pause (min)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Heures travaillées
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pointages.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Aucun pointage pour cette date
                </td>
              </tr>
            ) : (
              pointages.map((pointage) => (
                <tr key={pointage.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-white">
                    {pointage.membreNom}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {new Date(pointage.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                      <span>{formatTime(pointage.heureArrivee)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                      <span>{formatTime(pointage.heureDepart)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    0
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center space-x-1 rounded-lg bg-indigo-500/20 px-3 py-1 text-sm font-semibold text-indigo-400">
                      <ClockIcon className="h-4 w-4" />
                      <span>{pointage.heuresTravaillees}h</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(pointage)}
                        className="text-indigo-400 transition-colors hover:text-indigo-300"
                        title="Modifier"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pointage.id)}
                        disabled={deletingId === pointage.id}
                        className="text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                        title="Supprimer"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-4 backdrop-blur-md">
          <p className="text-xs sm:text-sm font-medium text-gray-400">Total pointages</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
            {pointages.length}
          </p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-4 backdrop-blur-md">
          <p className="text-xs sm:text-sm font-medium text-gray-400">Heures totales</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
            {pointages
              .reduce((acc, p) => acc + p.heuresTravaillees, 0)
              .toFixed(1)}
            h
          </p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-4 backdrop-blur-md">
          <p className="text-xs sm:text-sm font-medium text-gray-400">Validés</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-white">
            {pointages.filter((p) => p.statut === 'valide').length}
          </p>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingPointage ? 'Modifier le pointage' : 'Ajouter un pointage'}
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
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Heure d'arrivée
                    </label>
                    <input
                      type="time"
                      value={formData.heureArrivee}
                      onChange={(e) =>
                        setFormData({ ...formData, heureArrivee: e.target.value })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Heure de départ
                    </label>
                    <input
                      type="time"
                      value={formData.heureDepart}
                      onChange={(e) =>
                        setFormData({ ...formData, heureDepart: e.target.value })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
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
