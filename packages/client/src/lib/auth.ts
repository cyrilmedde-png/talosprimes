// Gestion de l'authentification côté client

import { API_URL } from './api.js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    tokens: AuthTokens;
  };
}

/**
 * Stocke les tokens dans le localStorage
 */
export function storeTokens(tokens: AuthTokens): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }
}

/**
 * Récupère le token d'accès depuis le localStorage
 */
export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
}

/**
 * Récupère le refresh token depuis le localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }
  return null;
}

/**
 * Supprime les tokens (déconnexion)
 */
export function clearTokens(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

/**
 * Login - Authentifie un utilisateur
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur de connexion' }));
    throw new Error(error.message || 'Erreur de connexion');
  }

  const data: LoginResponse = await response.json();
  
  // Stocker les tokens
  if (data.success && data.data.tokens) {
    storeTokens(data.data.tokens);
  }

  return data;
}

/**
 * Récupère les informations de l'utilisateur connecté
 */
export async function getCurrentUser(): Promise<User> {
  const token = getAccessToken();
  
  if (!token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(`${API_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearTokens();
      throw new Error('Session expirée');
    }
    throw new Error('Erreur lors de la récupération des informations');
  }

  const data = await response.json();
  return data.data.user;
}

/**
 * Rafraîchit le token d'accès
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    throw new Error('Aucun refresh token disponible');
  }

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error('Impossible de rafraîchir le token');
  }

  const data = await response.json();
  const newAccessToken = data.data.accessToken;
  
  // Mettre à jour le token
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', newAccessToken);
  }

  return newAccessToken;
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

