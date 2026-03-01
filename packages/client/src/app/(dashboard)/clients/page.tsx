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
  SparklesIcon,
  CreditCardIcon,
  ArrowPathIcon,
  PauseIcon,
  PlayIcon,
  NoSymbolIcon,
  EnvelopeIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
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
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientFinal | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [creatingFromLead, setCreatingFromLead] = useState(false);
  const [clientSubscriptions, setClientSubscriptions] = useState<Record<string, { id: string; nomPlan: string; montantMensuel: number; modulesInclus: string[]; statut: string } | null>>({});
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionDetail, setSubscriptionDetail] = useState<{
    subscription: { id: string; nomPlan: string; montantMensuel: number; modulesInclus: string[]; statut: string; dateDebut: string; dateProchainRenouvellement: string; idAbonnementStripe?: string; idClientStripe?: string };
    space: { id: string; status: string; tenantSlug?: string; clientTenantId?: string; modulesActives?: string[] } | null;
  } | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const [onboardingData, setOnboardingData] = useState({
    nomPlan: 'Plan Starter',
    montantMensuel: 29.99,
    modulesInclus: ['facturation', 'comptabilite', 'agent_ia'] as string[],
    dureeMois: 1,
    avecStripe: false, // Option pour activer/désactiver Stripe
    avecSousDomaine: false, // Option pour créer un sous-domaine
    sousDomaine: '', // ex: "client-dupont" → client-dupont.talosprimes.com
  });
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
  }, [router]);

  // Gérer le retour de Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');
    const clientId = params.get('clientId');
    
    if (checkoutStatus === 'success' && clientId) {
      setError(null);
      // Recharger les clients pour voir la mise à jour
      loadClients();
      // Nettoyer l'URL
      window.history.replaceState({}, '', '/clients');
    } else if (checkoutStatus === 'cancelled') {
      setError('Paiement annulé. L\'espace client a été créé mais l\'abonnement n\'a pas été activé.');
      window.history.replaceState({}, '', '/clients');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClients = async (): Promise<ClientFinal[] | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.clients.list();
      const clientsList = response.data.clients as ClientFinal[];
      setClients(clientsList);

      // Charger les abonnements pour chaque client
      const subscriptions: Record<string, { id: string; nomPlan: string; montantMensuel: number; modulesInclus: string[]; statut: string } | null> = {};
      for (const client of clientsList) {
        try {
          const subResponse = await apiClient.clients.getSubscription(client.id);
          subscriptions[client.id] = subResponse.data.subscription;
        } catch (err) {
          subscriptions[client.id] = null;
        }
      }
      setClientSubscriptions(subscriptions);

      // Charger les leads convertis avec la liste fraîche (évite état asynchrone)
      const leadsResponse = await apiClient.leads.list({ statut: 'converti' });
      const leads = leadsResponse.data.leads as Lead[];
      const clientEmails = new Set(clientsList.map(client => client.email.toLowerCase()));
      const leadsNonClients = leads.filter(
        lead => !clientEmails.has(lead.email.toLowerCase())
      );
      setLeadsConvertis(leadsNonClients);

      return clientsList;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      if (err instanceof Error && err.message.includes('Session expirée')) {
        router.push('/login');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  /** Recharge les leads du tunnel. Si clientsList est fourni, l'utilise pour filtrer (évite état React asynchrone). */
  const loadLeadsConvertis = async (clientsList?: ClientFinal[] | null) => {
    try {
      const response = await apiClient.leads.list({ statut: 'converti' });
      const leads = response.data.leads as Lead[];
      const listToUse = clientsList ?? clients;
      const clientEmails = new Set(listToUse.map(client => client.email.toLowerCase()));
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
    setCreatingFromLead(true);
    setError(null);
    try {
      await apiClient.clients.createFromLead(leadId);
      setShowCreateModal(false);
      setSelectedLead(null);
      // Utiliser la liste retournée pour filtrer le tunnel tout de suite (état React pas encore à jour)
      const newClients = await loadClients();
      await loadLeadsConvertis(newClients ?? undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      // Fermer le modal pour ne pas rester bloqué ; l'erreur s'affiche sur la page
      setShowCreateModal(false);
      setSelectedLead(null);
    } finally {
      setCreatingFromLead(false);
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

  const handleAbandonLead = async (leadId: string, leadName: string) => {
    if (!confirm(`Abandonner le lead "${leadName}" ? Il sera retiré du tunnel.`)) return;
    try {
      await apiClient.leads.updateStatus(leadId, 'abandonne');
      // Recharger le tunnel immédiatement
      await loadLeadsConvertis();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'abandon du lead');
    }
  };

  const handleCreateOnboarding = async () => {
    if (!selectedClient) return;
    try {
      const response = await apiClient.clients.createOnboarding(selectedClient.id, onboardingData);
      
      // Si Stripe est activé et qu'on a une URL de checkout, rediriger vers Stripe
      const checkoutUrl = response.data?.checkoutUrl
        || response.data?.stripe?.checkoutUrl
        || response.data?.stripe?.checkout_url;
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank');
        setShowOnboardingModal(false);
        setSelectedClient(null);
        await loadClients();
        return;
      }
      
      // Sinon, comportement normal
      setShowOnboardingModal(false);
      setSelectedClient(null);
      setOnboardingData({
        nomPlan: 'Plan Starter',
        montantMensuel: 29.99,
        modulesInclus: ['facturation', 'comptabilite', 'agent_ia'],
        dureeMois: 1,
        avecStripe: false,
        avecSousDomaine: false,
        sousDomaine: '',
      });
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de l\'espace client');
    }
  };

  const handleOpenOnboarding = (client: ClientFinal) => {
    setSelectedClient(client);
    setOnboardingData({
      nomPlan: 'Plan Starter',
      montantMensuel: 29.99,
      modulesInclus: ['facturation', 'comptabilite', 'agent_ia'],
      dureeMois: 1,
      avecStripe: false,
      avecSousDomaine: false,
      sousDomaine: '',
    });
    setShowOnboardingModal(true);
  };

  const handleManageSubscription = async (client: ClientFinal) => {
    try {
      setSubscriptionLoading(true);
      setSelectedClient(client);

      // Fetch abonnement + espaces en parallèle
      const [subResponse, spacesResponse] = await Promise.all([
        apiClient.clients.getSubscription(client.id),
        apiClient.clientSpaces.list(),
      ]);

      const subscription = subResponse.data.subscription;
      if (!subscription) {
        setError('Abonnement non trouvé');
        setSubscriptionLoading(false);
        return;
      }

      // Trouver l'espace client associé
      const spaces = (spacesResponse.data as { clientSpaces?: Array<{ id: string; clientFinalId?: string; status: string; tenantSlug?: string; clientTenantId?: string; modulesActives?: string[] }> }).clientSpaces || [];
      const space = spaces.find((s: { clientFinalId?: string }) => s.clientFinalId === client.id) || null;

      setSubscriptionDetail({ subscription, space });
      setShowSubscriptionModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la récupération de l\'abonnement');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleSubscriptionAction = async (action: 'renew' | 'suspend' | 'reactivate' | 'cancel') => {
    if (!subscriptionDetail?.subscription) return;
    const subId = subscriptionDetail.subscription.id;
    const labels = { renew: 'renouveler', suspend: 'suspendre', reactivate: 'réactiver', cancel: 'annuler' };

    if (action !== 'renew' && !confirm(`Êtes-vous sûr de vouloir ${labels[action]} cet abonnement ?`)) return;

    try {
      if (action === 'renew') await apiClient.subscriptions.renew(subId);
      else if (action === 'suspend') await apiClient.subscriptions.suspend(subId);
      else if (action === 'reactivate') await apiClient.subscriptions.reactivate(subId);
      else if (action === 'cancel') await apiClient.subscriptions.cancel(subId);

      // Recharger les données du modal
      if (selectedClient) await handleManageSubscription(selectedClient);
      await loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Erreur lors de l'action ${labels[action]}`);
    }
  };

  const handleValidateSpace = async (spaceId: string) => {
    try {
      await apiClient.clientSpaces.validate(spaceId);
      if (selectedClient) await handleManageSubscription(selectedClient);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation');
    }
  };

  const handleResendEmail = async (spaceId: string) => {
    try {
      await apiClient.clientSpaces.resendEmail(spaceId);
      setError(null);
      alert('Identifiants renvoyés avec succès');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
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

  // Séparer les clients par type
  const clientsB2C = filteredClients.filter(client => client.type === 'b2c');
  const clientsB2B = filteredClients.filter(client => client.type === 'b2b');

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
      <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Clients</h1>
          <p className="mt-2 text-sm text-gray-400">
            Gestion des clients finaux
          </p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
          <button
            onClick={() => {
              setCreateMode('from-lead');
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
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
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium text-gray-400">Total Clients</h3>
            <UserIcon className="h-5 sm:h-6 w-5 sm:w-6 text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">{filteredClients.length}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium text-gray-400">Clients B2C</h3>
            <UserCircleIcon className="h-5 sm:h-6 w-5 sm:w-6 text-green-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">
            {filteredClients.filter(c => c.type === 'b2c').length}
          </p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-3 sm:p-6 backdrop-blur-md col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-medium text-gray-400">Clients B2B</h3>
            <BuildingOfficeIcon className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white">
            {filteredClients.filter(c => c.type === 'b2b').length}
          </p>
        </div>
      </div>

      {/* Liste des clients groupés par type */}
      {filteredClients.length === 0 ? (
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
          <div className="text-gray-500 text-center py-8">
            <UserIcon className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">Aucun client pour le moment</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section Clients B2C (Particuliers) */}
          {clientsB2C.length > 0 && (
            <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md">
              <div className="px-6 py-4 border-b border-gray-700/30 bg-green-900/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCircleIcon className="h-6 w-6 text-green-400" />
                    <div>
                      <h3 className="text-lg font-medium text-white">Clients B2C (Particuliers)</h3>
                      <p className="mt-1 text-sm text-gray-400">{clientsB2C.length} client{clientsB2C.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700/30">
                    <thead className="bg-gray-800/30">
                      <tr>
                        <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Nom / Prénom</th>
                        <th className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                        <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Téléphone</th>
                        <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                        <th className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                        <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                      {clientsB2C.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-800/30">
                          <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-white">
                            {client.prenom} {client.nom}
                          </td>
                          <td className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-300">{client.email}</td>
                          <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-300">{client.telephone || '-'}</td>
                          <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap">
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
                          <td className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-400">
                            {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              {!clientSubscriptions[client.id] && (
                                <button
                                  onClick={() => handleOpenOnboarding(client)}
                                  className="text-green-400 hover:text-green-300"
                                  title="Créer espace client"
                                >
                                  <SparklesIcon className="h-5 w-5" />
                                </button>
                              )}
                              {clientSubscriptions[client.id] && (
                                <button
                                  onClick={() => handleManageSubscription(client)}
                                  className="text-green-400 hover:text-green-300"
                                  title={`Gérer l'abonnement: ${clientSubscriptions[client.id]?.nomPlan}`}
                                  disabled={subscriptionLoading}
                                >
                                  {subscriptionLoading && selectedClient?.id === client.id ? (
                                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                  ) : (
                                    <CreditCardIcon className="h-5 w-5" />
                                  )}
                                </button>
                              )}
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
              </div>
            </div>
          )}

          {/* Section Clients B2B (Entreprises) */}
          {clientsB2B.length > 0 && (
            <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md">
              <div className="px-6 py-4 border-b border-gray-700/30 bg-yellow-900/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BuildingOfficeIcon className="h-6 w-6 text-yellow-400" />
                    <div>
                      <h3 className="text-lg font-medium text-white">Clients B2B (Entreprises)</h3>
                      <p className="mt-1 text-sm text-gray-400">{clientsB2B.length} client{clientsB2B.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700/30">
                    <thead className="bg-gray-800/30">
                      <tr>
                        <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Raison sociale</th>
                        <th className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                        <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Téléphone</th>
                        <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                        <th className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                        <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                      {clientsB2B.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-800/30">
                          <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-white">
                            {client.raisonSociale}
                          </td>
                          <td className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-300">{client.email}</td>
                          <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-300">{client.telephone || '-'}</td>
                          <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap">
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
                          <td className="hidden sm:table-cell px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-400">
                            {new Date(client.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              {!clientSubscriptions[client.id] && (
                                <button
                                  onClick={() => handleOpenOnboarding(client)}
                                  className="text-green-400 hover:text-green-300"
                                  title="Créer espace client"
                                >
                                  <SparklesIcon className="h-5 w-5" />
                                </button>
                              )}
                              {clientSubscriptions[client.id] && (
                                <button
                                  onClick={() => handleManageSubscription(client)}
                                  className="text-green-400 hover:text-green-300"
                                  title={`Gérer l'abonnement: ${clientSubscriptions[client.id]?.nomPlan}`}
                                  disabled={subscriptionLoading}
                                >
                                  {subscriptionLoading && selectedClient?.id === client.id ? (
                                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                  ) : (
                                    <CreditCardIcon className="h-5 w-5" />
                                  )}
                                </button>
                              )}
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
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Créer depuis Lead */}
      {showCreateModal && createMode === 'from-lead' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-2 sm:mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Créer un client depuis un lead converti</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedLead(null);
                }}
                className="text-gray-400 hover:text-white flex-shrink-0"
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
                      className={`bg-gray-700/30 border rounded p-4 hover:bg-gray-700/50 cursor-pointer transition-colors ${
                        selectedLead?.id === lead.id ? 'border-green-500/50' : 'border-gray-600/30'
                      }`}
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium">{lead.prenom} {lead.nom}</p>
                          <p className="text-gray-400 text-sm">{lead.email}</p>
                          <p className="text-gray-400 text-sm">{lead.telephone}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAbandonLead(lead.id, `${lead.prenom} ${lead.nom}`);
                            }}
                            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/20 transition-colors"
                            title="Abandonner ce lead"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                          {selectedLead?.id === lead.id && (
                            <CheckCircleIcon className="h-6 w-6 text-green-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2">
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
                  disabled={!selectedLead || creatingFromLead}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md"
                >
                  {creatingFromLead ? 'Création...' : 'Créer le client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Créer directement */}
      {showCreateModal && createMode === 'direct' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-2 sm:mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Créer un nouveau client</h2>
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
                className="text-gray-400 hover:text-white flex-shrink-0"
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

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2">
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
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-2 sm:mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Modifier le client</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedClient(null);
                }}
                className="text-gray-400 hover:text-white flex-shrink-0"
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

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2">
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

      {/* Modal Créer Espace Client */}
      {showOnboardingModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-2 sm:mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">Créer l'espace client</h2>
              <button
                onClick={() => {
                  setShowOnboardingModal(false);
                  setSelectedClient(null);
                }}
                className="text-gray-400 hover:text-white flex-shrink-0"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gray-700/30 p-4 rounded-lg">
                <p className="text-sm text-gray-300 mb-2">Client :</p>
                <p className="text-white font-medium">
                  {selectedClient.type === 'b2b' 
                    ? selectedClient.raisonSociale 
                    : `${selectedClient.prenom} ${selectedClient.nom}`}
                </p>
                <p className="text-sm text-gray-400">{selectedClient.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom du plan <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={onboardingData.nomPlan}
                  onChange={(e) => setOnboardingData({ ...onboardingData, nomPlan: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Plan Starter"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Montant mensuel (€) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={onboardingData.montantMensuel}
                  onChange={(e) => setOnboardingData({ ...onboardingData, montantMensuel: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Durée (mois) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={onboardingData.dureeMois}
                  onChange={(e) => setOnboardingData({ ...onboardingData, dureeMois: parseInt(e.target.value) || 1 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Modules à activer
                </label>
                <div className="space-y-2">
                  {['facturation', 'comptabilite', 'agent_ia'].map((module) => (
                    <label key={module} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onboardingData.modulesInclus.includes(module)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setOnboardingData({
                              ...onboardingData,
                              modulesInclus: [...onboardingData.modulesInclus, module],
                            });
                          } else {
                            setOnboardingData({
                              ...onboardingData,
                              modulesInclus: onboardingData.modulesInclus.filter(m => m !== module),
                            });
                          }
                        }}
                        className="rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-300 capitalize">{module.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Modules sélectionnés : {onboardingData.modulesInclus.length}
                </p>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onboardingData.avecStripe}
                    onChange={(e) => setOnboardingData({ ...onboardingData, avecStripe: e.target.checked })}
                    className="rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-300">Créer l'abonnement Stripe</span>
                    <p className="text-xs text-gray-400">Active la création automatique d'un abonnement Stripe avec paiement récurrent</p>
                  </div>
                </label>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onboardingData.avecSousDomaine}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setOnboardingData({
                        ...onboardingData,
                        avecSousDomaine: checked,
                        sousDomaine: checked && !onboardingData.sousDomaine
                          ? (selectedClient?.raisonSociale || selectedClient?.nom || '')
                              .toLowerCase()
                              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                              .replace(/[^a-z0-9-]/g, '-')
                              .replace(/-+/g, '-')
                              .replace(/^-|-$/g, '')
                          : onboardingData.sousDomaine,
                      });
                    }}
                    className="rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-300">Créer un sous-domaine</span>
                    <p className="text-xs text-gray-400">Crée automatiquement un espace accessible via sous-domaine.talosprimes.com</p>
                  </div>
                </label>
                {onboardingData.avecSousDomaine && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Sous-domaine <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-0">
                      <input
                        type="text"
                        value={onboardingData.sousDomaine}
                        onChange={(e) => setOnboardingData({
                          ...onboardingData,
                          sousDomaine: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, '-')
                            .replace(/-+/g, '-'),
                        })}
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-l px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="nom-client"
                      />
                      <span className="bg-gray-600 border border-gray-600 border-l-0 rounded-r px-3 py-2 text-gray-400 text-sm">
                        .talosprimes.com
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      L'espace sera accessible à : <span className="text-indigo-400">{onboardingData.sousDomaine || '...'}.talosprimes.com</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowOnboardingModal(false);
                    setSelectedClient(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateOnboarding}
                  disabled={!onboardingData.nomPlan || onboardingData.modulesInclus.length === 0 || (onboardingData.avecSousDomaine && !onboardingData.sousDomaine)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md"
                >
                  Créer l'espace client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gérer l'abonnement */}
      {showSubscriptionModal && selectedClient && subscriptionDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-3xl w-full mx-2 sm:mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start sm:items-center mb-6 gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Gérer l'abonnement</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedClient.type === 'b2b'
                    ? selectedClient.raisonSociale
                    : `${selectedClient.prenom} ${selectedClient.nom}`}
                  {' '}&mdash; {selectedClient.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSubscriptionModal(false);
                  setSubscriptionDetail(null);
                  setSelectedClient(null);
                }}
                className="text-gray-400 hover:text-white flex-shrink-0"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Section 1 : Abonnement */}
            <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCardIcon className="h-5 w-5 text-indigo-400" />
                <h3 className="text-md font-semibold text-white">Abonnement</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Plan</p>
                  <p className="text-white font-medium">{subscriptionDetail.subscription.nomPlan}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Montant mensuel</p>
                  <p className="text-white font-medium">{subscriptionDetail.subscription.montantMensuel} €/mois</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Statut</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
                    subscriptionDetail.subscription.statut === 'actif'
                      ? 'bg-green-900/30 text-green-400'
                      : subscriptionDetail.subscription.statut === 'suspendu'
                      ? 'bg-yellow-900/30 text-yellow-400'
                      : subscriptionDetail.subscription.statut === 'annule'
                      ? 'bg-red-900/30 text-red-400'
                      : 'bg-gray-900/30 text-gray-400'
                  }`}>
                    {subscriptionDetail.subscription.statut}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Prochain renouvellement</p>
                  <p className="text-white text-sm">
                    {new Date(subscriptionDetail.subscription.dateProchainRenouvellement).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              {subscriptionDetail.subscription.modulesInclus && subscriptionDetail.subscription.modulesInclus.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-2">Modules inclus</p>
                  <div className="flex flex-wrap gap-2">
                    {subscriptionDetail.subscription.modulesInclus.map((mod) => (
                      <span key={mod} className="px-2 py-1 bg-indigo-900/30 text-indigo-300 text-xs rounded capitalize">
                        {mod.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {subscriptionDetail.subscription.idAbonnementStripe && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400">Stripe</p>
                  <p className="text-gray-300 text-xs font-mono">{subscriptionDetail.subscription.idAbonnementStripe}</p>
                </div>
              )}
            </div>

            {/* Section 2 : Espace client */}
            <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <GlobeAltIcon className="h-5 w-5 text-green-400" />
                <h3 className="text-md font-semibold text-white">Espace client</h3>
              </div>
              {subscriptionDetail.space ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-400">Statut</p>
                      <span className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
                        subscriptionDetail.space.status === 'actif'
                          ? 'bg-green-900/30 text-green-400'
                          : subscriptionDetail.space.status === 'en_attente_validation'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : subscriptionDetail.space.status === 'en_creation'
                          ? 'bg-blue-900/30 text-blue-400'
                          : subscriptionDetail.space.status === 'suspendu'
                          ? 'bg-orange-900/30 text-orange-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}>
                        {subscriptionDetail.space.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {subscriptionDetail.space.tenantSlug && (
                      <div>
                        <p className="text-xs text-gray-400">Slug</p>
                        <p className="text-gray-300 text-sm font-mono">{subscriptionDetail.space.tenantSlug}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subscriptionDetail.space.status === 'en_attente_validation' && (
                      <button
                        onClick={() => handleValidateSpace(subscriptionDetail.space!.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                      >
                        <CheckBadgeIcon className="h-4 w-4" />
                        Valider l'espace
                      </button>
                    )}
                    {(subscriptionDetail.space.status === 'actif' || subscriptionDetail.space.status === 'en_attente_validation') && (
                      <button
                        onClick={() => handleResendEmail(subscriptionDetail.space!.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md transition-colors"
                      >
                        <EnvelopeIcon className="h-4 w-4" />
                        Renvoyer identifiants
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-sm">Aucun espace client créé</p>
              )}
            </div>

            {/* Section 3 : Actions abonnement */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h3 className="text-md font-semibold text-white mb-3">Actions</h3>
              <div className="flex flex-wrap gap-2">
                {subscriptionDetail.subscription.statut === 'actif' && (
                  <>
                    <button
                      onClick={() => handleSubscriptionAction('renew')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Renouveler
                    </button>
                    <button
                      onClick={() => handleSubscriptionAction('suspend')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-md transition-colors"
                    >
                      <PauseIcon className="h-4 w-4" />
                      Suspendre
                    </button>
                  </>
                )}
                {subscriptionDetail.subscription.statut === 'suspendu' && (
                  <button
                    onClick={() => handleSubscriptionAction('reactivate')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                  >
                    <PlayIcon className="h-4 w-4" />
                    Réactiver
                  </button>
                )}
                {subscriptionDetail.subscription.statut !== 'annule' && (
                  <button
                    onClick={() => handleSubscriptionAction('cancel')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                  >
                    <NoSymbolIcon className="h-4 w-4" />
                    Annuler
                  </button>
                )}
                {subscriptionDetail.subscription.statut === 'annule' && (
                  <p className="text-gray-400 text-sm">Cet abonnement est annulé.</p>
                )}
              </div>
            </div>

            {/* Fermer */}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowSubscriptionModal(false);
                  setSubscriptionDetail(null);
                  setSelectedClient(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

