'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Membre {
  id: string;
  tenantId: string;
  nom: string;
  prenom: string;
  email: string;
  poste: string;
  departement: string;
  contratType: string;
  dateEmbauche: string;
  salairesBase: number;
  manager: string;
  actif: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface MembreFormData {
  nom: string;
  prenom: string;
  email: string;
  poste: string;
  departement: string;
  contratType: string;
  dateEmbauche: string;
  salairesBase: number;
  manager: string;
  actif: boolean;
  [key: string]: string | number | boolean | null;
}

const contratTypes = ['CDI', 'CDD', 'Intérim', 'Stage', 'Alternance'];

export default function MembresPage(): JSX.Element {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [filteredMembres, setFilteredMembres] = useState<Membre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartement, setSelectedDepartement] = useState('');
  const [departements, setDepartements] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMembre, setEditingMembre] = useState<Membre | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MembreFormData>({
    nom: '',
    prenom: '',
    email: '',
    poste: '',
    departement: '',
    contratType: 'CDI',
    dateEmbauche: '',
    salairesBase: 0,
    manager: '',
    actif: true,
  });

  const fetchMembres = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiClient.equipe.membres.list();
      const raw = response.data as unknown as { success: boolean; data?: { items?: Membre[] }; error?: string };
      if (!raw?.success || !raw.data) {
        setError(raw?.error || 'Aucune donnée reçue du serveur');
        setLoading(false);
        return;
      }
      const membresData = raw.data.items || [];
      setMembres(membresData);
      setFilteredMembres(membresData);

      const uniqueDepts = Array.from(
        new Set(membresData.map((m) => m.departement))
      ).sort();
      setDepartements(uniqueDepts);
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
    fetchMembres();
  }, []);

  useEffect(() => {
    let filtered = membres;

    if (searchTerm) {
      filtered = filtered.filter(
        (m) =>
          m.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartement) {
      filtered = filtered.filter(
        (m) => m.departement === selectedDepartement
      );
    }

    setFilteredMembres(filtered);
  }, [searchTerm, selectedDepartement, membres]);

  const handleCreate = (): void => {
    setEditingMembre(null);
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      poste: '',
      departement: '',
      contratType: 'CDI',
      dateEmbauche: '',
      salairesBase: 0,
      manager: '',
      actif: true,
    });
    setShowModal(true);
  };

  const handleEdit = (membre: Membre): void => {
    setEditingMembre(membre);
    setFormData({
      nom: membre.nom,
      prenom: membre.prenom,
      email: membre.email,
      poste: membre.poste,
      departement: membre.departement,
      contratType: membre.contratType,
      dateEmbauche: membre.dateEmbauche,
      salairesBase: membre.salairesBase,
      manager: membre.manager,
      actif: membre.actif,
    });
    setShowModal(true);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      if (editingMembre) {
        await apiClient.equipe.membres.update(editingMembre.id, formData);
      } else {
        await apiClient.equipe.membres.create(formData);
      }
      setShowModal(false);
      await fetchMembres();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return;
    setDeletingId(id);
    try {
      await apiClient.equipe.membres.delete(id);
      await fetchMembres();
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
          <h1 className="text-3xl font-bold text-white">Membres</h1>
          <p className="mt-2 text-sm text-gray-400">
            Gestion des membres de l'équipe
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Ajouter un membre</span>
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
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartement}
            onChange={(e) => setSelectedDepartement(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les départements</option>
            {departements.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
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
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Prénom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Poste
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Département
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Contrat
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
            {filteredMembres.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Aucun membre trouvé
                </td>
              </tr>
            ) : (
              filteredMembres.map((membre) => (
                <tr key={membre.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-white">
                    {membre.nom}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {membre.prenom}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {membre.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {membre.poste}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {membre.departement}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {membre.contratType}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        membre.actif
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-300'
                      }`}
                    >
                      {membre.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(membre)}
                        className="text-indigo-400 transition-colors hover:text-indigo-300"
                        title="Modifier"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(membre.id)}
                        disabled={deletingId === membre.id}
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
        Affichage de {filteredMembres.length} sur {membres.length} membres
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingMembre ? 'Modifier le membre' : 'Ajouter un membre'}
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) =>
                        setFormData({ ...formData, nom: e.target.value })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={formData.prenom}
                      onChange={(e) =>
                        setFormData({ ...formData, prenom: e.target.value })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Type de contrat
                  </label>
                  <select
                    value={formData.contratType}
                    onChange={(e) =>
                      setFormData({ ...formData, contratType: e.target.value })
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
                      Date d'embauche
                    </label>
                    <input
                      type="date"
                      value={formData.dateEmbauche}
                      onChange={(e) =>
                        setFormData({ ...formData, dateEmbauche: e.target.value })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Salaire de base
                    </label>
                    <input
                      type="number"
                      value={formData.salairesBase}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          salairesBase: parseFloat(e.target.value),
                        })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Manager
                  </label>
                  <input
                    type="text"
                    value={formData.manager}
                    onChange={(e) =>
                      setFormData({ ...formData, manager: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="actif"
                    checked={formData.actif}
                    onChange={(e) =>
                      setFormData({ ...formData, actif: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="actif"
                    className="text-sm font-medium text-gray-400"
                  >
                    Actif
                  </label>
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
