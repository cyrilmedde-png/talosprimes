'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  FunnelIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface Situation {
  id: string;
  chantierReference: string;
  chantierNom: string;
  numero: number;
  type: 'situation_travaux' | 'dg_demarrage' | 'retenue_garantie' | 'avenant';
  dateEmission: string;
  dateValidation: string | null;
  montantHT: number;
  montantTTC: number;
  tauxAvancement: number;
  valide: boolean;
}

interface Chantier {
  id: string;
  reference: string;
  nom: string;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

interface FormData {
  chantierId: string;
  type: 'situation_travaux' | 'dg_demarrage' | 'retenue_garantie' | 'avenant';
  dateEmission: string;
  montantHT: number;
  montantTTC: number;
  tauxAvancement: number;
}

const typeLabels: Record<string, string> = {
  situation_travaux: 'Situation travaux',
  dg_demarrage: 'DG Démarrage',
  retenue_garantie: 'Retenue de garantie',
  avenant: 'Avenant',
};

const defaultFormData: FormData = {
  chantierId: '',
  type: 'situation_travaux',
  dateEmission: '',
  montantHT: 0,
  montantTTC: 0,
  tauxAvancement: 0,
};

export default function SituationsPage() {
  const [situations, setSituations] = useState<Situation[]>([]);
  const [filteredSituations, setFilteredSituations] = useState<Situation[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<string>('all');
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    error: null,
  });
  const [showModal, setShowModal] = useState(false);
  const [editingSituation, setEditingSituation] = useState<Situation | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading({ isLoading: true, error: null });
      const [situationsRes, chantiersRes] = await Promise.all([
        apiClient.btp.situations.list(''),
        apiClient.btp.chantiers.list(),
      ]);
      const rawSit = situationsRes.data as unknown as { success: boolean; data: Situation[] };
      setSituations(rawSit.data);
      setFilteredSituations(rawSit.data);
      const rawCh = chantiersRes.data as unknown as { success: boolean; data: Chantier[] };
      setChantiers(rawCh.data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load data';
      setLoading((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
    } finally {
      setLoading((prev) => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = situations;

    if (selectedChantier !== 'all') {
      filtered = filtered.filter((s) => s.chantierReference === selectedChantier);
    }

    setFilteredSituations(filtered);
  }, [selectedChantier, situations]);

  const handleValidate = async (situationId: string) => {
    try {
      setValidatingId(situationId);
      await apiClient.btp.situations.valider(situationId);

      // Update local state
      setSituations((prev) =>
        prev.map((s) =>
          s.id === situationId
            ? { ...s, valide: true, dateValidation: new Date().toISOString() }
            : s
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la validation';
      setLoading((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setValidatingId(null);
    }
  };

  const handleOpenModal = (situation: Situation | null = null) => {
    if (situation) {
      setEditingSituation(situation);
      const chantierId = chantiers.find(
        (c) => c.reference === situation.chantierReference
      );
      setFormData({
        chantierId: chantierId ? chantierId.id : '',
        type: situation.type,
        dateEmission: situation.dateEmission,
        montantHT: situation.montantHT,
        montantTTC: situation.montantTTC,
        tauxAvancement: situation.tauxAvancement,
      });
    } else {
      setEditingSituation(null);
      setFormData({
        ...defaultFormData,
        chantierId: selectedChantier !== 'all'
          ? chantiers.find((c) => c.reference === selectedChantier)?.id || ''
          : '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSituation(null);
    setFormData(defaultFormData);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingSituation) {
        await apiClient.btp.situations.update(editingSituation.id, {
          type: formData.type,
          dateEmission: formData.dateEmission,
          montantHT: formData.montantHT,
          montantTTC: formData.montantTTC,
          tauxAvancement: formData.tauxAvancement,
        });
      } else {
        const selectedChantierId = formData.chantierId;
        if (!selectedChantierId) {
          setLoading((prev) => ({
            ...prev,
            error: 'Please select a chantier',
          }));
          return;
        }
        await apiClient.btp.situations.create(selectedChantierId, {
          type: formData.type,
          dateEmission: formData.dateEmission,
          montantHT: formData.montantHT,
          montantTTC: formData.montantTTC,
          tauxAvancement: formData.tauxAvancement,
        });
      }
      await fetchData();
      handleCloseModal();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save situation';
      setLoading((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this situation?')) {
      try {
        setDeletingId(id);
        await apiClient.btp.situations.delete(id);
        await fetchData();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete situation';
        setLoading((prev) => ({ ...prev, error: errorMessage }));
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (loading.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  if (loading.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          <p>{loading.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Create Button */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Situations</h1>
          <p className="mt-2 text-sm text-gray-400">
            Suivi des situations de travaux et de facturation
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Nouvelle Situation
        </button>
      </div>

      {/* Filter Section */}
      <div className="mb-8 rounded-lg bg-gray-800/20 border border-gray-700/30 p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            Filtrer par chantier
          </span>
        </div>
        <select
          value={selectedChantier}
          onChange={(e) => setSelectedChantier(e.target.value)}
          className="w-full md:w-64 bg-gray-800 border border-gray-700 text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Tous les chantiers</option>
          {chantiers.map((c) => (
            <option key={c.id} value={c.reference}>
              {c.reference} - {c.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <p className="mb-4 text-sm text-gray-400">
        {filteredSituations.length} situation(s) trouvée(s)
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg bg-gray-800 border border-gray-700 shadow-lg">
        {filteredSituations.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Chantier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  N°
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Dates
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">
                  Montant HT
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">
                  Montant TTC
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">
                  Taux
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSituations.map((situation) => (
                <tr
                  key={situation.id}
                  className="border-b border-gray-700 hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-white">
                        {situation.chantierReference}
                      </p>
                      <p className="text-sm text-gray-300">
                        {situation.chantierNom}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {situation.numero}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {typeLabels[situation.type] || situation.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {situation.dateEmission}
                    {situation.dateValidation && (
                      <>
                        <br />
                        <span className="text-xs text-gray-500">
                          Validé: {situation.dateValidation}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-white">
                    {(situation.montantHT / 100).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-white">
                    {(situation.montantTTC / 100).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-white">
                    {situation.tauxAvancement}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        situation.valide
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {situation.valide ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4" />
                          Validé
                        </>
                      ) : (
                        'En attente'
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {!situation.valide && (
                        <>
                          <button
                            onClick={() => handleOpenModal(situation)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-600/50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(situation.id)}
                            disabled={deletingId === situation.id}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === situation.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      )}
                      {!situation.valide && (
                        <button
                          onClick={() => handleValidate(situation.id)}
                          disabled={validatingId === situation.id}
                          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {validatingId === situation.id && (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          )}
                          Valider
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center">
            <p className="text-gray-500">Aucune situation trouvée</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingSituation ? 'Modifier Situation' : 'Créer une Nouvelle Situation'}
              </h2>

              <div className="space-y-4">
                {/* Chantier Selection */}
                {!editingSituation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Chantier
                    </label>
                    <select
                      value={formData.chantierId}
                      onChange={(e) =>
                        setFormData({ ...formData, chantierId: e.target.value })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a chantier</option>
                      {chantiers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.reference} - {c.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {editingSituation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Chantier
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${editingSituation.chantierReference} - ${editingSituation.chantierNom}`}
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-gray-500 px-4 py-2"
                    />
                  </div>
                )}

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as FormData['type'],
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="situation_travaux">Situation travaux</option>
                    <option value="dg_demarrage">DG Démarrage</option>
                    <option value="retenue_garantie">Retenue de garantie</option>
                    <option value="avenant">Avenant</option>
                  </select>
                </div>

                {/* Date Émission */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Date Émission
                  </label>
                  <input
                    type="date"
                    value={formData.dateEmission}
                    onChange={(e) =>
                      setFormData({ ...formData, dateEmission: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Montant HT */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Montant HT (€, en centimes)
                  </label>
                  <input
                    type="number"
                    value={formData.montantHT}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        montantHT: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Montant TTC */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Montant TTC (€, en centimes)
                  </label>
                  <input
                    type="number"
                    value={formData.montantTTC}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        montantTTC: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Taux Avancement */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Taux Avancement (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.tauxAvancement}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tauxAvancement: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleCloseModal}
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
