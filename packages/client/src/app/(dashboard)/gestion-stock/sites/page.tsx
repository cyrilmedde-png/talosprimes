'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  BuildingOffice2Icon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface StockSite {
  id: string;
  tenantId: string;
  code: string;
  designation: string;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  responsable?: string | null;
  statut: string;
  createdAt: string;
  updatedAt: string;
  _count?: { stockLevels: number; movementsOnSite: number };
}

interface FormData {
  code: string;
  designation: string;
  adresse: string;
  telephone: string;
  email: string;
  responsable: string;
  statut?: string;
}

export default function SitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<StockSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSite, setSelectedSite] = useState<StockSite | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    code: '',
    designation: '',
    adresse: '',
    telephone: '',
    email: '',
    responsable: '',
    statut: 'actif',
  });

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchSites();
  }, [router]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.stockSites.list();
      if (response.success && response.data?.sites) {
        setSites(response.data.sites);
      } else {
        setError('Failed to load sites');
      }
    } catch (err) {
      setError('An error occurred while fetching sites');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = sites.filter((site) => {
    const query = searchQuery.toLowerCase();
    return (
      site.code.toLowerCase().includes(query) ||
      site.designation.toLowerCase().includes(query)
    );
  });

  const resetForm = () => {
    setFormData({
      code: '',
      designation: '',
      adresse: '',
      telephone: '',
      email: '',
      responsable: '',
      statut: 'actif',
    });
  };

  const handleCreateClick = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEditClick = (site: StockSite) => {
    setSelectedSite(site);
    setFormData({
      code: site.code,
      designation: site.designation,
      adresse: site.adresse || '',
      telephone: site.telephone || '',
      email: site.email || '',
      responsable: site.responsable || '',
      statut: site.statut,
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (site: StockSite) => {
    setSelectedSite(site);
    setShowDeleteConfirm(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const response = await apiClient.stockSites.create(formData);
      if (response.success) {
        setSites([...sites, response.data.site]);
        setShowCreateModal(false);
        resetForm();
      } else {
        setError('Failed to create site');
      }
    } catch (err) {
      setError('An error occurred while creating the site');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) return;
    try {
      setSubmitting(true);
      setError(null);
      const response = await apiClient.stockSites.update(selectedSite.id, formData);
      if (response.success) {
        setSites(sites.map((site) => (site.id === selectedSite.id ? response.data.site : site)));
        setShowEditModal(false);
        resetForm();
        setSelectedSite(null);
      } else {
        setError('Failed to update site');
      }
    } catch (err) {
      setError('An error occurred while updating the site');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSite) return;
    try {
      setSubmitting(true);
      setError(null);
      const response = await apiClient.stockSites.delete(selectedSite.id);
      if (response.success) {
        setSites(sites.filter((site) => site.id !== selectedSite.id));
        setShowDeleteConfirm(false);
        setSelectedSite(null);
      } else {
        setError('Failed to delete site');
      }
    } catch (err) {
      setError('An error occurred while deleting the site');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (statut: string) => {
    if (statut === 'actif') {
      return (
        <span className="inline-flex items-center rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-400 border border-green-500/30">
          Actif
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-400 border border-red-500/30">
        Inactif
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BuildingOffice2Icon className="h-8 w-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Sites/Entrepôts</h1>
                <p className="mt-1 text-sm text-gray-400">Gestion des sites de stockage</p>
              </div>
            </div>
            <button
              onClick={handleCreateClick}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Nouveau Site
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-500/10 p-4 border border-red-500/30">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher par code ou designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-gray-800 pl-10 pr-4 py-2.5 text-white placeholder-gray-500 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-400">Chargement des sites...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
              {filteredSites.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-gray-400">
                    {searchQuery ? 'Aucun site trouvé' : 'Aucun site disponible'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-700 bg-gray-800/80">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                          Designation
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                          Responsable
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredSites.map((site) => (
                        <tr key={site.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-white">
                            {site.code}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {site.designation}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {site.responsable || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm">{getStatusBadge(site.statut)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditClick(site)}
                                className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                title="Modifier"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(site)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
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

            {/* Results Count */}
            <p className="mt-4 text-sm text-gray-400">
              {filteredSites.length} site{filteredSites.length !== 1 ? 's' : ''} affichés
            </p>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-gray-800 border border-gray-700 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Créer un nouveau site</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="EX: SITE-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Désignation *
                </label>
                <input
                  type="text"
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Entrepôt Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="123 Rue de l'Entrepôt"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="+33 1 23 45 67 89"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="contact@entrepot.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Responsable
                </label>
                <input
                  type="text"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-gray-800 border border-gray-700 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Modifier le site</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                  setSelectedSite(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Désignation *
                </label>
                <input
                  type="text"
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Responsable
                </label>
                <input
                  type="text"
                  value={formData.responsable}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white placeholder-gray-500 border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Statut *
                </label>
                <select
                  value={formData.statut}
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                    setSelectedSite(null);
                  }}
                  className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-gray-800 border border-gray-700 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-2">Confirmer la suppression</h2>
            <p className="text-gray-400 mb-6">
              Êtes-vous sûr de vouloir supprimer le site <strong>{selectedSite.designation}</strong> ?
              Cette action ne peut pas être annulée.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedSite(null);
                }}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
