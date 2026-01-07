'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import type { Lead } from '@talosprimes/shared';
import { 
  UserPlusIcon, 
  UserIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type LeadSource = 'formulaire_inscription' | 'admin' | 'all';

export default function OnboardingPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<LeadSource>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    notes: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadLeads();
  }, [router, filterSource]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: { source?: string } = {};
      if (filterSource !== 'all') {
        params.source = filterSource;
      }
      
      const response = await apiClient.leads.list(params);
      setLeads(response.data.leads as Lead[]);
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
      if (!formData.nom || !formData.prenom || !formData.email || !formData.telephone) {
        setError('Tous les champs sont requis');
        return;
      }

      await apiClient.leads.create({
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        source: 'admin',
        notes: formData.notes || undefined,
      });

      setShowCreateModal(false);
      setFormData({ nom: '', prenom: '', email: '', telephone: '', notes: '' });
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: 'nouveau' | 'contacte' | 'converti' | 'abandonne') => {
    try {
      await apiClient.leads.updateStatus(leadId, newStatus);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData({
      nom: lead.nom,
      prenom: lead.prenom,
      email: lead.email,
      telephone: lead.telephone,
      notes: lead.notes || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedLead) return;

    try {
      await handleUpdateStatus(selectedLead.id, selectedLead.statut);
      setShowEditModal(false);
      setSelectedLead(null);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce lead ?')) {
      return;
    }

    try {
      await apiClient.leads.delete(leadId);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.nom.toLowerCase().includes(query) ||
      lead.prenom.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.telephone.includes(query)
    );
  });

  const leadsInscrits = filteredLeads.filter(l => l.source === 'formulaire_inscription');
  const leadsAdmin = filteredLeads.filter(l => l.source === 'admin' || l.source === null);

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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Onboarding</h1>
          <p className="mt-2 text-sm text-gray-400">
            Gestion des leads et inscriptions
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ nom: '', prenom: '', email: '', telephone: '', notes: '' });
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
        >
          <UserPlusIcon className="h-5 w-5" />
          Créer un lead
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

      {/* Filtres et recherche */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterSource('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterSource === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilterSource('formulaire_inscription')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterSource === 'formulaire_inscription'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Inscrits
          </button>
          <button
            onClick={() => setFilterSource('admin')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterSource === 'admin'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Créés par admin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Total Leads</h3>
            <UserIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{filteredLeads.length}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Inscrits</h3>
            <UserPlusIcon className="h-6 w-6 text-green-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{leadsInscrits.length}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Créés par admin</h3>
            <UserIcon className="h-6 w-6 text-yellow-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{leadsAdmin.length}</p>
        </div>
      </div>

      {/* Liste des leads inscrits */}
      {filterSource === 'all' || filterSource === 'formulaire_inscription' ? (
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md mb-6">
          <div className="px-6 py-4 border-b border-gray-700/30">
            <h3 className="text-lg font-medium text-white">Leads Inscrits</h3>
            <p className="mt-1 text-sm text-gray-400">Leads provenant du formulaire d'inscription</p>
          </div>
          <div className="p-6">
            {leadsInscrits.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <UserPlusIcon className="mx-auto h-12 w-12 text-gray-600" />
                <p className="mt-4 text-gray-400">Aucun lead inscrit pour le moment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700/30">
                  <thead className="bg-gray-800/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Téléphone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                    {leadsInscrits.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-800/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {lead.prenom} {lead.nom}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.telephone}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={lead.statut}
                            onChange={(e) => handleUpdateStatus(lead.id, e.target.value as typeof lead.statut)}
                            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="nouveau">Nouveau</option>
                            <option value="contacte">Contacté</option>
                            <option value="converti">Converti</option>
                            <option value="abandonne">Abandonné</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(lead)}
                              className="text-indigo-400 hover:text-indigo-300"
                              title="Modifier"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(lead.id)}
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
            )}
          </div>
        </div>
      ) : null}

      {/* Liste des leads créés par admin */}
      {filterSource === 'all' || filterSource === 'admin' ? (
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md">
          <div className="px-6 py-4 border-b border-gray-700/30">
            <h3 className="text-lg font-medium text-white">Leads Créés par Admin</h3>
            <p className="mt-1 text-sm text-gray-400">Leads créés manuellement par un administrateur</p>
          </div>
          <div className="p-6">
            {leadsAdmin.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <UserIcon className="mx-auto h-12 w-12 text-gray-600" />
                <p className="mt-4 text-gray-400">Aucun lead créé par admin pour le moment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700/30">
                  <thead className="bg-gray-800/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Téléphone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                    {leadsAdmin.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-800/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {lead.prenom} {lead.nom}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.telephone}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={lead.statut}
                            onChange={(e) => handleUpdateStatus(lead.id, e.target.value as typeof lead.statut)}
                            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="nouveau">Nouveau</option>
                            <option value="contacte">Contacté</option>
                            <option value="converti">Converti</option>
                            <option value="abandonne">Abandonné</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(lead)}
                              className="text-indigo-400 hover:text-indigo-300"
                              title="Modifier"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(lead.id)}
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
            )}
          </div>
        </div>
      ) : null}

      {/* Modal Créer */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Créer un lead</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Prénom *</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Téléphone *</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
              >
                Créer
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier */}
      {showEditModal && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Modifier le lead</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedLead(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Statut</label>
                <select
                  value={selectedLead.statut}
                  onChange={(e) => setSelectedLead({ ...selectedLead, statut: e.target.value as typeof selectedLead.statut })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="nouveau">Nouveau</option>
                  <option value="contacte">Contacté</option>
                  <option value="converti">Converti</option>
                  <option value="abandonne">Abandonné</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
              >
                Enregistrer
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedLead(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
