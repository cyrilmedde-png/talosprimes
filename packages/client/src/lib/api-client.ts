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
      return authenticatedFetch<{ success: boolean; data: { logs: Log[]; total: number; limit: number; offset: number } }>(`/api/logs${query ? `?${query}` : ''}`);
    },
    stats: (workflow?: 'leads' | 'clients' | 'all') => {
      const query = workflow ? `?workflow=${workflow}` : '';
      return authenticatedFetch<{ success: boolean; data: LogStats }>(`/api/logs/stats${query}`);
    },
  },
};

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

