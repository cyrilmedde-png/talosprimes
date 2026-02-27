// Store Zustand pour l'état d'authentification et les modules actifs

import { create } from 'zustand';
import type { User } from '@/lib/auth';

// Tous les modules disponibles par défaut
const ALL_MODULES = [
  'clients', 'leads', 'facturation', 'devis', 'bons_commande',
  'avoirs', 'proformas', 'comptabilite', 'agent_telephonique',
  'articles', 'logs', 'notifications',
  'gestion_equipe', 'gestion_projet', 'btp', 'gestion_rh',
];

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  modulesActifs: string[];
  setUser: (user: User | null) => void;
  setModulesActifs: (modules: string[]) => void;
  clearAuth: () => void;
  hasModule: (moduleCode: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  modulesActifs: ALL_MODULES,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setModulesActifs: (modules) => set({ modulesActifs: modules.length > 0 ? modules : ALL_MODULES }),
  clearAuth: () => set({ user: null, isAuthenticated: false, modulesActifs: ALL_MODULES }),
  hasModule: (moduleCode) => get().modulesActifs.includes(moduleCode),
}));
