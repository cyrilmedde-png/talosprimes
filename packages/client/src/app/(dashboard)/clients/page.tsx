'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import type { Lead, ClientFinal } from '@talosprimes/shared';
import { 
  UserPlusIcon, 
  UserIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  UserCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

type CreateMode = 'from-lead' | 'direct';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientFinal[]>([]);
  const [leadsConvertis, setLeadsConvertis] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createMode, setCreateMode] = useState<CreateMode>('from-lead');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientFinal | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    type: 'b2c' as 'b2b' | 'b2c',
    raisonSociale: '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    tags: [] as string[],
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadClients();
    loadLeadsConvertis();
  }, [router]);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.clients.list();
      const clientsList = response.data.clients as ClientFinal[];
      setClients(clientsList);
      
      // Charger les leads convertis après le chargement des clients
      // pour pouvoir filtrer ceux qui sont déjà des clients
      const leadsResponse = await apiClient.leads.list({ statut: 'converti' });
      const leads = leadsResponse.data.leads as Lead[];
      const clientEmails = new Set(clientsList.map(client => client.email.toLowerCase()));
      const leadsNonClients = leads.filter(
        lead => !clientEmails.has(lead.email.toLowerCase())
      );
      setLeadsConvertis(leadsNonClients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      if (err instanceof Error && err.message.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLeadsConvertis = async () => {
    try {
      const response = await apiClient.leads.list({ statut: 'converti' });
      const leads = response.data.leads as Lead[];
      
      // Filtrer les leads qui sont déjà des clients (par email)
      // On vérifie si un client existe déjà avec cet email
      const clientEmails = new Set(clients.map(client => client.email.toLowerCase()));
      const leadsNonClients = leads.filter(
        lead => !clientEmails.has(lead.email.toLowerCase())
      );
      
      setLeadsConvertis(leadsNonClients);
    } catch (err) {
      console.error('Erreur lors du chargement des leads convertis:', err);
    }
  };

  // Recharger les leads convertis quand les clients changent (pour filtrer ceux déjà convertis)
  useEffect(() => {
    if (clients.length > 0 || clients.length === 0) {
      loadLeadsConvertis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients.length]);

  const handleCreateFromLead = async (leadId: string) => {
    try {
      await apiClient.clients.createFromLead(leadId);
      setShowCreateModal(false);
      setSelectedLead(null);
      await loadClients(); // Recharger les clients d'abord
      await loadLeadsConvertis(); // Puis recharger les leads convertis (sera filtré automatiquement)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const handleCreateDirect = async () => {
    try {
      if (formData.type === 'b2b' && !formData.raisonSociale) {
        setError('La raison sociale est requise pour un client B2B');
        return;
      }
      if (formData.type === 'b2c' && (!formData.nom || !formData.prenom)) {
        setError('Le nom et prénom sont requis pour un client B2C');
        return;
      }
      if (!formData.email) {
        setError('L\'email est requis');
        return;
      }

      await apiClient.clients.create({
        type: formData.type,
        raisonSociale: formData.raisonSociale || undefined,
        nom: formData.nom || undefined,
        prenom: formData.prenom || undefined,
        email: formData.email,
        telephone: formData.telephone || undefined,
        adresse: formData.adresse || undefined,
        tags: formData.tags,
      });

      setShowCreateModal(false);
      setFormData({
        type: 'b2c',
        raisonSociale: '',
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        adresse: '',
        tags: [],
      });
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const handleEdit = (client: ClientFinal) => {
    setSelectedClient(client);
    setFormData({
      type: client.type,
      raisonSociale: client.raisonSociale || '',
      nom: client.nom || '',
      prenom: client.prenom || '',
      email: client.email,
      telephone: client.telephone || '',
      adresse: client.adresse || '',
      tags: client.tags || [],
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedClient) return;
    try {
      await apiClient.clients.update(selectedClient.id, {
        raisonSociale: formData.raisonSociale || undefined,
        nom: formData.nom || undefined,
        prenom: formData.prenom || undefined,
        email: formData.email,
        telephone: formData.telephone || undefined,
        adresse: formData.adresse || undefined,
        tags: formData.tags,
      });
      setShowEditModal(false);
      setSelectedClient(null);
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    try {
      await apiClient.clients.delete(id);
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return (
      (client.nom?.toLowerCase().includes(query)) ||
      (client.prenom?.toLowerCase().includes(query)) ||
      (client.raisonSociale?.toLowerCase().includes(query)) ||
      client.email.toLowerCase().includes(query) ||
      (client.telephone?.includes(query))
    );
  });

  const filteredLeads = leadsConvertis.filter(lead => {
    const query = searchQuery.toLowerCase();
    return (
      lead.nom.toLowerCase().includes(query) ||
      lead.prenom.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.telephone.includes(query)
    );
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Clients</h1>
          <p className="mt-2 text-sm text-gray-400">
            Gestion des clients finaux
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCreateMode('from-lead');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            <CheckCircleIcon className="h-5 w-5" />
            Créer depuis lead
          </button>
          <button
            onClick={() => {
              setCreateMode('direct');
              setFormData({
                type: 'b2c',
                raisonSociale: '',
                nom: '',
                prenom: '',
                email: '',
                telephone: '',
                adresse: '',
                tags: [],
              });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
          >
            <UserPlusIcon className="h-5 w-5" />
            Nouveau client
          </button>
        </div>
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

      {/* Recherche */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Total Clients</h3>
            <UserIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{filteredClients.length}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Clients B2C</h3>
            <UserCircleIcon className="h-6 w-6 text-green-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {filteredClients.filter(c => c.type === 'b2c').length}
          </p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Clients B2B</h3>
            <BuildingOfficeIcon className="h-6 w-6 text-yellow-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {filteredClients.filter(c => c.type === 'b2b').length}
          </p>
        </div>
      </div>

      {/* Liste des clients */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md">
        <div className="px-6 py-4 border-b border-gray-700/30">
          <h3 className="text-lg font-medium text-white">Liste des Clients</h3>
          <p className="mt-1 text-sm text-gray-400">Tous vos clients finaux</p>
        </div>
        <div className="p-6">
          {filteredClients.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              <UserIcon className="mx-auto h-12 w-12 text-gray-600" />
              <p className="mt-4 text-gray-400">Aucun client pour le moment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700/30">
                <thead className="bg-gray-800/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nom / Raison sociale</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Téléphone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-800/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          client.type === 'b2b' 
                            ? 'bg-yellow-900/30 text-yellow-400' 
                            : 'bg-green-900/30 text-green-400'
                        }`}>
                          {client.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {client.type === 'b2b' 
                          ? client.raisonSociale 
                          : `${client.prenom} ${client.nom}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{client.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{client.telephone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          client.statut === 'actif' 
                            ? 'bg-green-900/30 text-green-400' 
                            : client.statut === 'inactif'
                            ? 'bg-gray-900/30 text-gray-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {client.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(client)}
                            className="text-indigo-400 hover:text-indigo-300"
                            title="Modifier"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
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

      {/* Modal Créer depuis Lead */}
      {showCreateModal && createMode === 'from-lead' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Créer un client depuis un lead converti</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedLead(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              {filteredLeads.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucun lead converti disponible</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-gray-700/30 border border-gray-600/30 rounded p-4 hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{lead.prenom} {lead.nom}</p>
                          <p className="text-gray-400 text-sm">{lead.email}</p>
                          <p className="text-gray-400 text-sm">{lead.telephone}</p>
                        </div>
                        {selectedLead?.id === lead.id && (
                          <CheckCircleIcon className="h-6 w-6 text-green-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedLead(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                >
                  Annuler
                </button>
                <button
                  onClick={() => selectedLead && handleCreateFromLead(selectedLead.id)}
                  disabled={!selectedLead}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md"
                >
                  Créer le client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Créer directement */}
      {showCreateModal && createMode === 'direct' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Créer un nouveau client</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    type: 'b2c',
                    raisonSociale: '',
                    nom: '',
                    prenom: '',
                    email: '',
                    telephone: '',
                    adresse: '',
                    tags: [],
                  });
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type de client</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'b2b' | 'b2c' })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="b2c">B2C (Particulier)</option>
                  <option value="b2b">B2B (Entreprise)</option>
                </select>
              </div>

              {formData.type === 'b2b' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Raison sociale <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.raisonSociale}
                    onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nom <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Prénom <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Adresse</label>
                <textarea
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      type: 'b2c',
                      raisonSociale: '',
                      nom: '',
                      prenom: '',
                      email: '',
                      telephone: '',
                      adresse: '',
                      tags: [],
                    });
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateDirect}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                >
                  Créer le client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Éditer */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Modifier le client</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedClient(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              {selectedClient.type === 'b2b' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Raison sociale</label>
                  <input
                    type="text"
                    value={formData.raisonSociale}
                    onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Prénom</label>
                    <input
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Adresse</label>
                <textarea
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedClient(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

