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
export async function authenticatedFetch<T>(
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

// Marketing Digital types
interface MarketingPost { id: string; tenantId: string; plateforme: 'facebook' | 'instagram' | 'tiktok'; type: 'module_presentation' | 'astuce' | 'temoignage' | 'promo'; sujet: string; contenuTexte?: string | null; contenuVisuelUrl?: string | null; contenuVisuelUrls?: string[] | null; contenuVideoUrl?: string | null; hashtags?: string | null; datePublication: string; status: 'planifie' | 'publie' | 'erreur'; postExternalId?: string | null; engagementData?: Record<string, unknown> | null; semaineCycle?: number | null; erreurDetail?: string | null; createdAt: string; updatedAt: string }
interface MarketingStats { totalPosts: number; parPlateforme: Array<{ plateforme: string; count: number }>; parStatus: Array<{ status: string; count: number }>; parType: Array<{ type: string; count: number }>; recentPosts: MarketingPost[] }

// Gestion de Stock types
interface StockSite { id: string; tenantId: string; code: string; designation: string; adresse?: string | null; telephone?: string | null; email?: string | null; responsable?: string | null; statut: string; createdAt: string; updatedAt: string; _count?: { stockLevels: number; movementsOnSite: number } }
interface StockLevel { id: string; tenantId: string; articleId: string; siteId: string; quantite: number; quantiteReservee: number; seuilMinimum?: number | null; seuilMaximum?: number | null; article: { code: string; designation: string; prixUnitaireHt?: number | null; unite?: string | null }; site: { code: string; designation: string } }
interface StockMovement { id: string; tenantId: string; articleId: string; siteId: string; typeOperation: string; quantite: number; quantiteAvant: number; quantiteApres: number; referenceType?: string | null; motif?: string | null; utilisateurNom?: string | null; dateOperation: string; article: { code: string; designation: string }; site: { code: string; designation: string } }
interface StockTransfer { id: string; tenantId: string; numero: string; siteFromId: string; siteToId: string; statut: string; dateCreation: string; dateEnvoi?: string | null; dateReception?: string | null; notes?: string | null; siteFrom: { code: string; designation: string }; siteTo: { code: string; designation: string }; lines: Array<{ id: string; articleId: string; quantiteEnvoyee: number; quantiteRecue?: number | null; article: { code: string; designation: string } }> }
interface StockInventory { id: string; tenantId: string; numero: string; siteId: string; dateDebut: string; dateFin?: string | null; statut: string; responsable?: string | null; ecartTotal: number; notes?: string | null; site: { code: string; designation: string }; items?: Array<{ id: string; articleId: string; quantiteSysteme: number; quantiteComptee?: number | null; ecart?: number | null; article: { code: string; designation: string; unite?: string | null } }>; _count?: { items: number } }
interface StockAlert { id: string; tenantId: string; articleId: string; siteId: string; typeAlerte: string; statut: string; dateAlerte: string; article: { code: string; designation: string }; site: { code: string; designation: string } }
interface StockDashboard { totalSites: number; totalArticles: number; totalAlertesActives: number; transfertsEnCours: number; inventairesEnCours: number; valeurTotale: number; recentMovements: StockMovement[] }

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
      authenticatedFetch<{ success: boolean; data: { subscription: { id: string; nomPlan: string; montantMensuel: number; modulesInclus: string[]; statut: string; dateDebut: string; dateProchainRenouvellement: string; idAbonnementStripe?: string; idClientStripe?: string; temporaryPassword?: string | null } | null } }>(`/api/clients/${id}/subscription`),
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
    chat: (message: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>, fileIds?: string[]) =>
      authenticatedFetch<{ success: boolean; reply: string; error?: string }>('/api/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history: history ?? [], fileIds: fileIds ?? [] }),
      }),
    /** Upload de fichiers pour pièces jointes email (base64 JSON). Retourne les fileIds à passer dans chat() */
    upload: async (files: File[]): Promise<{ success: boolean; files: Array<{ fileId: string; filename: string; size: number }> }> => {
      const toBase64 = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1] || '';
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

      const payload = await Promise.all(
        files.map(async (f) => ({
          filename: f.name,
          contentType: f.type || 'application/octet-stream',
          base64: await toBase64(f),
        }))
      );

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${baseUrl}/api/agent/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ files: payload }),
      });
      if (!res.ok) throw new Error(`Upload échoué: ${res.status}`);
      return res.json();
    },
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
    import: (csv: string) =>
      authenticatedFetch<{ success: boolean; data: { created: number; updated: number; errors: Array<{ row: number; message: string }>; totalProcessed: number } }>('/api/article-codes/import', {
        method: 'POST',
        body: JSON.stringify({ csv }),
      }),
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
    // Prévisionnels
    previsionnels: {
      list: (params?: { clientFinalId?: string; annee?: string; statut?: string }) => {
        const qp = new URLSearchParams();
        if (params?.clientFinalId) qp.append('clientFinalId', params.clientFinalId);
        if (params?.annee) qp.append('annee', params.annee);
        if (params?.statut) qp.append('statut', params.statut);
        const q = qp.toString();
        return authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/previsionnels${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/previsionnels/${id}`),
      create: (data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/comptabilite/previsionnels', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>(`/api/comptabilite/previsionnels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        authenticatedFetch<{ success: boolean }>(`/api/comptabilite/previsionnels/${id}`, { method: 'DELETE' }),
    },
  },

  // Conformité France
  conformite: {
    // Dashboard conformité
    dashboard: () =>
      authenticatedFetch<ConformiteResponse>('/api/conformite/dashboard'),

    // FEC
    fec: {
      generer: (data: { exerciceId: string; siren: string }) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/fec/generer', { method: 'POST', body: JSON.stringify(data) }),
      liste: (params?: { exerciceId?: string }) => {
        const qp = new URLSearchParams();
        if (params?.exerciceId) qp.append('exerciceId', params.exerciceId);
        const q = qp.toString();
        return authenticatedFetch<ConformiteResponse>(`/api/conformite/fec/liste${q ? `?${q}` : ''}`);
      },
      exporter: (fecId: string) =>
        authenticatedFetch<ConformiteResponse>(`/api/conformite/fec/exporter?fecId=${fecId}`),
      valider: (fecId: string) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/fec/valider', { method: 'POST', body: JSON.stringify({ fecId }) }),
    },

    // Périodes comptables
    periodes: {
      generer: (exerciceId: string) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/periodes/generer', { method: 'POST', body: JSON.stringify({ exerciceId }) }),
      liste: (exerciceId: string) =>
        authenticatedFetch<ConformiteResponse>(`/api/conformite/periodes?exerciceId=${exerciceId}`),
      cloturer: (periodeId: string) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/periodes/cloturer', { method: 'POST', body: JSON.stringify({ periodeId }) }),
    },

    // Piste d'audit fiable
    pisteAudit: {
      liste: (params?: { chaineFluide?: string; documentType?: string; page?: number; limit?: number }) => {
        const qp = new URLSearchParams();
        if (params?.chaineFluide) qp.append('chaineFluide', params.chaineFluide);
        if (params?.documentType) qp.append('documentType', params.documentType);
        if (params?.page) qp.append('page', params.page.toString());
        if (params?.limit) qp.append('limit', params.limit.toString());
        const q = qp.toString();
        return authenticatedFetch<ConformiteResponse>(`/api/conformite/piste-audit${q ? `?${q}` : ''}`);
      },
      create: (data: {
        chaineFluide: string;
        etape: 'devis' | 'bon_commande' | 'bon_livraison' | 'facture' | 'ecriture_comptable' | 'paiement' | 'avoir';
        documentType: string;
        documentId: string;
        documentRef: string;
        dateDocument: string;
        montantHt: number;
        montantTtc: number;
        hashDocument: string;
        etapePrecedenteId?: string;
        metadata?: string;
      }) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/piste-audit', { method: 'POST', body: JSON.stringify(data) }),
      chaine: (chaineFluide: string) =>
        authenticatedFetch<ConformiteResponse>(`/api/conformite/piste-audit/chaine/${chaineFluide}`),
    },

    // Archivage légal
    archives: {
      liste: (params?: { exerciceId?: string; typeArchive?: string; page?: number; limit?: number }) => {
        const qp = new URLSearchParams();
        if (params?.exerciceId) qp.append('exerciceId', params.exerciceId);
        if (params?.typeArchive) qp.append('typeArchive', params.typeArchive);
        if (params?.page) qp.append('page', params.page.toString());
        if (params?.limit) qp.append('limit', params.limit.toString());
        const q = qp.toString();
        return authenticatedFetch<ConformiteResponse>(`/api/conformite/archives${q ? `?${q}` : ''}`);
      },
      creer: (data: { exerciceId: string; typeArchive: 'fec' | 'grand_livre' | 'balance' | 'bilan' | 'journal' | 'tva' }) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/archives/creer', { method: 'POST', body: JSON.stringify(data) }),
      verifierIntegrite: (archiveId: string) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/archives/verifier-integrite', { method: 'POST', body: JSON.stringify({ archiveId }) }),
    },

    // Facturation électronique Factur-X
    facturx: {
      generer: (data: { invoiceId: string; profil?: 'minimum' | 'basic' | 'en16931'; formatXml?: 'CII' | 'UBL' }) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/facturx/generer', { method: 'POST', body: JSON.stringify(data) }),
      liste: (params?: { statutTransmission?: string; page?: number; limit?: number }) => {
        const qp = new URLSearchParams();
        if (params?.statutTransmission) qp.append('statutTransmission', params.statutTransmission);
        if (params?.page) qp.append('page', params.page.toString());
        if (params?.limit) qp.append('limit', params.limit.toString());
        const q = qp.toString();
        return authenticatedFetch<ConformiteResponse>(`/api/conformite/facturx${q ? `?${q}` : ''}`);
      },
      transmettre: (data: { factureElectroniqueId: string; plateformeType: 'chorus_pro' | 'pdp' }) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/facturx/transmettre', { method: 'POST', body: JSON.stringify(data) }),
      statut: (factureElectroniqueId: string) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/facturx/statut', { method: 'POST', body: JSON.stringify({ factureElectroniqueId }) }),
    },

    // E-Reporting
    eReporting: {
      generer: (data: { periodeDebut: string; periodeFin: string; typeTransaction: 'b2c_france' | 'b2b_international' | 'b2c_international' }) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/e-reporting/generer', { method: 'POST', body: JSON.stringify(data) }),
      liste: (params?: { statut?: string; typeTransaction?: string; page?: number; limit?: number }) => {
        const qp = new URLSearchParams();
        if (params?.statut) qp.append('statut', params.statut);
        if (params?.typeTransaction) qp.append('typeTransaction', params.typeTransaction);
        if (params?.page) qp.append('page', params.page.toString());
        if (params?.limit) qp.append('limit', params.limit.toString());
        const q = qp.toString();
        return authenticatedFetch<ConformiteResponse>(`/api/conformite/e-reporting${q ? `?${q}` : ''}`);
      },
      transmettre: (data: { eReportingId: string; plateformeType: 'chorus_pro' | 'pdp' }) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/e-reporting/transmettre', { method: 'POST', body: JSON.stringify(data) }),
    },

    // EDI-TVA
    ediTva: {
      generer: (data: { declarationTvaId: string; regimeTva: 'reel_normal' | 'reel_simplifie' | 'mini_reel'; formulaireCerfa: 'CA3' | 'CA12' }) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/edi-tva/generer', { method: 'POST', body: JSON.stringify(data) }),
      liste: (params?: { statutTransmission?: string; page?: number; limit?: number }) => {
        const qp = new URLSearchParams();
        if (params?.statutTransmission) qp.append('statutTransmission', params.statutTransmission);
        if (params?.page) qp.append('page', params.page.toString());
        if (params?.limit) qp.append('limit', params.limit.toString());
        const q = qp.toString();
        return authenticatedFetch<ConformiteResponse>(`/api/conformite/edi-tva${q ? `?${q}` : ''}`);
      },
      transmettre: (ediTvaId: string) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/edi-tva/transmettre', { method: 'POST', body: JSON.stringify({ ediTvaId }) }),
    },

    // API Sirene
    sirene: {
      verifier: (siret: string) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/sirene/verifier', { method: 'POST', body: JSON.stringify({ siret }) }),
      verifierLot: (sirets: string[]) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/sirene/verifier-lot', { method: 'POST', body: JSON.stringify({ sirets }) }),
      historique: (params?: { siret?: string; page?: number; limit?: number }) => {
        const qp = new URLSearchParams();
        if (params?.siret) qp.append('siret', params.siret);
        if (params?.page) qp.append('page', params.page.toString());
        if (params?.limit) qp.append('limit', params.limit.toString());
        const q = qp.toString();
        return authenticatedFetch<ConformiteResponse>(`/api/conformite/sirene/historique${q ? `?${q}` : ''}`);
      },
    },

    // DAS2
    das2: {
      generer: (data: { exerciceId: string; annee: number; seuilMinimum?: number }) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/das2/generer', { method: 'POST', body: JSON.stringify(data) }),
      liste: (params?: { statut?: string; page?: number; limit?: number }) => {
        const qp = new URLSearchParams();
        if (params?.statut) qp.append('statut', params.statut);
        if (params?.page) qp.append('page', params.page.toString());
        if (params?.limit) qp.append('limit', params.limit.toString());
        const q = qp.toString();
        return authenticatedFetch<ConformiteResponse>(`/api/conformite/das2${q ? `?${q}` : ''}`);
      },
      get: (id: string) =>
        authenticatedFetch<ConformiteResponse>(`/api/conformite/das2/${id}`),
      transmettre: (das2Id: string) =>
        authenticatedFetch<ConformiteResponse>('/api/conformite/das2/transmettre', { method: 'POST', body: JSON.stringify({ das2Id }) }),
    },
  },

  // Logs
  logs: {
    list: (params?: { workflow?: string; statutExecution?: 'en_attente' | 'succes' | 'erreur'; typeEvenement?: string; limit?: number; offset?: number }) => {
      const queryParams = new URLSearchParams();
      if (params?.workflow) queryParams.append('workflow', params.workflow);
      if (params?.statutExecution) queryParams.append('statutExecution', params.statutExecution);
      if (params?.typeEvenement) queryParams.append('typeEvenement', params.typeEvenement);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      const query = queryParams.toString();
      return authenticatedFetch<{ success: boolean; data?: { logs: Log[]; total: number; limit: number; offset: number }; error?: string }>(`/api/logs${query ? `?${query}` : ''}`);
    },
    stats: (workflow?: string) => {
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
      listAll: () =>
        authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/btp/situations'),
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

  // Auth (changement / reset mot de passe)
  auth: {
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      authenticatedFetch<{ success: boolean; message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Erreur' }));
        throw new Error(err.message || 'Erreur');
      }
      return response.json();
    },

    resetPassword: async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Erreur' }));
        throw new Error(err.message || 'Erreur');
      }
      return response.json();
    },
  },

  // Partenaires
  partners: {
    list: (params?: { statut?: string; type?: string }) => {
      const qp = new URLSearchParams();
      if (params?.statut) qp.append('statut', params.statut);
      if (params?.type) qp.append('type', params.type);
      const q = qp.toString();
      return authenticatedFetch<{ success: boolean; data: { partners: unknown[] } }>(`/api/partners${q ? `?${q}` : ''}`);
    },
    get: (id: string) => authenticatedFetch<{ success: boolean; data: { partner: unknown } }>(`/api/partners/${id}`),
    create: (data: Record<string, unknown>) => authenticatedFetch<{ success: boolean; data: { partner: unknown } }>('/api/partners', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: Record<string, unknown>) => authenticatedFetch<{ success: boolean; data: { partner: unknown } }>(`/api/partners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    dashboard: (id: string) => authenticatedFetch<{ success: boolean; data: unknown }>(`/api/partners/${id}/dashboard`),
  },

  // Revenus & Commissions
  revenue: {
    dashboard: () => authenticatedFetch<{ success: boolean; data: unknown }>('/api/revenue/dashboard'),
    commissions: (params?: { statut?: string; partnerId?: string; mois?: string }) => {
      const qp = new URLSearchParams();
      if (params?.statut) qp.append('statut', params.statut);
      if (params?.partnerId) qp.append('partnerId', params.partnerId);
      if (params?.mois) qp.append('mois', params.mois);
      const q = qp.toString();
      return authenticatedFetch<{ success: boolean; data: { commissions: unknown[] } }>(`/api/revenue/commissions${q ? `?${q}` : ''}`);
    },
    events: (params?: { type?: string; mois?: string }) => {
      const qp = new URLSearchParams();
      if (params?.type) qp.append('type', params.type);
      if (params?.mois) qp.append('mois', params.mois);
      const q = qp.toString();
      return authenticatedFetch<{ success: boolean; data: { events: unknown[] } }>(`/api/revenue/events${q ? `?${q}` : ''}`);
    },
  },

  // Marketing Digital
  marketing: {
    listPosts: (params?: { plateforme?: string; status?: string; type?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.append(k, String(v)); });
      const qs = q.toString();
      return authenticatedFetch<{ success: boolean; data: { posts: MarketingPost[]; total: number; page: number; limit: number; totalPages: number } }>(`/api/marketing/posts${qs ? `?${qs}` : ''}`);
    },
    getPost: (id: string) => authenticatedFetch<{ success: boolean; data: { post: MarketingPost } }>(`/api/marketing/posts/${id}`),
    createPost: (data: { plateforme: string; type: string; sujet: string; contenuTexte?: string | null; contenuVisuelUrl?: string | null; contenuVisuelUrls?: string[] | null; contenuVideoUrl?: string | null; hashtags?: string | null; datePublication?: string; semaineCycle?: number | null }) =>
      authenticatedFetch<{ success: boolean; data: { post: MarketingPost } }>('/api/marketing/posts', { method: 'POST', body: JSON.stringify(data) }),
    updatePost: (id: string, data: Partial<{ plateforme: string; type: string; sujet: string; contenuTexte: string | null; contenuVisuelUrl: string | null; contenuVisuelUrls: string[] | null; contenuVideoUrl: string | null; hashtags: string | null; datePublication: string; status: string; postExternalId: string | null; engagementData: Record<string, unknown> | null; semaineCycle: number | null; erreurDetail: string | null }>) =>
      authenticatedFetch<{ success: boolean; data: { post: MarketingPost } }>(`/api/marketing/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePost: (id: string) => authenticatedFetch<{ success: boolean; message: string }>(`/api/marketing/posts/${id}`, { method: 'DELETE' }),
    getStats: () => authenticatedFetch<{ success: boolean; data: { stats: MarketingStats } }>('/api/marketing/stats'),
    getCalendar: () => authenticatedFetch<{ success: boolean; data: unknown }>('/api/marketing/calendar'),
    triggerPublish: (data?: { postId?: string; plateforme?: string; contenuTexte?: string; hashtags?: string; sujet?: string; type?: string }) =>
      authenticatedFetch<{ success: boolean; data: unknown; message: string }>('/api/marketing/publish', { method: 'POST', ...(data ? { body: JSON.stringify(data) } : {}) }),
    getStatus: () => authenticatedFetch<{ success: boolean; data: unknown }>('/api/marketing/status'),
    generateContent: (data: { plateforme: string; type: string; sujet: string }) =>
      authenticatedFetch<{ success: boolean; data: { contenuTexte: string; hashtags: string } }>('/api/marketing/generate', { method: 'POST', body: JSON.stringify(data) }),
    getConfig: () =>
      authenticatedFetch<{ success: boolean; data: Record<string, unknown> }>('/api/marketing/config'),
    saveConfig: (config: Record<string, unknown>) =>
      authenticatedFetch<{ success: boolean; message: string }>('/api/marketing/config', { method: 'PUT', body: JSON.stringify(config) }),
  },

  // Newsletter
  newsletter: {
    // Subscribers
    listSubscribers: (params?: { limit?: number; offset?: number; search?: string; status?: string; source?: string; listId?: string }) => {
      const q = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.append(k, String(v)); });
      const qs = q.toString();
      return authenticatedFetch<{ success: boolean; data: { subscribers: unknown[]; total: number } }>(`/api/newsletters/subscribers${qs ? `?${qs}` : ''}`);
    },
    createSubscriber: (data: { email: string; telephone?: string; nom?: string; prenom?: string; entreprise?: string; source?: string; tags?: string[] }) =>
      authenticatedFetch<{ success: boolean; data: unknown }>('/api/newsletters/subscribers', { method: 'POST', body: JSON.stringify(data) }),
    updateSubscriber: (id: string, data: Record<string, unknown>) =>
      authenticatedFetch<{ success: boolean; data: unknown }>(`/api/newsletters/subscribers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSubscriber: (id: string) =>
      authenticatedFetch<{ success: boolean }>(`/api/newsletters/subscribers/${id}`, { method: 'DELETE' }),
    // Subscriber Lists
    listSubscriberLists: () =>
      authenticatedFetch<{ success: boolean; data: { lists: unknown[] } }>('/api/newsletters/subscribers/lists'),
    createSubscriberList: (data: { nom: string; description?: string; type?: string; couleur?: string; subscriberIds?: string[] }) =>
      authenticatedFetch<{ success: boolean; data: unknown }>('/api/newsletters/subscribers/lists', { method: 'POST', body: JSON.stringify(data) }),
    // Email Templates
    listTemplates: (params?: { categorie?: string }) => {
      const q = new URLSearchParams();
      if (params?.categorie) q.append('categorie', params.categorie);
      const qs = q.toString();
      return authenticatedFetch<{ success: boolean; data: { templates: unknown[] } }>(`/api/newsletters/templates${qs ? `?${qs}` : ''}`);
    },
    getTemplate: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { template: unknown } }>(`/api/newsletters/templates/${id}`),
    createTemplate: (data: { nom: string; sujet: string; contenuHtml: string; contenuText?: string; variables?: string[]; categorie?: string }) =>
      authenticatedFetch<{ success: boolean; data: unknown }>('/api/newsletters/templates', { method: 'POST', body: JSON.stringify(data) }),
    updateTemplate: (id: string, data: Record<string, unknown>) =>
      authenticatedFetch<{ success: boolean; data: unknown }>(`/api/newsletters/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTemplate: (id: string) =>
      authenticatedFetch<{ success: boolean }>(`/api/newsletters/templates/${id}`, { method: 'DELETE' }),
    // Campaigns
    listCampaigns: (params?: { limit?: number; offset?: number; status?: string }) => {
      const q = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.append(k, String(v)); });
      const qs = q.toString();
      return authenticatedFetch<{ success: boolean; data: { campaigns: unknown[]; total: number } }>(`/api/newsletters/campaigns${qs ? `?${qs}` : ''}`);
    },
    getCampaignStats: () =>
      authenticatedFetch<{ success: boolean; data: { stats: unknown } }>('/api/newsletters/campaigns/stats'),
    getCampaign: (id: string) =>
      authenticatedFetch<{ success: boolean; data: { campaign: unknown } }>(`/api/newsletters/campaigns/${id}`),
    createCampaign: (data: { nom: string; sujet: string; templateId?: string; listId?: string; contenuHtml: string; contenuText?: string; expediteurNom: string; expediteurEmail: string; scheduledAt?: string }) =>
      authenticatedFetch<{ success: boolean; data: unknown }>('/api/newsletters/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    updateCampaign: (id: string, data: Record<string, unknown>) =>
      authenticatedFetch<{ success: boolean; data: unknown }>(`/api/newsletters/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCampaign: (id: string) =>
      authenticatedFetch<{ success: boolean }>(`/api/newsletters/campaigns/${id}`, { method: 'DELETE' }),
    // SMS Campaigns
    listSmsCampaigns: (params?: { limit?: number; offset?: number; status?: string }) => {
      const q = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) q.append(k, String(v)); });
      const qs = q.toString();
      return authenticatedFetch<{ success: boolean; data: { campaigns: unknown[]; total: number } }>(`/api/newsletters/sms-campaigns${qs ? `?${qs}` : ''}`);
    },
    getSmsCampaignStats: () =>
      authenticatedFetch<{ success: boolean; data: { stats: unknown } }>('/api/newsletters/sms-campaigns/stats'),
    createSmsCampaign: (data: { nom: string; contenu: string; listId?: string; scheduledAt?: string }) =>
      authenticatedFetch<{ success: boolean; data: unknown }>('/api/newsletters/sms-campaigns', { method: 'POST', body: JSON.stringify(data) }),
    // Subscriber Stats
    getSubscriberStats: () =>
      authenticatedFetch<{ success: boolean; data: { stats: unknown } }>('/api/newsletters/subscribers/stats'),
    // Analytics
    getAnalytics: () =>
      authenticatedFetch<{ success: boolean; data: { analytics: unknown } }>('/api/newsletters/analytics'),
    // Send test email
    sendTestEmail: (data: { sujet: string; contenuHtml: string }) =>
      authenticatedFetch<{ success: boolean }>('/api/newsletters/campaigns/test-email', { method: 'POST', body: JSON.stringify(data) }),
    // Dashboard
    getDashboard: () =>
      authenticatedFetch<{ success: boolean; data: { dashboard: unknown } }>('/api/newsletters/dashboard'),
  },

  // Gestion de Stock
  stockSites: {
    list: () => authenticatedFetch<{ success: boolean; data: { sites: StockSite[] } }>('/api/stock/sites'),
    get: (id: string) => authenticatedFetch<{ success: boolean; data: { site: StockSite } }>(`/api/stock/sites/${id}`),
    create: (data: { code: string; designation: string; adresse?: string | null; telephone?: string | null; email?: string | null; responsable?: string | null }) =>
      authenticatedFetch<{ success: boolean; data: { site: StockSite } }>('/api/stock/sites', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ code: string; designation: string; adresse: string | null; telephone: string | null; email: string | null; responsable: string | null; statut: string }>) =>
      authenticatedFetch<{ success: boolean; data: { site: StockSite } }>(`/api/stock/sites/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => authenticatedFetch<{ success: boolean }>(`/api/stock/sites/${id}`, { method: 'DELETE' }),
  },

  stockLevels: {
    list: (params?: { siteId?: string; articleId?: string }) => {
      const q = new URLSearchParams();
      if (params?.siteId) q.append('siteId', params.siteId);
      if (params?.articleId) q.append('articleId', params.articleId);
      const qs = q.toString();
      return authenticatedFetch<{ success: boolean; data: { levels: StockLevel[] } }>(`/api/stock/levels${qs ? `?${qs}` : ''}`);
    },
  },

  stockMovements: {
    list: (params?: { siteId?: string; articleId?: string; typeOperation?: string; dateFrom?: string; dateTo?: string; page?: string; limit?: string }) => {
      const q = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v) q.append(k, v); });
      const qs = q.toString();
      return authenticatedFetch<{ success: boolean; data: { movements: StockMovement[]; total: number } }>(`/api/stock/movements${qs ? `?${qs}` : ''}`);
    },
    createManual: (data: { articleId: string; siteId: string; typeOperation: string; quantite: number; motif?: string | null }) =>
      authenticatedFetch<{ success: boolean; data: { movement: StockMovement } }>('/api/stock/movements/manual', { method: 'POST', body: JSON.stringify(data) }),
  },

  stockTransfers: {
    list: (params?: { statut?: string }) => {
      const q = new URLSearchParams();
      if (params?.statut) q.append('statut', params.statut);
      const qs = q.toString();
      return authenticatedFetch<{ success: boolean; data: { transfers: StockTransfer[] } }>(`/api/stock/transfers${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => authenticatedFetch<{ success: boolean; data: { transfer: StockTransfer } }>(`/api/stock/transfers/${id}`),
    create: (data: { siteFromId: string; siteToId: string; notes?: string | null; lines: Array<{ articleId: string; quantite: number }> }) =>
      authenticatedFetch<{ success: boolean; data: { transfer: StockTransfer } }>('/api/stock/transfers', { method: 'POST', body: JSON.stringify(data) }),
    confirm: (id: string) => authenticatedFetch<{ success: boolean }>(`/api/stock/transfers/${id}/confirm`, { method: 'POST' }),
    receive: (id: string, data?: { lines?: Array<{ lineId: string; quantiteRecue: number }> }) =>
      authenticatedFetch<{ success: boolean }>(`/api/stock/transfers/${id}/receive`, { method: 'POST', body: JSON.stringify(data || {}) }),
  },

  stockInventories: {
    list: () => authenticatedFetch<{ success: boolean; data: { inventories: StockInventory[] } }>('/api/stock/inventories'),
    get: (id: string) => authenticatedFetch<{ success: boolean; data: { inventory: StockInventory } }>(`/api/stock/inventories/${id}`),
    create: (data: { siteId: string; dateDebut: string; responsable?: string | null; notes?: string | null }) =>
      authenticatedFetch<{ success: boolean; data: { inventory: StockInventory } }>('/api/stock/inventories', { method: 'POST', body: JSON.stringify(data) }),
    updateItems: (id: string, data: { items: Array<{ articleId: string; quantiteComptee: number; notes?: string | null }> }) =>
      authenticatedFetch<{ success: boolean }>(`/api/stock/inventories/${id}/items`, { method: 'PUT', body: JSON.stringify(data) }),
    finalize: (id: string) => authenticatedFetch<{ success: boolean }>(`/api/stock/inventories/${id}/finalize`, { method: 'POST' }),
  },

  stockAlerts: {
    list: (params?: { statut?: string }) => {
      const q = new URLSearchParams();
      if (params?.statut) q.append('statut', params.statut);
      const qs = q.toString();
      return authenticatedFetch<{ success: boolean; data: { alerts: StockAlert[] } }>(`/api/stock/alerts${qs ? `?${qs}` : ''}`);
    },
    resolve: (id: string) => authenticatedFetch<{ success: boolean }>(`/api/stock/alerts/${id}/resolve`, { method: 'PUT' }),
  },

  stockDashboard: {
    get: () => authenticatedFetch<{ success: boolean; data: { dashboard: StockDashboard } }>('/api/stock/dashboard'),
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
  byWorkflow: Record<string, { total: number; errors: number; succeeded: number }>;
}

// Type réponse API conformité France
type ConformiteResponse = { success: boolean; data?: Record<string, unknown>; error?: string };

// Types conformité détaillés
export interface FichierFec {
  id: string;
  exerciceId: string;
  nomFichier: string;
  siren: string;
  dateGeneration: string;
  dateDebut: string;
  dateFin: string;
  nbEcritures: number;
  nbLignes: number;
  hashSha256: string;
  tailleFichier: number;
  statut: 'genere' | 'valide' | 'exporte';
}

export interface PisteAuditEntry {
  id: string;
  chaineFluide: string;
  etape: 'devis' | 'bon_commande' | 'bon_livraison' | 'facture' | 'ecriture_comptable' | 'paiement' | 'avoir';
  documentType: string;
  documentId: string;
  documentRef: string;
  dateDocument: string;
  montantHt: number;
  montantTtc: number;
  hashDocument: string;
  etapePrecedenteId: string | null;
  createdAt: string;
}

export interface FactureElectronique {
  id: string;
  invoiceId: string;
  profil: 'minimum' | 'basic' | 'en16931';
  formatXml: 'CII' | 'UBL';
  plateformeType: string | null;
  statutTransmission: 'non_transmis' | 'en_cours' | 'transmis' | 'accepte' | 'refuse';
  dateTransmission: string | null;
  identifiantFlux: string | null;
}

export interface EReportingEntry {
  id: string;
  periodeDebut: string;
  periodeFin: string;
  typeTransaction: 'b2c_france' | 'b2b_international' | 'b2c_international';
  nbTransactions: number;
  montantHtTotal: number;
  montantTvaTotal: number;
  montantTtcTotal: number;
  statut: 'brouillon' | 'valide' | 'transmis' | 'rejete';
  dateTransmission: string | null;
}

export interface EdiTvaEntry {
  id: string;
  declarationTvaId: string;
  periodeDebut: string;
  periodeFin: string;
  regimeTva: string;
  formulaireCerfa: string;
  ligneTvaDue: number;
  ligneCreditTva: number;
  statutTransmission: string;
  dateTransmission: string | null;
}

export interface VerificationSireneEntry {
  id: string;
  siret: string;
  siren: string;
  denominationRs: string | null;
  adresseSiege: string | null;
  codePostal: string | null;
  ville: string | null;
  codeAPE: string | null;
  tvaIntracom: string | null;
  estActif: boolean;
  dateVerification: string;
}

export interface Das2Entry {
  id: string;
  exerciceId: string;
  annee: number;
  seuilMinimum: number;
  statut: 'brouillon' | 'valide' | 'transmis';
  dateTransmission: string | null;
}

export interface PeriodeComptableEntry {
  id: string;
  exerciceId: string;
  code: string;
  mois: number;
  annee: number;
  dateDebut: string;
  dateFin: string;
  cloture: boolean;
  dateCloture: string | null;
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

