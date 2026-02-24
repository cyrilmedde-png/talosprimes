'use client';

import { useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';

/**
 * Hook pour bloquer les actions dangereuses en mode démo.
 * Retourne :
 * - isDemo : boolean — true si le mode démo est actif
 * - guardAction : (callback) => void — exécute le callback seulement si PAS en mode démo, sinon affiche une alerte
 * - demoAlert : () => void — affiche directement le message de blocage
 */
export function useDemoGuard() {
  const { isDemo } = useAuthStore();

  const demoAlert = useCallback(() => {
    alert('🔒 Action non disponible en mode démo');
  }, []);

  const guardAction = useCallback(
    (callback: () => void | Promise<void>) => {
      if (isDemo) {
        demoAlert();
        return;
      }
      callback();
    },
    [isDemo, demoAlert],
  );

  return { isDemo, guardAction, demoAlert };
}
