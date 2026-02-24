'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { demoLogin } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';

export default function DemoPage() {
  const router = useRouter();
  const { setUser, setModulesActifs, setDemo } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function autoLogin() {
      try {
        const response = await demoLogin();

        if (!mounted) return;

        // Stocker l'utilisateur dans le store
        setUser(response.data.user);
        setDemo(true);

        // Modules actifs
        if (response.data.modulesActifs) {
          setModulesActifs(response.data.modulesActifs);
        }

        // Redirection vers le dashboard
        router.push('/dashboard');
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Erreur de connexion démo');
      }
    }

    autoLogin();

    return () => {
      mounted = false;
    };
  }, [router, setUser, setModulesActifs, setDemo]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-white">Mode Démo indisponible</h1>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="inline-flex items-center px-4 py-2 bg-amber-500 text-gray-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
        <h1 className="text-xl font-semibold text-white">
          Chargement du mode démo...
        </h1>
        <p className="text-gray-400 text-sm">
          Connexion automatique en cours
        </p>
      </div>
    </div>
  );
}
