'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { LegalPageLayout } from '@/components/LegalPageLayout';

export default function ConfidentialitePage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content`)
      .then((r) => r.json())
      .then((json) => {
        const data = json.data || json;
        setContent(data.confidentialite || '');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur chargement Confidentialité:', err);
        setLoading(false);
      });
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <LegalPageLayout title="Politique de Confidentialité & RGPD" lastUpdated={today}>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        </div>
      ) : content ? (
        <div className="prose prose-slate prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-semibold prose-p:text-slate-600 prose-p:leading-relaxed prose-a:text-slate-900 prose-a:underline prose-a:underline-offset-2">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-slate-500 text-center py-16">
          La politique de confidentialité n&apos;a pas encore été rédigée.
          Utilisez le CMS pour la générer avec l&apos;IA ou la rédiger manuellement.
        </p>
      )}
    </LegalPageLayout>
  );
}
