'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCmsApi } from './useCmsApi';
import { SectionsManager } from './SectionsManager';
import { DesignManager } from './DesignManager';
import { PagesManager } from './PagesManager';
import { TestimonialsManager } from './TestimonialsManager';
import { MessagesManager } from './MessagesManager';
import { SeoManager } from './SeoManager';
import type { CMSTab, LandingSection, GlobalConfig, Testimonial, CMSPage, ContactMessage } from './types';

const TABS: { id: CMSTab; label: string; icon: string; description: string }[] = [
  { id: 'sections', label: 'Sections', icon: '📐', description: 'Gérer les sections de la landing' },
  { id: 'pages', label: 'Pages', icon: '📄', description: 'Créer et éditer vos pages' },
  { id: 'design', label: 'Design', icon: '🎨', description: 'Thème, navbar et footer' },
  { id: 'testimonials', label: 'Avis', icon: '⭐', description: 'Gérer les témoignages' },
  { id: 'seo', label: 'SEO', icon: '🔍', description: 'Référencement et méta' },
  { id: 'messages', label: 'Messages', icon: '✉️', description: 'Messages de contact' },
];

export function CMSLayout() {
  const [activeTab, setActiveTab] = useState<CMSTab>('sections');
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({});
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const api = useCmsApi();

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const refreshPreview = useCallback(() => setPreviewKey(k => k + 1), []);

  // Load data based on active tab
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'sections' || activeTab === 'design') {
        const [s, g] = await Promise.all([api.fetchSections(), api.fetchGlobalConfig()]);
        setSections(s);
        setGlobalConfig(g);
      } else if (activeTab === 'testimonials') {
        setTestimonials(await api.fetchTestimonials());
      } else if (activeTab === 'pages') {
        setPages(await api.fetchPages());
      } else if (activeTab === 'messages') {
        setMessages(await api.fetchMessages());
      } else if (activeTab === 'seo') {
        setGlobalConfig(await api.fetchGlobalConfig());
      }
    } catch (err) {
      showToast('error', 'Erreur de chargement');
      console.error(err);
    }
    setLoading(false);
  }, [activeTab, api, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const siteUrl = typeof window !== 'undefined'
    ? window.location.origin.replace('app.', '').replace(':3000', ':3000')
    : '';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-950">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl backdrop-blur animate-slide-in ${
          toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
        }`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-sm">
            🎯
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">CMS Landing Page</h1>
            <p className="text-xs text-slate-500">Éditeur visuel de votre site</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPreviewOpen(!previewOpen); refreshPreview(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              previewOpen
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            👁️ {previewOpen ? 'Fermer preview' : 'Preview live'}
          </button>
          <a
            href={siteUrl || '/'}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            🌐 Voir le site
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — tabs */}
        <div className="w-56 border-r border-slate-800 bg-slate-900/50 p-3 flex flex-col gap-1 overflow-y-auto shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <div>
                <div className="text-sm font-medium">{tab.label}</div>
                <div className="text-[10px] text-slate-500 leading-tight">{tab.description}</div>
              </div>
            </button>
          ))}

          {/* Stats */}
          <div className="mt-auto pt-4 border-t border-slate-800">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-slate-800/50">
                <div className="text-lg font-bold text-white">{sections.filter(s => s.actif).length}</div>
                <div className="text-[10px] text-slate-500">Sections</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-800/50">
                <div className="text-lg font-bold text-white">{pages.length}</div>
                <div className="text-[10px] text-slate-500">Pages</div>
              </div>
            </div>
          </div>
        </div>

        {/* Center — editor */}
        <div className={`flex-1 overflow-y-auto ${previewOpen ? 'w-1/2' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-6">
              {activeTab === 'sections' && (
                <SectionsManager
                  sections={sections}
                  setSections={setSections}
                  api={api}
                  showToast={showToast}
                  refreshPreview={refreshPreview}
                />
              )}
              {activeTab === 'design' && (
                <DesignManager
                  globalConfig={globalConfig}
                  setGlobalConfig={setGlobalConfig}
                  api={api}
                  showToast={showToast}
                  refreshPreview={refreshPreview}
                />
              )}
              {activeTab === 'pages' && (
                <PagesManager
                  pages={pages}
                  setPages={setPages}
                  api={api}
                  showToast={showToast}
                />
              )}
              {activeTab === 'testimonials' && (
                <TestimonialsManager
                  testimonials={testimonials}
                  setTestimonials={setTestimonials}
                  api={api}
                  showToast={showToast}
                  refreshPreview={refreshPreview}
                />
              )}
              {activeTab === 'seo' && (
                <SeoManager
                  globalConfig={globalConfig}
                  setGlobalConfig={setGlobalConfig}
                  api={api}
                  showToast={showToast}
                />
              )}
              {activeTab === 'messages' && (
                <MessagesManager
                  messages={messages}
                  setMessages={setMessages}
                  api={api}
                  showToast={showToast}
                />
              )}
            </div>
          )}
        </div>

        {/* Right — live preview */}
        {previewOpen && (
          <div className="w-1/2 border-l border-slate-800 bg-slate-900 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <span className="ml-2 px-2 py-0.5 bg-slate-800 rounded text-[10px] font-mono">
                  {siteUrl || 'talosprimes.com'}
                </span>
              </div>
              <button onClick={refreshPreview} className="text-xs text-slate-500 hover:text-white transition px-2 py-1 rounded hover:bg-slate-800">
                🔄 Refresh
              </button>
            </div>
            <iframe
              key={previewKey}
              src={siteUrl || '/'}
              className="flex-1 w-full bg-white"
              title="Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}
