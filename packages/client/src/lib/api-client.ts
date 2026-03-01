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
    
    createOnboarding: (id: string, data: { nomPlan?: string; montantMensuel?: number; modulesInclus?: string[]; dureeMois?: number; avecStripe?: boolean; avecSousDomaine?: boolean; sousDomaine?: string }) =>
      authenticatedFetch<{
        success: boolean;
        message: string;
        data?: {
          subscription: unknown;
          plan: unknown;
          clientSpace?: unknown;
          modulesActives?: string[];
          checkoutUrl?: string;
          requiresPayment?: boolean;
          credentials?: {
            tenantId: string;
            userId: string;
            email: string;
            password: string;
          };
          stripe?: {
            customerId?: string;
            checkoutSessionId?: string;
            checkoutUrl?: string;
            checkout_url?: string;
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
    
    updateStatus: (id: string, statut: 'nouveau' | 'contacte' | 'qualifie' | 'converti' | 'abandonne') =>
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
    publishAll: () => authenticatedFetch<{ success: boolean; message: string; count?: number }>('/api/n8n/publish-all', { method: 'POST' }),
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
      clientFinalId?: string;
      type?: 'facture_entreprise' | 'facture_client_final' | 'facture_achat';
      montantHt: number;
      tvaTaux?: number;
      dateFacture?: string;
      dateEcheance?: string;
      description?: string;
      modePaiement?: string;
      bdcId?: string;
      lines?: { designation: string; quantite: number; prixUnitaireHt: number; codeArticle?: string | null }[];
      // Champs fournisseur (facture d'achat)
      fournisseurNom?: string;
      fournisseurSiret?: string;
      fournisseurTvaIntra?: string;
      fournisseurAdresse?: string;
      categorieFrais?: string;
    }) =>
      authenticatedFetch<{ success: boolean; message: string; data: { invoice: Invoice } }>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    scanDocument: (data: {
      documentBase64: string;
      fileName?: string;
      mimeType?: string;
    }) =>
      authenticatedFetch<{ success: boolean; error?: string; data?: Record<string, unknown> }>('/api/invoices/scan-document', {
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
    /** Télécharge le PDF avec authentification */
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
      // Téléchargement réel via un lien invisible au lieu de window.open
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
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
      devisId?: string;
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
    update: (id: string, data: Record<string, unknown>) =>
      authenticatedFetch<{ success: boolean; message: string; data: { bon: BonCommande } }>(`/api/bons-commande/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    convertToInvoice: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string; data: { invoice: Invoice; bon: BonCommande } }>(`/api/bons-commande/${id}/convert-to-invoice`, {
        method: 'POST',
      }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string }>(`/api/bons-commande/${id}`, { method: 'DELETE' }),
    downloadPdf: async (id: string): Promise<void> => {
      const token = getAccessToken();
      if (!token) throw new Error('Non authentifié');
      const response = await fetch(`${API_URL}/api/bons-commande/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Erreur PDF : ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
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
    update: (id: string, data: Record<string, unknown>) =>
      authenticatedFetch<{ success: boolean; message: string; data: { devis: Devis } }>(`/api/devis/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    convertToInvoice: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string; data: { invoice: Invoice; devis: Devis } }>(`/api/devis/${id}/convert-to-invoice`, {
        method: 'POST',
      }),
    convertToBdc: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string; data: { bon: BonCommande; devisId: string; numeroDevis: string } }>(`/api/devis/${id}/convert-to-bdc`, {
        method: 'POST',
      }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string }>(`/api/devis/${id}`, { method: 'DELETE' }),
    downloadPdf: async (id: string): Promise<void> => {
      const token = getAccessToken();
      if (!token) throw new Error('Non authentifié');
      const response = await fetch(`${API_URL}/api/devis/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Erreur PDF : ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
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
    convertFromInvoice: (invoiceId: string) =>
      authenticatedFetch<{ success: boolean; message: string; data: { avoir: Avoir; invoiceId: string; numeroFacture: string } }>(`/api/invoices/${invoiceId}/convert-to-avoir`, {
        method: 'POST',
      }),
    downloadPdf: async (id: string): Promise<void> => {
      const token = getAccessToken();
      if (!token) throw new Error('Non authentifié');
      const response = await fetch(`${API_URL}/api/avoirs/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Erreur PDF : ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
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
    downloadPdf: async (id: string): Promise<void> => {
      const token = getAccessToken();
      if (!token) throw new Error('Non authentifié');
      const response = await fetch(`${API_URL}/api/proformas/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Erreur PDF : ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },
  },

  // Comptabilité
  comptabilite: {
    // Dashboard KPIs
    dashboard: (params?: { dateFrom?: string; dateTo?: string }) => {
      const qp = new URLSearchParams();
      if (params?.dateFrom) qp.append('dateFrom', params.dateFrom);
      if (params?.dateTo) qp.append('dateTo', params.dateTo);
      const q = qp.toString();
      return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/dashboard${q ? `?${q}` : ''}`);
    },
    // Initialisation (plan comptable + journaux + exercice)
    init: () =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/comptabilite/init', { method: 'POST' }),
    // Plan comptable
    planComptable: (params?: { classe?: number; search?: string }) => {
      const qp = new URLSearchParams();
      if (params?.classe) qp.append('classe', params.classe.toString());
      if (params?.search) qp.append('search', params.search);
      const q = qp.toString();
      return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/plan-comptable${q ? `?${q}` : ''}`);
    },
    // Écritures
    ecritures: {
      list: (params?: { page?: number; limit?: number; journalCode?: string; statut?: string; dateFrom?: string; dateTo?: string }) => {
        const qp = new URLSearchParams();
        if (params?.page) qp.append('page', params.page.toString());
        if (params?.limit) qp.append('limit', params.limit.toString());
        if (params?.journalCode) qp.append('journalCode', params.journalCode);
        if (params?.statut) qp.append('statut', params.statut);
        if (params?.dateFrom) qp.append('dateFrom', params.dateFrom);
        if (params?.dateTo) qp.append('dateTo', params.dateTo);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/ecritures${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/ecritures/${id}`),
      create: (data: { journalCode: string; dateEcriture: string; libelle: string; lignes: { numeroCompte: string; libelleLigne: string; debit: number; credit: number }[] }) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/comptabilite/ecritures', { method: 'POST', body: JSON.stringify(data) }),
    },
    // Grand Livre
    grandLivre: (params?: { dateFrom?: string; dateTo?: string; compteFrom?: string; compteTo?: string }) => {
      const qp = new URLSearchParams();
      if (params?.dateFrom) qp.append('dateFrom', params.dateFrom);
      if (params?.dateTo) qp.append('dateTo', params.dateTo);
      if (params?.compteFrom) qp.append('compteFrom', params.compteFrom);
      if (params?.compteTo) qp.append('compteTo', params.compteTo);
      const q = qp.toString();
      return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/grand-livre${q ? `?${q}` : ''}`);
    },
    // Balance
    balance: (params?: { dateFrom?: string; dateTo?: string }) => {
      const qp = new URLSearchParams();
      if (params?.dateFrom) qp.append('dateFrom', params.dateFrom);
      if (params?.dateTo) qp.append('dateTo', params.dateTo);
      const q = qp.toString();
      return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/balance${q ? `?${q}` : ''}`);
    },
    // Bilan
    bilan: (params?: { dateFrom?: string; dateTo?: string }) => {
      const qp = new URLSearchParams();
      if (params?.dateFrom) qp.append('dateFrom', params.dateFrom);
      if (params?.dateTo) qp.append('dateTo', params.dateTo);
      const q = qp.toString();
      return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/bilan${q ? `?${q}` : ''}`);
    },
    // Compte de Résultat
    compteResultat: (params?: { dateFrom?: string; dateTo?: string }) => {
      const qp = new URLSearchParams();
      if (params?.dateFrom) qp.append('dateFrom', params.dateFrom);
      if (params?.dateTo) qp.append('dateTo', params.dateTo);
      const q = qp.toString();
      return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/compte-resultat${q ? `?${q}` : ''}`);
    },
    // TVA
    tva: (params: { dateFrom: string; dateTo: string; typeDeclaration?: string }) => {
      const qp = new URLSearchParams();
      qp.append('dateFrom', params.dateFrom);
      qp.append('dateTo', params.dateTo);
      if (params.typeDeclaration) qp.append('typeDeclaration', params.typeDeclaration);
      return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/tva?${qp.toString()}`);
    },
    // Agent IA Comptable
    iaAgent: (data: { action: string; data?: Record<string, unknown>; question?: string; dateFrom?: string; dateTo?: string }) =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/comptabilite/ia-agent', { method: 'POST', body: JSON.stringify(data) }),
    // Exercices
    exercices: () =>
      authenticatedFetch<{ success: boolean; data: { exercices: Array<{ id: string; tenantId: string; code: string; dateDebut: string; dateFin: string; cloture: boolean; dateCloture: string | null; resultatNet: number | null }> } }>('/api/comptabilite/exercices'),
    // Clôture
    cloture: (data: { exerciceId: string; confirme?: boolean }) =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/comptabilite/cloture', { method: 'POST', body: JSON.stringify(data) }),
    // Lettrage
    lettrage: (data: { numeroCompte: string; ligneIds: string[] }) =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/comptabilite/lettrage', { method: 'POST', body: JSON.stringify(data) }),
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

  // Agent Téléphonique - Call Logs
  callLogs: {
    list: (params?: { urgencyLevel?: string; status?: string; sentiment?: string; direction?: string; dateFrom?: string; dateTo?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.urgencyLevel) queryParams.append('urgencyLevel', params.urgencyLevel);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.sentiment) queryParams.append('sentiment', params.sentiment);
      if (params?.direction) queryParams.append('direction', params.direction);
      if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
      const query = queryParams.toString();
      return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/call-logs${query ? `?${query}` : ''}`);
    },
    get: (id: string) =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/call-logs/${id}`),
    stats: () =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/call-logs/stats'),
    update: (id: string, data: { notes?: string; followUpDone?: boolean; status?: string }) =>
      authenticatedFetch<{ success: boolean }>(`/api/call-logs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean }>(`/api/call-logs/${id}`, {
        method: 'DELETE',
      }),
  },

  // Agent Téléphonique - Twilio Configuration
  twilioConfig: {
    get: () =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/twilio-config'),
    update: (data: Record<string, unknown>) =>
      authenticatedFetch<{ success: boolean }>('/api/twilio-config', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    testCall: () =>
      authenticatedFetch<{ success: boolean }>('/api/twilio-config/test-call', {
        method: 'POST',
      }),
    outboundCall: (data: { to: string; reason: string }) =>
      authenticatedFetch<{ success: boolean }>('/api/twilio-config/outbound-call', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    niches: () =>
      authenticatedFetch<{ success: boolean; data: { niches: string[] } }>('/api/twilio-config/niches'),
  },

  // Agent Téléphonique - SMS
  sms: {
    list: (params?: { direction?: string; dateFrom?: string; dateTo?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.direction) queryParams.append('direction', params.direction);
      if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
      const query = queryParams.toString();
      return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/sms${query ? `?${query}` : ''}`);
    },
    stats: () =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/sms/stats'),
    send: (data: { toNumber: string; body: string }) =>
      authenticatedFetch<{ success: boolean }>('/api/sms/send', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Agent Téléphonique - Questionnaires
  questionnaires: {
    list: (params?: { status?: string; channel?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.channel) queryParams.append('channel', params.channel);
      const query = queryParams.toString();
      return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/questionnaires${query ? `?${query}` : ''}`);
    },
    get: (id: string) =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/questionnaires/${id}`),
    create: (data: { leadId: string; questions: Record<string, unknown>[]; channel: string }) =>
      authenticatedFetch<{ success: boolean }>('/api/questionnaires', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      authenticatedFetch<{ success: boolean }>(`/api/questionnaires/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean }>(`/api/questionnaires/${id}`, {
        method: 'DELETE',
      }),
  },

  // Plans et Modules
  plans: {
    list: () =>
      authenticatedFetch<{ success: boolean; data: { plans: PlanWithModules[] } }>('/api/plans'),
    listAll: () =>
      authenticatedFetch<{ success: boolean; data: { plans: PlanWithModules[] } }>('/api/plans/all'),
    get: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { plan: PlanWithModules } }>(`/api/plans/${id}`),
    getByCode: (code: string) =>
      authenticatedFetch<{ success: boolean; data: { plan: PlanWithModules } }>(`/api/plans/by-code/${code}`),
    create: (data: {
      code: string;
      nom: string;
      description?: string;
      prixMensuel: number;
      prixAnnuel?: number;
      essaiJours?: number;
      ordreAffichage?: number;
      actif?: boolean;
      couleur?: string;
      modules?: Array<{ moduleCode: string; limiteUsage?: number | null; config?: Record<string, unknown> | null }>;
    }) =>
      authenticatedFetch<{ success: boolean; message: string; data: { plan: PlanWithModules } }>('/api/plans', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{
      nom: string;
      description: string;
      prixMensuel: number;
      prixAnnuel: number;
      essaiJours: number;
      ordreAffichage: number;
      actif: boolean;
      couleur: string;
    }>) =>
      authenticatedFetch<{ success: boolean; message: string; data: { plan: PlanWithModules } }>(`/api/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updateModules: (id: string, modules: Array<{ moduleCode: string; limiteUsage?: number | null; config?: Record<string, unknown> | null }>) =>
      authenticatedFetch<{ success: boolean; message: string; data: { plan: PlanWithModules } }>(`/api/plans/${id}/modules`, {
        method: 'PUT',
        body: JSON.stringify({ modules }),
      }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string }>(`/api/plans/${id}`, { method: 'DELETE' }),
    modules: () =>
      authenticatedFetch<{ success: boolean; data: { modules: ModuleMetier[] } }>('/api/plans/modules'),
    modulesAll: () =>
      authenticatedFetch<{ success: boolean; data: { modules: ModuleMetier[] } }>('/api/plans/modules/all'),
  },

  // Modules Clients
  clientModules: {
    get: (clientId: string) =>
      authenticatedFetch<{ success: boolean; data: { clientModules: ClientModuleData[]; subscription: { id: string; nomPlan: string; statut: string; plan: { code: string; nom: string; prixMensuel: number } | null } | null; modulesActifs: string[] } }>(`/api/client-modules/${clientId}`),
    activate: (clientId: string, data: { planCode?: string; modules?: Array<{ moduleCode: string; limiteUsage?: number | null; config?: Record<string, unknown> | null }> }) =>
      authenticatedFetch<{ success: boolean; message: string; data: { modulesActives: string[]; count: number } }>(`/api/client-modules/${clientId}/activate`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    toggle: (clientId: string, moduleCode: string, actif: boolean) =>
      authenticatedFetch<{ success: boolean; message: string; data: { clientModule: ClientModuleData } }>(`/api/client-modules/${clientId}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ moduleCode, actif }),
      }),
    stats: () =>
      authenticatedFetch<{ success: boolean; data: { clientsParPlan: Array<{ planCode: string | null; planNom: string | null; count: number }>; modulesPopulaires: Array<{ moduleCode: string; moduleNom: string; count: number }> } }>('/api/client-modules/stats'),
  },

  // Espaces Clients
  clientSpaces: {
    list: (params?: { status?: string }) => {
      const qp = new URLSearchParams();
      if (params?.status) qp.append('status', params.status);
      const q = qp.toString();
      return authenticatedFetch<{ success: boolean; data: { spaces: ClientSpace[] } }>(`/api/client-spaces${q ? `?${q}` : ''}`);
    },
    get: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { space: ClientSpace } }>(`/api/client-spaces/${id}`),
    create: (data: { clientFinalId: string; raisonSociale?: string; nom?: string; prenom?: string; modulesInclus?: string[] }) =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/client-spaces', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    validate: (id: string) =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/client-spaces/${id}/validate`, {
        method: 'POST',
      }),
    resendEmail: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { emailSent: boolean; email: string } }>(`/api/client-spaces/${id}/resend-email`, {
        method: 'POST',
      }),
  },

  // CMS Pages dynamiques
  cmsPages: {
    listAll: () =>
      authenticatedFetch<{ success: boolean; data: { pages: CmsPageData[] } }>('/api/landing/pages/all'),
    listPublic: () =>
      authenticatedFetch<{ success: boolean; data: { pages: CmsPageData[] } }>('/api/landing/pages'),
    getBySlug: (slug: string) =>
      authenticatedFetch<{ success: boolean; data: { page: CmsPageData } }>(`/api/landing/pages/${slug}`),
    create: (data: { slug: string; titre: string; contenu: string; metaTitle?: string; metaDesc?: string; publie?: boolean; ordre?: number }) =>
      authenticatedFetch<{ success: boolean; data: { page: CmsPageData } }>('/api/landing/pages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<{ slug: string; titre: string; contenu: string; metaTitle: string; metaDesc: string; publie: boolean; ordre: number }>) =>
      authenticatedFetch<{ success: boolean; data: { page: CmsPageData } }>(`/api/landing/pages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean; message: string }>(`/api/landing/pages/${id}`, { method: 'DELETE' }),
  },

  // Landing Tarifs (public)
  landingTarifs: () =>
    authenticatedFetch<{ success: boolean; data: { plans: PlanWithModules[] } }>('/api/landing/tarifs'),

  // Gestion d'Équipe
  equipe: {
    dashboard: () =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/equipe/dashboard'),
    membres: {
      list: (params?: { departement?: string; actif?: boolean; search?: string }) => {
        const qp = new URLSearchParams();
        if (params?.departement) qp.append('departement', params.departement);
        if (params?.actif !== undefined) qp.append('actif', String(params.actif));
        if (params?.search) qp.append('search', params.search);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/equipe/membres${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/equipe/membres/${id}`),
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/equipe/membres', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/equipe/membres/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/equipe/membres/${id}`, { method: 'DELETE' }),
    },
    absences: {
      list: (params?: { membreId?: string; type?: string; statut?: string; dateFrom?: string; dateTo?: string }) => {
        const qp = new URLSearchParams();
        if (params?.membreId) qp.append('membreId', params.membreId);
        if (params?.type) qp.append('type', params.type);
        if (params?.statut) qp.append('statut', params.statut);
        if (params?.dateFrom) qp.append('dateFrom', params.dateFrom);
        if (params?.dateTo) qp.append('dateTo', params.dateTo);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/equipe/absences${q ? `?${q}` : ''}`);
      },
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/equipe/absences', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/equipe/absences/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/equipe/absences/${id}`, { method: 'DELETE' }),
    },
    pointages: {
      list: (params?: { membreId?: string; dateFrom?: string; dateTo?: string }) => {
        const qp = new URLSearchParams();
        if (params?.membreId) qp.append('membreId', params.membreId);
        if (params?.dateFrom) qp.append('dateFrom', params.dateFrom);
        if (params?.dateTo) qp.append('dateTo', params.dateTo);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/equipe/pointages${q ? `?${q}` : ''}`);
      },
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/equipe/pointages', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/equipe/pointages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/equipe/pointages/${id}`, { method: 'DELETE' }),
    },
  },

  // Gestion de Projets
  projets: {
    dashboard: () =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/projets/stats/dashboard'),
    list: (params?: { statut?: string; clientId?: string; responsableId?: string; search?: string }) => {
      const qp = new URLSearchParams();
      if (params?.statut) qp.append('statut', params.statut);
      if (params?.clientId) qp.append('clientId', params.clientId);
      if (params?.responsableId) qp.append('responsableId', params.responsableId);
      if (params?.search) qp.append('search', params.search);
      const q = qp.toString();
      return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/projets${q ? `?${q}` : ''}`);
    },
    get: (id: string) =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/projets/${id}`),
    create: (data: Record<string, unknown>) =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/projets', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/projets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean }>(`/api/projets/${id}`, { method: 'DELETE' }),
    taches: {
      list: (projetId: string, params?: { statut?: string; priorite?: string; assigneA?: string }) => {
        const qp = new URLSearchParams();
        if (params?.statut) qp.append('statut', params.statut);
        if (params?.priorite) qp.append('priorite', params.priorite);
        if (params?.assigneA) qp.append('assigneA', params.assigneA);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/projets/${projetId}/taches${q ? `?${q}` : ''}`);
      },
      create: (projetId: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/projets/${projetId}/taches`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/projets/taches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/projets/taches/${id}`, { method: 'DELETE' }),
    },
  },

  // BTP (Bâtiment & Travaux Publics)
  btp: {
    dashboard: () =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/btp/dashboard'),
    chantiers: {
      list: (params?: { statut?: string; clientId?: string; search?: string }) => {
        const qp = new URLSearchParams();
        if (params?.statut) qp.append('statut', params.statut);
        if (params?.clientId) qp.append('clientId', params.clientId);
        if (params?.search) qp.append('search', params.search);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/btp/chantiers${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/btp/chantiers/${id}`),
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/btp/chantiers', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/btp/chantiers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/btp/chantiers/${id}`, { method: 'DELETE' }),
    },
    situations: {
      list: (chantierId: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/btp/chantiers/${chantierId}/situations`),
      create: (chantierId: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/btp/chantiers/${chantierId}/situations`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/btp/situations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/btp/situations/${id}`, { method: 'DELETE' }),
      valider: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/btp/situations/${id}/valider`, { method: 'POST' }),
    },
  },

  // Ressources Humaines
  rh: {
    dashboard: () =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/rh/dashboard'),
    contrats: {
      list: (params?: { membreId?: string; type?: string; statut?: string }) => {
        const qp = new URLSearchParams();
        if (params?.membreId) qp.append('membreId', params.membreId);
        if (params?.type) qp.append('type', params.type);
        if (params?.statut) qp.append('statut', params.statut);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/contrats${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/contrats/${id}`),
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/rh/contrats', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/contrats/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/rh/contrats/${id}`, { method: 'DELETE' }),
    },
    paie: {
      list: (params?: { membreId?: string; mois?: string; annee?: string }) => {
        const qp = new URLSearchParams();
        if (params?.membreId) qp.append('membreId', params.membreId);
        if (params?.mois) qp.append('mois', params.mois);
        if (params?.annee) qp.append('annee', params.annee);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/paie${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/paie/${id}`),
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/rh/paie', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/paie/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/rh/paie/${id}`, { method: 'DELETE' }),
    },
    conges: {
      list: (params?: { membreId?: string; type?: string; statut?: string; dateFrom?: string; dateTo?: string }) => {
        const qp = new URLSearchParams();
        if (params?.membreId) qp.append('membreId', params.membreId);
        if (params?.type) qp.append('type', params.type);
        if (params?.statut) qp.append('statut', params.statut);
        if (params?.dateFrom) qp.append('dateFrom', params.dateFrom);
        if (params?.dateTo) qp.append('dateTo', params.dateTo);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/conges${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/conges/${id}`),
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/rh/conges', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/conges/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/rh/conges/${id}`, { method: 'DELETE' }),
      approuver: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/conges/${id}/approuver`, { method: 'POST' }),
      rejeter: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/conges/${id}/rejeter`, { method: 'POST' }),
    },
    documents: {
      list: (params?: { membreId?: string; type?: string }) => {
        const qp = new URLSearchParams();
        if (params?.membreId) qp.append('membreId', params.membreId);
        if (params?.type) qp.append('type', params.type);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/documents${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/documents/${id}`),
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/rh/documents', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/rh/documents/${id}`, { method: 'DELETE' }),
    },
    entretiens: {
      list: (params?: { membreId?: string; type?: string; dateFrom?: string; dateTo?: string }) => {
        const qp = new URLSearchParams();
        if (params?.membreId) qp.append('membreId', params.membreId);
        if (params?.type) qp.append('type', params.type);
        if (params?.dateFrom) qp.append('dateFrom', params.dateFrom);
        if (params?.dateTo) qp.append('dateTo', params.dateTo);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/entretiens${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/entretiens/${id}`),
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/rh/entretiens', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/entretiens/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/rh/entretiens/${id}`, { method: 'DELETE' }),
    },
    formations: {
      list: (params?: { membreId?: string; statut?: string; dateFrom?: string; dateTo?: string }) => {
        const qp = new URLSearchParams();
        if (params?.membreId) qp.append('membreId', params.membreId);
        if (params?.statut) qp.append('statut', params.statut);
        if (params?.dateFrom) qp.append('dateFrom', params.dateFrom);
        if (params?.dateTo) qp.append('dateTo', params.dateTo);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/formations${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/formations/${id}`),
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/rh/formations', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/formations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/rh/formations/${id}`, { method: 'DELETE' }),
      inscrire: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/formations/${id}/inscrire`, { method: 'POST', body: JSON.stringify(data) }),
    },
    evaluations: {
      list: (params?: { membreId?: string; periode?: string; annee?: string }) => {
        const qp = new URLSearchParams();
        if (params?.membreId) qp.append('membreId', params.membreId);
        if (params?.periode) qp.append('periode', params.periode);
        if (params?.annee) qp.append('annee', params.annee);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/evaluations${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/evaluations/${id}`),
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/rh/evaluations', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/rh/evaluations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/rh/evaluations/${id}`, { method: 'DELETE' }),
    },
  },

  // Agent IA - Base de Connaissances
  agentKnowledge: {
    list: (params?: { categorie?: string; actif?: string; search?: string; page?: string; limit?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.categorie) queryParams.append('categorie', params.categorie);
      if (params?.actif) queryParams.append('actif', params.actif);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.page) queryParams.append('page', params.page);
      if (params?.limit) queryParams.append('limit', params.limit);
      const query = queryParams.toString();
      return authenticatedFetch<{ success: boolean; data: { entries: unknown[]; total: number; page: number; limit: number; totalPages: number } }>(`/api/agent-knowledge${query ? `?${query}` : ''}`);
    },
    get: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { entry: unknown } }>(`/api/agent-knowledge/${id}`),
    create: (data: { titre: string; contenu: string; categorie?: string; motsCles?: string | null; actif?: boolean; ordre?: number }) =>
      authenticatedFetch<{ success: boolean; data: { entry: unknown } }>('/api/agent-knowledge', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      authenticatedFetch<{ success: boolean; data: { entry: unknown } }>(`/api/agent-knowledge/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      authenticatedFetch<{ success: boolean }>(`/api/agent-knowledge/${id}`, { method: 'DELETE' }),
  },
};

// Types pour les factures
export interface Invoice {
  id: string;
  tenantId: string;
  type: 'facture_entreprise' | 'facture_client_final' | 'facture_achat';
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
  // Champs fournisseur (facture d'achat)
  fournisseurNom?: string | null;
  fournisseurSiret?: string | null;
  fournisseurTvaIntra?: string | null;
  fournisseurAdresse?: string | null;
  categorieFrais?: string | null;
  documentOriginalUrl?: string | null;
  ocrData?: Record<string, unknown> | null;
  clientFinal?: {
    id: string;
    email: string;
    nom?: string | null;
    prenom?: string | null;
    raisonSociale?: string | null;
  };
  bonsCommande?: { id: string; numeroBdc: string; statut: string }[];
  devis?: { id: string; numeroDevis: string; statut: string }[];
  proformas?: { id: string; numeroProforma: string; statut: string }[];
  comptabilisation?: { id?: string; numeroPiece?: string; error?: string } | null;
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

// Types pour les plans et modules
export interface ModuleMetier {
  id: string;
  code: string;
  nomAffiche: string;
  description: string | null;
  categorie: string | null;
  icone: string | null;
  prixParMois: number;
  ordreAffichage: number;
  actif: boolean;
  _count?: { planModules: number; clientModules: number };
}

export interface PlanModule {
  id: string;
  planId: string;
  moduleId: string;
  limiteUsage: number | null;
  config: Record<string, unknown> | null;
  module: ModuleMetier;
}

export interface PlanWithModules {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  prixMensuel: number;
  prixAnnuel: number | null;
  stripeProductId: string | null;
  stripePriceIdMensuel: string | null;
  stripePriceIdAnnuel: string | null;
  essaiJours: number;
  ordreAffichage: number;
  actif: boolean;
  couleur: string | null;
  planModules: PlanModule[];
  _count?: { clientSubscriptions: number };
  createdAt: string;
  updatedAt: string;
}

export interface ClientModuleData {
  id: string;
  clientFinalId: string;
  moduleId: string;
  actif: boolean;
  limiteUsage: number | null;
  usageActuel: number;
  config: Record<string, unknown> | null;
  activatedAt: string;
  expiresAt: string | null;
  module: ModuleMetier;
}

// Type pour les pages CMS
export interface CmsPageData {
  id: string;
  slug: string;
  titre: string;
  contenu: string;
  metaTitle: string | null;
  metaDesc: string | null;
  publie: boolean;
  ordre: number;
  createdAt: string;
  updatedAt: string;
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

// Type pour les espaces clients
export interface ClientSpace {
  id: string;
  tenantId: string;
  clientFinalId: string;
  clientTenantId?: string | null;
  tenantSlug: string;
  folderPath?: string | null;
  status: 'en_creation' | 'en_attente_validation' | 'actif' | 'suspendu' | 'supprime';
  modulesActives: string[];
  validatedAt?: string | null;
  validatedByUserId?: string | null;
  clientNom?: string | null;
  clientPrenom?: string | null;
  raisonSociale?: string | null;
  clientEmail?: string | null;
  clientTelephone?: string | null;
  createdAt: string;
  updatedAt: string;
}

