'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient, ClientSpace } from '@/lib/api-client';
import {
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

interface SpaceStats {
  total: number;
  enAttente: number;
  actifs: number;
  suspendus: number;
}

export default function EspacesClientsPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<ClientSpace[]>([]);
  const [stats, setStats] = useState<SpaceStats>({ total: 0, enAttente: 0, actifs: 0, suspendus: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [confirmValidate, setConfirmValidate] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: { status?: string } = {};
      if (filterStatus) params.status = filterStatus;

      const response = await apiClient.clientSpaces.list(params);
      if (response.success && response.data) {
        const spacesList = response.data.spaces || [];
        setSpaces(spacesList);

        // Calculer les stats localement
        const computedStats: SpaceStats = {
          total: spacesList.length,
          enAttente: spacesList.filter(s => s.status === 'en_attente_validation').length,
          actifs: spacesList.filter(s => s.status === 'actif').length,
          suspendus: spacesList.filter(s => s.status === 'suspendu').length,
        };
        setStats(computedStats);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(errorMessage);
      if (errorMessage.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (spaceId: string) => {
    try {
      setActionLoading(spaceId);
      setError(null);
      const response = await apiClient.clientSpaces.validate(spaceId);
      if (response.success) {
        setConfirmValidate(null);
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendEmail = async (spaceId: string) => {
    try {
      setActionLoading(spaceId);
      setError(null);
      const response = await apiClient.clientSpaces.resendEmail(spaceId);
      if (response.success) {
        setError(null);
        // Show success briefly
        const emailSent = response.data?.email || '';
        alert(`Email renvoyé à ${emailSent}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du renvoi');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
  };

  useEffect(() => {
    if (!loading) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'en_creation':
        return { color: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/30', label: 'En création' };
      case 'en_attente_validation':
        return { color: 'bg-orange-900/30 text-orange-300 border-orange-700/30', label: 'En attente' };
      case 'actif':
        return { color: 'bg-green-900/30 text-green-300 border-green-700/30', label: 'Actif' };
      case 'suspendu':
        return { color: 'bg-red-900/30 text-red-300 border-red-700/30', label: 'Suspendu' };
      case 'supprime':
        return { color: 'bg-gray-900/30 text-gray-400 border-gray-700/30', label: 'Supprimé' };
      default:
        return { color: 'bg-gray-900/30 text-gray-300 border-gray-700/30', label: status };
    }
  };

  if (loading && spaces.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement des espaces clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Espaces Clients</h1>
        <p className="mt-2 text-sm text-gray-400">
          Gestion des espaces clients provisionnés automatiquement
        </p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Total</h3>
            <FolderIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.total}</p>
        </div>

        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">En attente</h3>
            <ClockIcon className="h-6 w-6 text-orange-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.enAttente}</p>
        </div>

        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Actifs</h3>
            <CheckCircleIcon className="h-6 w-6 text-green-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.actifs}</p>
        </div>

        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Suspendus</h3>
            <XMarkIcon className="h-6 w-6 text-red-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.suspendus}</p>
        </div>
      </div>

      {/* Filtre */}
      <div className="mb-6 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
        <h3 className="text-lg font-semibold text-white mb-4">Filtrer par statut</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleFilterChange('')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === '' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => handleFilterChange('en_attente_validation')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === 'en_attente_validation' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            En attente
          </button>
          <button
            onClick={() => handleFilterChange('actif')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === 'actif' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Actifs
          </button>
          <button
            onClick={() => handleFilterChange('suspendu')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterStatus === 'suspendu' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Suspendus
          </button>
        </div>
      </div>

      {/* Confirmation modale */}
      {confirmValidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Confirmer la validation</h3>
            <p className="text-gray-300 mb-6">
              Voulez-vous valider cet espace client ? Les identifiants de connexion seront envoyés par email au client.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmValidate(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => handleValidate(confirmValidate)}
                disabled={actionLoading === confirmValidate}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-md text-sm font-medium"
              >
                {actionLoading === confirmValidate ? 'Validation...' : 'Valider et envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md overflow-hidden">
        <div className="p-6 border-b border-gray-700/30">
          <h2 className="text-xl font-bold text-white">
            Liste des espaces ({spaces.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700/30">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Client</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Modules</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Statut</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {spaces.length > 0 ? (
                spaces.map((space) => {
                  const badge = getStatusBadge(space.status);
                  const clientName = space.raisonSociale || `${space.clientPrenom || ''} ${space.clientNom || ''}`.trim() || 'N/A';
                  return (
                    <tr key={space.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-white">{clientName}</p>
                            <p className="text-xs text-gray-500">{space.tenantSlug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {space.clientEmail || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(space.modulesActives || []).length > 0 ? (
                            space.modulesActives.slice(0, 3).map((mod, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-xs bg-indigo-900/30 text-indigo-300 border border-indigo-700/30">
                                {mod}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500">Aucun</span>
                          )}
                          {(space.modulesActives || []).length > 3 && (
                            <span className="text-xs text-gray-400">+{space.modulesActives.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full border text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {new Date(space.createdAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {space.status === 'en_attente_validation' && (
                            <button
                              onClick={() => setConfirmValidate(space.id)}
                              disabled={actionLoading === space.id}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                              Valider
                            </button>
                          )}
                          {space.status === 'actif' && (
                            <button
                              onClick={() => handleResendEmail(space.id)}
                              disabled={actionLoading === space.id}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                            >
                              <EnvelopeIcon className="h-4 w-4" />
                              {actionLoading === space.id ? 'Envoi...' : 'Renvoyer email'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    Aucun espace client trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
