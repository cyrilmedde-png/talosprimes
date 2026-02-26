'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Contrat {
  id: string;
  tenantId: string;
  membreId: string;
  membreNom: string;
  type: 'CDI' | 'CDD' | 'Interim' | 'Stage';
  dateDebut: string;
  dateFin: string;
  salaireBase: number;
  poste: string;
  departement: string;
  statut: 'actif' | 'termine' | 'suspendu';
  createdAt: string;
}

interface ContratFormData {
  membreId: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  salaireBase: number;
  poste: string;
  departement: string;
  [key: string]: string | number | boolean | null;
}

const contratTypes = ['CDI', 'CDD', 'Interim', 'Stage'];
const statutOptions = ['actif', 'termine', 'suspendu'];

export default function ContratsPage(): JSX.Element {
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [filteredContrats, setFilteredContrats] = useState<Contrat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContrat, setEditingContrat] = useState<Contrat | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ContratFormData>({
    membreId: '',
    type: 'CDI',
    dateDebut: '',
    dateFin: '',
    salaireBase: 0,
    poste: '',
    departement: '',
  });

  const fetchContrats = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiClient.rh.contrats.list();
      const raw = response.data as unknown as { success: boolean; data: Contrat[] };
      setContrats(raw.data);
      setFilteredContrats(raw.data);
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
    fetchContrats();
  }, []);

  useEffect(() => {
    let filtered = contrats;

    if (searchTerm) {
      filtered = filtered.filter((c) =>
        c.membreNom.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedType) {
      filtered = filtered.filter((c) => c.type === selectedType);
    }

    if (selectedStatut) {
      filtered = filtered.filter((c) => c.statut === selectedStatut);
    }

    setFilteredContrats(filtered);
  }, [searchTerm, selectedType, selectedStatut, contrats]);

  const handleCreate = (): void => {
    setEditingContrat(null);
    setFormData({
      membreId: '',
      type: 'CDI',
      dateDebut: '',
      dateFin: '',
      salaireBase: 0,
      poste: '',
      departement: '',
    });
    setShowModal(true);
  };

  const handleEdit = (contrat: Contrat): void => {
    setEditingContrat(contrat);
    setFormData({
      membreId: contrat.membreId,
      type: contrat.type,
      dateDebut: contrat.dateDebut,
      dateFin: contrat.dateFin,
      salaireBase: contrat.salaireBase,
      poste: contrat.poste,
      departement: contrat.departement,
    });
    setShowModal(true);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      if (editingContrat) {
        await apiClient.rh.contrats.update(editingContrat.id, formData);
      } else {
        await apiClient.rh.contrats.create(formData);
      }
      setShowModal(false);
      await fetchContrats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contrat ?')) return;
    setDeletingId(id);
    try {
      await apiClient.rh.contrats.delete(id);
      await fetchContrats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const getTypeBadgeColor = (type: string): string => {
    switch (type) {
      case 'CDI':
        return 'bg-green-500/20 text-green-400';
      case 'CDD':
        return 'bg-blue-500/20 text-blue-400';
      case 'Interim':
        return 'bg-amber-500/20 text-amber-400';
      case 'Stage':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatutBadgeColor = (statut: string): string => {
    switch (statut) {
      case 'actif':
        return 'bg-green-500/20 text-green-400';
      case 'termine':
        return 'bg-gray-500/20 text-gray-400';
      case 'suspendu':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
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
          <h1 className="text-3xl font-bold text-white">Contrats de travail</h1>
          <p className="mt-2 text-sm text-gray-400">
            Gestion des contrats de travail
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nouveau contrat</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les types</option>
            {contratTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Statut Filter */}
          <select
            value={selectedStatut}
            onChange={(e) => setSelectedStatut(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les statuts</option>
            {statutOptions.map((statut) => (
              <option key={statut} value={statut}>
                {statut.charAt(0).toUpperCase() + statut.slice(1)}
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
                Poste
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Département
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Salaire
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Début
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Fin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredContrats.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  Aucun contrat trouvé
                </td>
              </tr>
            ) : (
              filteredContrats.map((contrat) => (
                <tr key={contrat.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-white">
                    {contrat.membreNom}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTypeBadgeColor(contrat.type)}`}>
                      {contrat.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {contrat.poste}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {contrat.departement}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {contrat.salaireBase.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {new Date(contrat.dateDebut).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {new Date(contrat.dateFin).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatutBadgeColor(contrat.statut)}`}>
                      {contrat.statut.charAt(0).toUpperCase() + contrat.statut.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(contrat)}
                        className="text-indigo-400 transition-colors hover:text-indigo-300"
                        title="Modifier"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(contrat.id)}
                        disabled={deletingId === contrat.id}
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
      <div className="mt-4 text-sm text-gray-400">
        Affichage de {filteredContrats.length} sur {contrats.length} contrats
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingContrat ? 'Modifier le contrat' : 'Nouveau contrat'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Membre
                  </label>
                  <input
                    type="text"
                    value={formData.membreId}
                    onChange={(e) =>
                      setFormData({ ...formData, membreId: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ID du membre"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Type de contrat
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {contratTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Date de début
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
                      Date de fin
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
                    Salaire de base (€)
                  </label>
                  <input
                    type="number"
                    value={formData.salaireBase}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaireBase: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Poste
                  </label>
                  <input
                    type="text"
                    value={formData.poste}
                    onChange={(e) =>
                      setFormData({ ...formData, poste: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Département
                  </label>
                  <input
                    type="text"
                    value={formData.departement}
                    onChange={(e) =>
                      setFormData({ ...formData, departement: e.target.value })
                    }
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
