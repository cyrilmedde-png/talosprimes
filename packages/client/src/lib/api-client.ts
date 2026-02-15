// Client API pour les requêtes authentifiées

import { getAccessToken, refreshAccessToken, clearTokens } from './auth';
import { API_URL } from './api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string
  ) {
    super(message || statusText);
    this.name = 'ApiError';
  }
}

/**
 * Effectue une requête authentifiée vers l'API
 * Gère automatiquement le refresh du token si nécessaire
 */
async function authenticatedFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Non authentifié');
  }

  const url = `${API_URL}${endpoint}`;
  
  // Ne pas inclure Content-Type si pas de body (pour DELETE notamment)
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };
  
  // Ajouter Content-Type seulement si on a un body
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  
  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Si le token a expiré, essayer de le rafraîchir
  if (response.status === 401) {
    try {
      await refreshAccessToken();
      // Réessayer la requête avec le nouveau token
      const newToken = getAccessToken();
      const retryHeaders: Record<string, string> = {
        'Authorization': `Bearer ${newToken}`,
        ...(options.headers as Record<string, string> || {}),
      };
      
      if (options.body) {
        retryHeaders['Content-Type'] = 'application/json';
      }
      
      response = await fetch(url, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });
    } catch (error) {
      // Si le refresh échoue, déconnecter l'utilisateur
      clearTokens();
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Erreur serveur',
      message: response.statusText,
    }));
    
    throw new ApiError(
      response.status,
      response.statusText,
      errorData.message || errorData.error || 'Erreur serveur'
    );
  }

  return response.json();
}

/**
 * API Client - Fonctions pour les différentes routes
 */
export const apiClient = {
  // Clients finaux
  clients: {
    list: () => authenticatedFetch<{ success: boolean; data: { clients: unknown[] } }>('/api/clients'),
    
    get: (id: string) => authenticatedFetch<{ success: boolean; data: { client: unknown } }>(`/api/clients/${id}`),
    
    createFromLead: (leadId: string) => 
      authenticatedFetch<{ success: boolean; message: string; data?: unknown }>('/api/clients/create-from-lead', {
        method: 'POST',
        body: JSON.stringify({ leadId }),
      }),
    
    create: (data: {
      type: 'b2b' | 'b2c';
      raisonSociale?: string;
      nom?: string;
      prenom?: string;
      email: string;
      telephone?: string;
      adresse?: string;
      tags?: string[];
    }) => authenticatedFetch<{ success: boolean; data: { client: unknown } }>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    update: (id: string, data: Partial<{
      raisonSociale?: string;
      nom?: string;
      prenom?: string;
      email?: string;
      telephone?: string;
      adresse?: string;
      tags?: string[];
      statut?: 'actif' | 'inactif' | 'suspendu';
    }>) => authenticatedFetch<{ success: boolean; data: { client: unknown } }>(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    
    delete: (id: string) => authenticatedFetch<{ success: boolean; message: string }>(`/api/clients/${id}`, {
      method: 'DELETE',
    }),
    
    createOnboarding: (id: string, data: { nomPlan?: string; montantMensuel?: number; modulesInclus?: string[]; dureeMois?: number; avecStripe?: boolean }) =>
      authenticatedFetch<{ 
        success: boolean; 
        message: string; 
        data?: { 
          subscription: unknown; 
          plan: unknown; 
          client: unknown;
          modulesActives: string[];
          credentials?: {
            tenantId: string;
            userId: string;
            email: string;
            password: string;
          };
          stripe?: {
            customerId: string;
            checkoutSessionId: string;
            checkoutUrl: string;
            requiresPayment: boolean;
          } | null;
        } 
      }>(`/api/clients/${id}/onboarding`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getSubscription: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { subscription: { id: string; nomPlan: string; montantMensuel: number; modulesInclus: string[]; statut: string; dateDebut: string; dateProchainRenouvellement: string } | null } }>(`/api/clients/${id}/subscription`),
  },

  // Abonnements
  subscriptions: {
    list: (params?: { statut?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.statut) queryParams.append('statut', params.statut);
      const query = queryParams.toString();
      return authenticatedFetch<{ success: boolean; data: { subscriptions: Subscription[]; count: number } }>(`/api/subscriptions${query ? `?${query}` : ''}`);
    },
    
    get: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { subscription: Subscription } }>(`/api/subscriptions/${id}`),
    
    renew: (subscriptionId: string) =>
      authenticatedFetch<{ success: boolean; message: string; data?: { subscription: unknown; invoice: unknown } }>('/api/subscriptions/renew', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId }),
      }),
    
    cancel: (subscriptionId: string, reason?: string, cancelAtPeriodEnd?: boolean) =>
      authenticatedFetch<{ success: boolean; message: string; data?: { subscription: unknown } }>('/api/subscriptions/cancel', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId, reason, cancelAtPeriodEnd }),
      }),
    
    upgrade: (subscriptionId: string, nouveauPlan: { nomPlan: string; montantMensuel: number; modulesInclus?: string[]; dureeMois?: number }) =>
      authenticatedFetch<{ success: boolean; message: string; data?: { subscription: unknown; prorata: unknown } }>('/api/subscriptions/upgrade', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId, nouveauPlan }),
      }),
    
    suspend: (subscriptionId: string, reason?: string) =>
      authenticatedFetch<{ success: boolean; message: string; data?: { subscription: unknown; client: unknown } }>('/api/subscriptions/suspend', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId, reason }),
      }),
    
    reactivate: (subscriptionId: string) =>
      authenticatedFetch<{ success: boolean; message: string; data?: { subscription: unknown } }>('/api/subscriptions/reactivate', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId }),
      }),
  },

  // Leads
  leads: {
    list: (params?: { source?: string; statut?: string; limit?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.source) queryParams.append('source', params.source);
      if (params?.statut) queryParams.append('statut', params.statut);
      if (params?.limit) queryParams.append('limit', params.limit);
      const query = queryParams.toString();
      return authenticatedFetch<{ success: boolean; data: { leads: unknown[] } }>(`/api/leads${query ? `?${query}` : ''}`);
    },
    
    get: (id: string) => authenticatedFetch<{ success: boolean; data: { lead: unknown } }>(`/api/leads/${id}`),
    
    create: (data: {
      nom: string;
      prenom: string;
      email: string;
      telephone: string;
      source?: string;
      notes?: string;
    }) => authenticatedFetch<{ success: boolean; data: { lead: unknown } }>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    updateStatus: (id: string, statut: 'nouveau' | 'contacte' | 'converti' | 'abandonne') => 
      authenticatedFetch<{ success: boolean; data: { lead: unknown } }>(`/api/leads/${id}/statut`, {
        method: 'PATCH',
        body: JSON.stringify({ statut }),
      }),
    
    delete: (id: string) => authenticatedFetch<{ success: boolean; message: string }>(`/api/leads/${id}`, {
      method: 'DELETE',
    }),
    
    sendQuestionnaire: (id: string) => 
      authenticatedFetch<{ success: boolean; message: string; data?: unknown }>(`/api/leads/${id}/questionnaire`, {
        method: 'POST',
      }),
    
    sendEntretien: (id: string, data?: { dateEntretien?: string; heureEntretien?: string; typeEntretien?: string }) => 
      authenticatedFetch<{ success: boolean; message: string; data?: unknown }>(`/api/leads/${id}/entretien`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    
    confirmConversion: (id: string) => 
      authenticatedFetch<{ success: boolean; message: string; data?: unknown }>(`/api/leads/${id}/confirmation`, {
        method: 'POST',
      }),
  },

  // n8n
  n8n: {
    test: () => authenticatedFetch<{ success: boolean; message: string }>('/api/n8n/test'),
    workflows: () => authenticatedFetch<{ success: boolean; data: { workflows: unknown[] } }>('/api/n8n/workflows'),
  },

  // Notifications
  notifications: {
    list: (params?: { lu?: boolean; limit?: number; offset?: number }) => {
      const queryParams = new URLSearchParams();
      if (params?.lu !== undefined) queryParams.append('lu', params.lu.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      const query = queryParams.toString();
      return authenticatedFetch<{ success: boolean; data: { notifications: Notification[]; total: number; limit: number; offset: number } }>(`/api/notifications${query ? `?${query}` : ''}`);
    },
    
    markAsRead: (id: string, lu: boolean = true) => 
      authenticatedFetch<{ success: boolean; message: string }>(`/api/notifications/${id}/lu`, {
        method: 'PATCH',
        body: JSON.stringify({ lu }),
      }),
    
    delete: (id: string) => authenticatedFetch<{ success: boolean; message: string }>(`/api/notifications/${id}`, {
      method: 'DELETE',
    }),
  },

  // Agent IA (Super Assistant)
  agent: {
    chat: (message: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>) =>
      authenticatedFetch<{ success: boolean; reply: string; error?: string }>('/api/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history: history ?? [] }),
      }),
    getConfig: () =>
      authenticatedFetch<{
        success: boolean;
        data: {
          email: {
            imapHost?: string;
            imapPort?: number;
            imapUser?: string;
            imapPassword?: string;
            imapTls?: boolean;
            smtpHost?: string;
            smtpPort?: number;
            smtpUser?: string;
            smtpPassword?: string;
            smtpFrom?: string;
            configuredRead: boolean;
            configuredSend: boolean;
          };
          qonto: {
            apiSecret?: string;
            bankAccountId?: string;
            configured: boolean;
          };
        };
      }>('/api/agent/config'),
    updateConfig: (patch: {
      email?: Partial<{
        imapHost?: string;
        imapPort?: number;
        imapUser?: string;
        imapPassword?: string;
        imapTls?: boolean;
        smtpHost?: string;
        smtpPort?: number;
        smtpUser?: string;
        smtpPassword?: string;
        smtpFrom?: string;
      }>;
      qonto?: Partial<{ apiSecret?: string; bankAccountId?: string }>;
    }) =>
      authenticatedFetch<{ success: boolean; data: unknown }>('/api/agent/config', {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
  },

  // Factures
  invoices: {
    list: (params?: { page?: number; limit?: number; statut?: string; clientFinalId?: string; dateFrom?: string; dateTo?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.statut) queryParams.append('statut', params.statut);
      if (params?.clientFinalId) queryParams.append('clientFinalId', params.clientFinalId);
      if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
      const query = queryParams.toString();
      return authenticatedFetch<InvoicesListResponse>(`/api/invoices${query ? `?${query}` : ''}`);
    },
    get: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { invoice: Invoice } }>(`/api/invoices/${id}`),
    create: (data: {
      clientFinalId: string;
      type?: 'facture_entreprise' | 'facture_client_final';
      montantHt: number;
      tvaTaux?: number;
      dateFacture?: string;
      dateEcheance?: string;
      description?: string;
      modePaiement?: string;
      lines?: { designation: string; quantite: number; prixUnitaireHt: number; codeArticle?: string | null }[];
    }) =>
      authenticatedFetch<{ success: boolean; message: string; data: { invoice: Invoice } }>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    send: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string; data: { invoice: Invoice } }>(`/api/invoices/${id}/send`, {
        method: 'POST',
      }),
    markPaid: (id: string, data?: { referencePayment?: string; datePaiement?: string }) =>
      authenticatedFetch<{ success: boolean; message: string; data: { invoice: Invoice } }>(`/api/invoices/${id}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    update: (id: string, data: { statut?: string; lienPdf?: string; idExternePaiement?: string }) =>
      authenticatedFetch<{ success: boolean; message: string; data: { invoice: Invoice } }>(`/api/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string }>(`/api/invoices/${id}`, { method: 'DELETE' }),
    /** Télécharge le PDF avec authentification et l'ouvre dans un nouvel onglet */
    downloadPdf: async (id: string): Promise<void> => {
      const token = getAccessToken();
      if (!token) throw new Error('Non authentifié');
      const response = await fetch(`${API_URL}/api/invoices/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Erreur PDF : ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Libérer l'URL blob après un délai (le navigateur a besoin de temps pour l'ouvrir)
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
  },

  // Codes articles
  articleCodes: {
    list: () => authenticatedFetch<{ success: boolean; data: { articles: ArticleCode[] } }>('/api/article-codes'),
    create: (data: { code: string; designation: string; prixUnitaireHt?: number | null; tvaTaux?: number | null; unite?: string | null }) =>
      authenticatedFetch<{ success: boolean; data: { article: ArticleCode } }>('/api/article-codes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ code: string; designation: string; prixUnitaireHt?: number | null; tvaTaux?: number | null; unite?: string | null; actif?: boolean }>) =>
      authenticatedFetch<{ success: boolean; data: { article: ArticleCode } }>(`/api/article-codes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string }>(`/api/article-codes/${id}`, { method: 'DELETE' }),
  },

  // Bons de commande
  bonsCommande: {
    list: (params?: { page?: number; limit?: number; statut?: string; clientFinalId?: string }) => {
      const qp = new URLSearchParams();
      if (params?.page) qp.append('page', params.page.toString());
      if (params?.limit) qp.append('limit', params.limit.toString());
      if (params?.statut) qp.append('statut', params.statut);
      if (params?.clientFinalId) qp.append('clientFinalId', params.clientFinalId);
      const q = qp.toString();
      return authenticatedFetch<BonsCommandeListResponse>(`/api/bons-commande${q ? `?${q}` : ''}`);
    },
    get: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { bon: BonCommande } }>(`/api/bons-commande/${id}`),
    create: (data: {
      clientFinalId: string;
      montantHt: number;
      tvaTaux?: number;
      dateBdc?: string;
      dateValidite?: string;
      description?: string;
      modePaiement?: string;
      lines?: { designation: string; quantite: number; prixUnitaireHt: number; codeArticle?: string | null }[];
    }) =>
      authenticatedFetch<{ success: boolean; message: string; data: { bon: BonCommande } }>('/api/bons-commande', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    validate: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string; data: { bon: BonCommande } }>(`/api/bons-commande/${id}/validate`, {
        method: 'PUT',
      }),
    convertToInvoice: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string; data: { invoice: Invoice; bon: BonCommande } }>(`/api/bons-commande/${id}/convert-to-invoice`, {
        method: 'POST',
      }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string }>(`/api/bons-commande/${id}`, { method: 'DELETE' }),
  },

  // Devis
  devis: {
    list: (params?: { page?: number; limit?: number; statut?: string; clientFinalId?: string }) => {
      const qp = new URLSearchParams();
      if (params?.page) qp.append('page', params.page.toString());
      if (params?.limit) qp.append('limit', params.limit.toString());
      if (params?.statut) qp.append('statut', params.statut);
      if (params?.clientFinalId) qp.append('clientFinalId', params.clientFinalId);
      const q = qp.toString();
      return authenticatedFetch<DevisListResponse>(`/api/devis${q ? `?${q}` : ''}`);
    },
    get: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { devis: Devis } }>(`/api/devis/${id}`),
    create: (data: {
      clientFinalId: string;
      montantHt: number;
      tvaTaux?: number;
      dateDevis?: string;
      dateValidite?: string;
      description?: string;
      modePaiement?: string;
      lines?: { designation: string; quantite: number; prixUnitaireHt: number; codeArticle?: string | null }[];
    }) =>
      authenticatedFetch<{ success: boolean; message: string; data: { devis: Devis } }>('/api/devis', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    send: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string; data: { devis: Devis } }>(`/api/devis/${id}/send`, {
        method: 'PUT',
      }),
    accept: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string; data: { devis: Devis } }>(`/api/devis/${id}/accept`, {
        method: 'PUT',
      }),
    convertToInvoice: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string; data: { invoice: Invoice; devis: Devis } }>(`/api/devis/${id}/convert-to-invoice`, {
        method: 'POST',
      }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string }>(`/api/devis/${id}`, { method: 'DELETE' }),
  },

  avoirs: {
    list: (params?: { page?: number; limit?: number; statut?: string; clientFinalId?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.statut) searchParams.set('statut', params.statut);
      if (params?.clientFinalId) searchParams.set('clientFinalId', params.clientFinalId);
      const qs = searchParams.toString();
      return authenticatedFetch<AvoirListResponse>(`/api/avoirs${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => authenticatedFetch<{ success: boolean; data: { avoir: Avoir } }>(`/api/avoirs/${id}`),
    create: (data: { clientFinalId: string; invoiceId?: string; montantHt: number; tvaTaux?: number; dateAvoir?: string; motif?: string; description?: string; lines?: { codeArticle?: string; designation: string; quantite: number; prixUnitaireHt: number }[] }) =>
      authenticatedFetch<{ success: boolean; data: { avoir: Avoir } }>('/api/avoirs', { method: 'POST', body: JSON.stringify(data) }),
    validate: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { avoir: Avoir } }>(`/api/avoirs/${id}/validate`, { method: 'PUT' }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean }>(`/api/avoirs/${id}`, { method: 'DELETE' }),
  },

  proformas: {
    list: (params?: { page?: number; limit?: number; statut?: string; clientFinalId?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.statut) searchParams.set('statut', params.statut);
      if (params?.clientFinalId) searchParams.set('clientFinalId', params.clientFinalId);
      const qs = searchParams.toString();
      return authenticatedFetch<ProformaListResponse>(`/api/proformas${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => authenticatedFetch<{ success: boolean; data: { proforma: Proforma } }>(`/api/proformas/${id}`),
    create: (data: { clientFinalId: string; montantHt: number; tvaTaux?: number; dateProforma?: string; dateValidite?: string; description?: string; modePaiement?: string; lines?: { codeArticle?: string; designation: string; quantite: number; prixUnitaireHt: number }[] }) =>
      authenticatedFetch<{ success: boolean; data: { proforma: Proforma } }>('/api/proformas', { method: 'POST', body: JSON.stringify(data) }),
    send: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { proforma: Proforma } }>(`/api/proformas/${id}/send`, { method: 'PUT' }),
    accept: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { proforma: Proforma } }>(`/api/proformas/${id}/accept`, { method: 'PUT' }),
    convertToInvoice: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { invoice: unknown; proforma: Proforma } }>(`/api/proformas/${id}/convert-to-invoice`, { method: 'POST' }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean }>(`/api/proformas/${id}`, { method: 'DELETE' }),
  },

  // Logs
  logs: {
    list: (params?: { workflow?: 'leads' | 'clients' | 'all'; statutExecution?: 'en_attente' | 'succes' | 'erreur'; typeEvenement?: string; limit?: number; offset?: number }) => {
      const queryParams = new URLSearchParams();
      if (params?.workflow) queryParams.append('workflow', params.workflow);
      if (params?.statutExecution) queryParams.append('statutExecution', params.statutExecution);
      if (params?.typeEvenement) queryParams.append('typeEvenement', params.typeEvenement);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      const query = queryParams.toString();
      return authenticatedFetch<{ success: boolean; data?: { logs: Log[]; total: number; limit: number; offset: number }; error?: string }>(`/api/logs${query ? `?${query}` : ''}`);
    },
    stats: (workflow?: 'leads' | 'clients' | 'all') => {
      const query = workflow ? `?workflow=${workflow}` : '';
      return authenticatedFetch<{ success: boolean; data?: LogStats; error?: string }>(`/api/logs/stats${query}`);
    },
  },
};

// Types pour les factures
export interface Invoice {
  id: string;
  tenantId: string;
  type: 'facture_entreprise' | 'facture_client_final';
  clientFinalId: string;
  montantHt: number;
  montantTtc: number;
  tvaTaux: number;
  dateFacture: string;
  dateEcheance: string;
  numeroFacture: string;
  statut: 'brouillon' | 'envoyee' | 'payee' | 'en_retard' | 'annulee';
  lienPdf?: string | null;
  idExternePaiement?: string | null;
  clientFinal?: {
    id: string;
    email: string;
    nom?: string | null;
    prenom?: string | null;
    raisonSociale?: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoicesListResponse {
  success: boolean;
  data: {
    invoices: Invoice[];
    count: number;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Type pour les notifications
export interface Notification {
  id: string;
  tenantId: string;
  type: string;
  titre: string;
  message: string;
  donnees?: Record<string, unknown>;
  lu: boolean;
  createdAt: string;
}

// Type pour les logs
export interface Log {
  id: string;
  tenantId: string;
  typeEvenement: string;
  entiteType: string;
  entiteId: string;
  payload: Record<string, unknown>;
  workflowN8nDeclenche: boolean;
  workflowN8nId: string | null;
  statutExecution: 'en_attente' | 'succes' | 'erreur';
  messageErreur: string | null;
  createdAt: string;
  workflow?: 'leads' | 'clients' | 'other';
  entityEmail?: string | null;
}

export interface LogStats {
  total: number;
  succeeded: number;
  errors: number;
  enAttente: number;
  byWorkflow: {
    leads: { total: number; errors: number; succeeded: number };
    clients: { total: number; errors: number; succeeded: number };
  };
}

// Type pour les codes articles
export interface ArticleCode {
  id: string;
  tenantId: string;
  code: string;
  designation: string;
  prixUnitaireHt?: number | null;
  tvaTaux?: number | null;
  unite?: string | null;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

// Type pour les bons de commande
export interface BonCommande {
  id: string;
  tenantId: string;
  clientFinalId?: string | null;
  numeroBdc: string;
  dateBdc: string;
  dateValidite?: string | null;
  montantHt: number;
  montantTtc: number;
  tvaTaux?: number | null;
  description?: string | null;
  modePaiement?: string | null;
  statut: 'brouillon' | 'valide' | 'facture' | 'annule';
  invoiceId?: string | null;
  clientFinal?: { id: string; email: string; nom?: string | null; prenom?: string | null; raisonSociale?: string | null };
  lines?: { id: string; codeArticle?: string | null; designation: string; quantite: number; prixUnitaireHt: number; totalHt: number; ordre: number }[];
  invoice?: { id: string; numeroFacture: string; statut: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BonsCommandeListResponse {
  success: boolean;
  data: {
    bons: BonCommande[];
    count: number;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Type pour les devis
export interface Devis {
  id: string;
  tenantId: string;
  clientFinalId?: string | null;
  numeroDevis: string;
  dateDevis: string;
  dateValidite?: string | null;
  montantHt: number;
  montantTtc: number;
  tvaTaux?: number | null;
  description?: string | null;
  modePaiement?: string | null;
  statut: 'brouillon' | 'envoyee' | 'acceptee' | 'refusee' | 'expiree' | 'facturee';
  invoiceId?: string | null;
  lienPdf?: string | null;
  clientFinal?: { id: string; email: string; nom?: string | null; prenom?: string | null; raisonSociale?: string | null };
  lines?: { id: string; codeArticle?: string | null; designation: string; quantite: number; prixUnitaireHt: number; totalHt: number; ordre: number }[];
  invoice?: { id: string; numeroFacture: string; statut: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevisListResponse {
  success: boolean;
  data: {
    devis: Devis[];
    count: number;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Type pour les avoirs (notes de crédit)
export interface Avoir {
  id: string;
  tenantId: string;
  clientFinalId?: string | null;
  invoiceId?: string | null;
  numeroAvoir: string;
  dateAvoir: string;
  montantHt: number;
  montantTtc: number;
  tvaTaux?: number | null;
  motif?: string | null;
  description?: string | null;
  statut: 'brouillon' | 'validee' | 'annulee';
  lienPdf?: string | null;
  clientFinal?: { id: string; email: string; nom?: string | null; prenom?: string | null; raisonSociale?: string | null };
  lines?: { id: string; codeArticle?: string | null; designation: string; quantite: number; prixUnitaireHt: number; totalHt: number; ordre: number }[];
  invoice?: { id: string; numeroFacture: string; statut: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvoirListResponse {
  success: boolean;
  data: {
    avoirs: Avoir[];
    count: number;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Type pour les proformas
export interface Proforma {
  id: string;
  tenantId: string;
  clientFinalId?: string | null;
  numeroProforma: string;
  dateProforma: string;
  dateValidite?: string | null;
  montantHt: number;
  montantTtc: number;
  tvaTaux?: number | null;
  description?: string | null;
  modePaiement?: string | null;
  statut: 'brouillon' | 'envoyee' | 'acceptee' | 'refusee' | 'expiree' | 'facturee';
  invoiceId?: string | null;
  lienPdf?: string | null;
  clientFinal?: { id: string; email: string; nom?: string | null; prenom?: string | null; raisonSociale?: string | null };
  lines?: { id: string; codeArticle?: string | null; designation: string; quantite: number; prixUnitaireHt: number; totalHt: number; ordre: number }[];
  invoice?: { id: string; numeroFacture: string; statut: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProformaListResponse {
  success: boolean;
  data: {
    proformas: Proforma[];
    count: number;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Type pour les abonnements
export interface Subscription {
  id: string;
  clientFinalId: string;
  nomPlan: string;
  dateDebut: string;
  dateProchainRenouvellement: string;
  montantMensuel: number;
  modulesInclus: string[];
  statut: 'actif' | 'suspendu' | 'annule' | 'expire';
  idAbonnementStripe?: string | null;
  idClientStripe?: string | null;
  updatedAt: string;
  clientFinal?: {
    id: string;
    email: string;
    nom?: string;
    prenom?: string;
    raisonSociale?: string;
  };
}

