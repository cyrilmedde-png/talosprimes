// Store Zustand pour l'état d'authentification et les modules actifs

import { create } from 'zustand';
import type { User } from '@/lib/auth';

// Tous les modules disponibles par défaut
const ALL_MODULES = [
  'dashboard',
  'clients', 'leads', 'prospects', 'partenaire',
  'facturation', 'devis', 'bons_commande', 'avoirs', 'proformas',
  'articles', 'revenus', 'comptabilite', 'abonnements', 'subscriptions',
  'gestion_projet', 'gestion_equipe', 'gestion_rh', 'btp',
  'gestion_stock',
  'agent_telephonique', 'sms', 'notifications', 'marketing_digital', 'newsletter',
  'conformite',
  'ticketing',
  'automatisations',
  'logs',
];

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  modulesActifs: string[];
  isClientUser: boolean;
  setUser: (user: User | null) => void;
  setModulesActifs: (modules: string[]) => void;
  setIsClientUser: (isClient: boolean) => void;
  clearAuth: () => void;
  hasModule: (moduleCode: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  modulesActifs: ALL_MODULES,
  isClientUser: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setModulesActifs: (modules) => set({ modulesActifs: modules }),
  setIsClientUser: (isClient) => set({ isClientUser: isClient }),
  clearAuth: () => set({ user: null, isAuthenticated: false, modulesActifs: ALL_MODULES, isClientUser: false }),
  hasModule: (moduleCode) => get().modulesActifs.includes(moduleCode),
}));
