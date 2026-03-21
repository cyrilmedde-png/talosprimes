'use client';

import { useState } from 'react';
import type { GlobalConfig, SeoConfig } from './types';

interface Props {
  globalConfig: GlobalConfig;
  setGlobalConfig: (c: GlobalConfig) => void;
  api: {
    updateGlobalConfig: (section: string, config: Record<string, unknown>) => Promise<unknown>;
  };
  showToast: (type: 'success' | 'error', message: string) => void;
}

export function SeoManager({ globalConfig, setGlobalConfig, api, showToast }: Props) {
  const [seo, setSeo] = useState<SeoConfig>(globalConfig.seo || {});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.updateGlobalConfig('seo', seo as Record<string, unknown>);
      setGlobalConfig({ ...globalConfig, seo });
      showToast('success', 'SEO sauvegardé');
    } catch { showToast('error', 'Erreur'); }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">SEO & Référencement</h2>
          <p className="text-sm text-slate-500">Optimisez votre visibilité sur les moteurs de recherche</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Preview Google */}
        <div className="p-4 rounded-xl bg-white/5 border border-slate-800">
          <div className="text-xs text-slate-500 mb-2">Aperçu Google</div>
          <div className="text-blue-400 text-base font-medium truncate">{seo.metaTitle || 'TalosPrimes - Gestion d\'entreprise automatisée'}</div>
          <div className="text-emerald-400 text-xs font-mono mb-0.5">talosprimes.com</div>
          <div className="text-slate-400 text-xs line-clamp-2">{seo.metaDescription || 'Plateforme SaaS de gestion d\'entreprise orchestrée par n8n'}</div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1">Titre (meta title)</label>
          <input value={seo.metaTitle || ''} onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="TalosPrimes - Gestion d'entreprise automatisée" />
          <div className="text-[10px] text-slate-600 mt-0.5">{(seo.metaTitle || '').length}/60 caractères recommandés</div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1">Description (meta description)</label>
          <textarea value={seo.metaDescription || ''} onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })} rows={3} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none resize-none focus:ring-2 focus:ring-blue-500/30" />
          <div className="text-[10px] text-slate-600 mt-0.5">{(seo.metaDescription || '').length}/160 caractères recommandés</div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1">Image OG (Open Graph)</label>
          <input value={seo.ogImage || ''} onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="https://talosprimes.com/og-image.png" />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1">Favicon</label>
          <input value={seo.favicon || ''} onChange={(e) => setSeo({ ...seo, favicon: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="https://talosprimes.com/favicon.ico" />
        </div>

        <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition disabled:opacity-50 shadow-lg shadow-blue-600/20">
          {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder le SEO'}
        </button>
      </div>
    </div>
  );
}
