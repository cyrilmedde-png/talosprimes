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
  
  let response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
    credentials: 'include',
  });

  // Si le token a expiré, essayer de le rafraîchir
  if (response.status === 401) {
    try {
      await refreshAccessToken();
      // Réessayer la requête avec le nouveau token
      const newToken = getAccessToken();
      response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
          ...options.headers,
        },
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

  // n8n
  n8n: {
    test: () => authenticatedFetch<{ success: boolean; message: string }>('/api/n8n/test'),
    workflows: () => authenticatedFetch<{ success: boolean; data: { workflows: unknown[] } }>('/api/n8n/workflows'),
  },
};

