'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Conge {
  id: string;
  tenantId: string;
  membreId: string;
  membreNom: string;
  type: 'cp' | 'rtt' | 'maladie' | 'sans_solde' | 'maternite' | 'paternite';
  dateDebut: string;
  dateFin: string;
  motif: string;
  statut: 'en_attente' | 'approuve' | 'rejete';
  approuvePar: string;
  createdAt: string;
}

interface CongeFormData {
  membreId: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  motif: string;
  [key: string]: string | number | boolean | null;
}

const congeTypes = [
  { value: 'cp', label: 'Congé Payé' },
  { value: 'rtt', label: 'RTT' },
  { value: 'maladie', label: 'Maladie' },
  { value: 'sans_solde', label: 'Sans Solde' },
  { value: 'maternite', label: 'Maternité' },
  { value: 'paternite', label: 'Paternité' },
];

export default function CongesPage(): JSX.Element {
  const [conges, setConges] = useState<Conge[]>([]);
  const [filteredConges, setFilteredConges] = useState<Conge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingConge, setEditingConge] = useState<Conge | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CongeFormData>({
    membreId: '',
    type: 'cp',
    dateDebut: '',
    dateFin: '',
    motif: '',
  });

  const fetchConges = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiClient.rh.conges.list();
      const raw = response.data as unknown as { success: boolean; data: Conge[] };
      setConges(raw.data);
      setFilteredConges(raw.data);
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
    fetchConges();
  }, []);

  useEffect(() => {
    let filtered = conges;

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

    setFilteredConges(filtered);
  }, [searchTerm, selectedType, selectedStatut, conges]);

  const handleCreate = (): void => {
    setEditingConge(null);
    setFormData({
      membreId: '',
      type: 'cp',
      dateDebut: '',
      dateFin: '',
      motif: '',
    });
    setShowModal(true);
  };

  const handleEdit = (conge: Conge): void => {
    setEditingConge(conge);
    setFormData({
      membreId: conge.membreId,
      type: conge.type,
      dateDebut: conge.dateDebut,
      dateFin: conge.dateFin,
      motif: conge.motif,
    });
    setShowModal(true);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      if (editingConge) {
        await apiClient.rh.conges.update(editingConge.id, formData);
      } else {
        await apiClient.rh.conges.create(formData);
      }
      setShowModal(false);
      await fetchConges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce congé ?')) return;
    setDeletingId(id);
    try {
      await apiClient.rh.conges.delete(id);
      await fetchConges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleApprove = async (id: string): Promise<void> => {
    setApprovingId(id);
    try {
      await apiClient.rh.conges.approuver(id);
      await fetchConges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'approbation');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string): Promise<void> => {
    setRejectingId(id);
    try {
      await apiClient.rh.conges.rejeter(id);
      await fetchConges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du rejet');
    } finally {
      setRejectingId(null);
    }
  };

  const getTypeBadgeColor = (type: string): string => {
    switch (type) {
      case 'cp':
        return 'bg-blue-500/20 text-blue-400';
      case 'rtt':
        return 'bg-purple-500/20 text-purple-400';
      case 'maladie':
        return 'bg-orange-500/20 text-orange-400';
      case 'sans_solde':
        return 'bg-gray-500/20 text-gray-400';
      case 'maternite':
        return 'bg-pink-500/20 text-pink-400';
      case 'paternite':
        return 'bg-indigo-500/20 text-indigo-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatutBadgeColor = (statut: string): string => {
    switch (statut) {
      case 'en_attente':
        return 'bg-amber-500/20 text-amber-400';
      case 'approuve':
        return 'bg-green-500/20 text-green-400';
      case 'rejete':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getTypeLabel = (type: string): string => {
    const typeObj = congeTypes.find((t) => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  const calculateJours = (dateDebut: string, dateFin: string): number => {
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    const diffTime = Math.abs(fin.getTime() - debut.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
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
          <h1 className="text-3xl font-bold text-white">Gestion des Congés</h1>
          <p className="mt-2 text-sm text-gray-400">
            Gestion des demandes de congés et absences
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nouvelle demande</span>
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
            {congeTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
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
            <option value="en_attente">En attente</option>
            <option value="approuve">Approuvé</option>
            <option value="rejete">Rejeté</option>
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
                Du
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Au
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Jours
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Motif
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
            {filteredConges.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Aucune demande trouvée
                </td>
              </tr>
            ) : (
              filteredConges.map((conge) => (
                <tr key={conge.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-white">
                    {conge.membreNom}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getTypeBadgeColor(conge.type)}`}>
                      {getTypeLabel(conge.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {new Date(conge.dateDebut).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {new Date(conge.dateFin).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-semibold">
                    {calculateJours(conge.dateDebut, conge.dateFin)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {conge.motif}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatutBadgeColor(conge.statut)}`}>
                      {conge.statut === 'en_attente'
                        ? 'En attente'
                        : conge.statut === 'approuve'
                        ? 'Approuvé'
                        : 'Rejeté'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {conge.statut === 'en_attente' ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(conge.id)}
                          disabled={approvingId === conge.id}
                          className="text-green-400 transition-colors hover:text-green-300 disabled:opacity-50"
                          title="Approuver"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReject(conge.id)}
                          disabled={rejectingId === conge.id}
                          className="text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                          title="Rejeter"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(conge)}
                          className="text-indigo-400 transition-colors hover:text-indigo-300"
                          title="Modifier"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(conge.id)}
                          disabled={deletingId === conge.id}
                          className="text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(conge)}
                          className="text-indigo-400 transition-colors hover:text-indigo-300"
                          title="Modifier"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(conge.id)}
                          disabled={deletingId === conge.id}
                          className="text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-400">
        Affichage de {filteredConges.length} sur {conges.length} demandes
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingConge ? 'Modifier la demande' : 'Nouvelle demande de congé'}
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
                    Type de congé
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {congeTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
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
                    Motif
                  </label>
                  <textarea
                    value={formData.motif}
                    onChange={(e) =>
                      setFormData({ ...formData, motif: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={3}
                    placeholder="Motif de la demande..."
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
