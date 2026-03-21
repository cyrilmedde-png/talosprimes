'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Ancienne page de gestion des emails — redirige vers /automatisations
 * La gestion des emails est désormais intégrée dans l'onglet Configuration
 * de la page Automatisations (quand l'automatisation email est active).
 */
export default function EmailRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/automatisations');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-gray-400 text-sm">Redirection vers Automatisations...</p>
    </div>
  );
}
