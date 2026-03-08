'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  FileText,
  MessageSquare,
  Lock,
  DollarSign,
  Layout,
  Plus,
  Trash2,
  Edit2,
  Eye,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface Section {
  id: string;
  type: string;
  titre: string;
  config: Record<string, any>;
  ordre: number;
  actif: boolean;
}

interface Testimonial {
  id: string;
  nom: string;
  prenom: string;
  entreprise: string;
  poste: string;
  note: number;
  commentaire: string;
  affiche: boolean;
  ordre: number;
}

interface ContactMessage {
  id: string;
  nom: string;
  email: string;
  sujet: string;
  message: string;
  date: string;
}

interface CMSPage {
  id: string;
  titre: string;
  slug: string;
  contenu: string;
  publie: boolean;
}

interface Plan {
  id: string;
  nom: string;
  description: string;
  prix: number;
  features: string[];
  populaire: boolean;
  ordre: number;
}

interface GlobalConfig {
  navbar?: {
    logo?: string;
    logoText?: string;
    links?: Array<{ text: string; href: string; type: string }>;
    ctaButton?: { text: string; href: string };
  };
  footer?: {
    companyName?: string;
    description?: string;
    columns?: Array<{ title: string; links: Array<{ text: string; href: string }> }>;
  };
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    bgColor?: string;
    textColor?: string;
    fontFamily?: string;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    favicon?: string;
  };
}

interface LandingContent {
  [key: string]: string | Record<string, any>;
}

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || localStorage.getItem('token');
};

const fetchApi = async (
  url: string,
  options?: RequestInit
): Promise<any> => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };

  const response = await fetch(`${API}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur API' }));
    throw new Error(error.message || `Erreur ${response.status}`);
  }

  return response.json();
};

export default function CMSPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('sections');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(false);

  const [sections, setSections] = useState<Section[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({});
  const [landingContent, setLandingContent] = useState<LandingContent>({});

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionType, setSectionType] = useState('hero');

  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);

  const [showPageModal, setShowPageModal] = useState(false);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Check admin access
  useEffect(() => {
    if (isAuthenticated && user?.role !== 'super_admin' && user?.role !== 'admin') {
      addToast('Accès refusé. Vous devez être administrateur.', 'error');
    }
  }, [user, isAuthenticated]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Load sections
  const loadSections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/landing/sections/all');
      setSections(data.data || []);
    } catch (error) {
      addToast(`Erreur lors du chargement des sections: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load testimonials
  const loadTestimonials = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/landing/testimonials/admin');
      setTestimonials(data.data || []);
    } catch (error) {
      addToast(`Erreur lors du chargement des témoignages: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/landing/contact-messages');
      setMessages(data.data || []);
    } catch (error) {
      addToast(`Erreur lors du chargement des messages: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load pages
  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/cms-pages');
      setPages(data.data || []);
    } catch (error) {
      addToast(`Erreur lors du chargement des pages: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load plans
  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/plans');
      setPlans(data.data || []);
    } catch (error) {
      addToast(`Erreur lors du chargement des plans: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load global config
  const loadGlobalConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/landing/global-config');
      setGlobalConfig(data.data || {});
    } catch (error) {
      addToast(`Erreur lors du chargement de la configuration: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load landing content
  const loadLandingContent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/landing/content');
      setLandingContent(data.data || {});
    } catch (error) {
      addToast(`Erreur lors du chargement du contenu: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'sections') loadSections();
    else if (activeTab === 'testimonials') loadTestimonials();
    else if (activeTab === 'messages') loadMessages();
    else if (activeTab === 'pages') loadPages();
    else if (activeTab === 'plans') loadPlans();
    else if (activeTab === 'navbar' || activeTab === 'theme' || activeTab === 'seo')
      loadGlobalConfig();
    else if (activeTab === 'config') loadLandingContent();
  }, [activeTab, loadSections, loadTestimonials, loadMessages, loadPages, loadPlans, loadGlobalConfig, loadLandingContent]);

  // ============= SECTION OPERATIONS =============
  const createSection = async (type: string) => {
    try {
      const config = getDefaultConfig(type);
      const ordre = sections.length + 1;
      const data = await fetchApi('/api/landing/sections', {
        method: 'POST',
        body: JSON.stringify({
          type,
          titre: `Nouvelle section ${type}`,
          config,
          ordre,
          actif: true,
        }),
      });
      setSections([...sections, data.data]);
      setShowSectionModal(false);
      addToast('Section créée avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la création: ${error}`, 'error');
    }
  };

  const updateSection = async (id: string, updates: Partial<Section>) => {
    try {
      const data = await fetchApi(`/api/landing/sections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setSections(sections.map((s) => (s.id === id ? data.data : s)));
      setEditingSection(null);
      addToast('Section mise à jour avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la mise à jour: ${error}`, 'error');
    }
  };

  const deleteSection = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette section ?')) return;
    try {
      await fetchApi(`/api/landing/sections/${id}`, { method: 'DELETE' });
      setSections(sections.filter((s) => s.id !== id));
      addToast('Section supprimée avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la suppression: ${error}`, 'error');
    }
  };

  const reorderSections = async (sections: Section[]) => {
    try {
      await fetchApi('/api/landing/sections/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          sections: sections.map((s, idx) => ({ id: s.id, ordre: idx + 1 })),
        }),
      });
      setSections(sections);
      addToast('Ordre mis à jour avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la réorganisation: ${error}`, 'error');
    }
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sections.length - 1) return;

    const newSections = [...sections];
    if (direction === 'up') {
      [newSections[idx], newSections[idx - 1]] = [newSections[idx - 1], newSections[idx]];
    } else {
      [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
    }
    reorderSections(newSections);
  };

  // ============= TESTIMONIAL OPERATIONS =============
  const createTestimonial = async (data: Partial<Testimonial>) => {
    try {
      const response = await fetchApi('/api/landing/testimonials', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setTestimonials([...testimonials, response.data]);
      setShowTestimonialModal(false);
      addToast('Témoignage créé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la création: ${error}`, 'error');
    }
  };

  const updateTestimonial = async (id: string, data: Partial<Testimonial>) => {
    try {
      const response = await fetchApi(`/api/landing/testimonials/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setTestimonials(testimonials.map((t) => (t.id === id ? response.data : t)));
      setEditingTestimonial(null);
      addToast('Témoignage mis à jour avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la mise à jour: ${error}`, 'error');
    }
  };

  const deleteTestimonial = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr ?')) return;
    try {
      await fetchApi(`/api/landing/testimonials/${id}`, { method: 'DELETE' });
      setTestimonials(testimonials.filter((t) => t.id !== id));
      addToast('Témoignage supprimé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la suppression: ${error}`, 'error');
    }
  };

  // ============= PAGE OPERATIONS =============
  const createPage = async (data: Partial<CMSPage>) => {
    try {
      const response = await fetchApi('/api/cms-pages', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setPages([...pages, response.data]);
      setShowPageModal(false);
      addToast('Page créée avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la création: ${error}`, 'error');
    }
  };

  const updatePage = async (id: string, data: Partial<CMSPage>) => {
    try {
      const response = await fetchApi(`/api/cms-pages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setPages(pages.map((p) => (p.id === id ? response.data : p)));
      setEditingPage(null);
      addToast('Page mise à jour avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la mise à jour: ${error}`, 'error');
    }
  };

  const deletePage = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr ?')) return;
    try {
      await fetchApi(`/api/cms-pages/${id}`, { method: 'DELETE' });
      setPages(pages.filter((p) => p.id !== id));
      addToast('Page supprimée avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la suppression: ${error}`, 'error');
    }
  };

  // ============= PLAN OPERATIONS =============
  const createPlan = async (data: Partial<Plan>) => {
    try {
      const response = await fetchApi('/api/plans', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setPlans([...plans, response.data]);
      setShowPlanModal(false);
      addToast('Plan créé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la création: ${error}`, 'error');
    }
  };

  const updatePlan = async (id: string, data: Partial<Plan>) => {
    try {
      const response = await fetchApi(`/api/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setPlans(plans.map((p) => (p.id === id ? response.data : p)));
      setEditingPlan(null);
      addToast('Plan mis à jour avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la mise à jour: ${error}`, 'error');
    }
  };

  const deletePlan = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr ?')) return;
    try {
      await fetchApi(`/api/plans/${id}`, { method: 'DELETE' });
      setPlans(plans.filter((p) => p.id !== id));
      addToast('Plan supprimé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la suppression: ${error}`, 'error');
    }
  };

  // ============= MESSAGE OPERATIONS =============
  const deleteMessage = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr ?')) return;
    try {
      await fetchApi(`/api/landing/contact-messages/${id}`, { method: 'DELETE' });
      setMessages(messages.filter((m) => m.id !== id));
      addToast('Message supprimé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la suppression: ${error}`, 'error');
    }
  };

  // ============= GLOBAL CONFIG OPERATIONS =============
  const saveNavbar = async (navbar: any) => {
    try {
      await fetchApi('/api/landing/global-config/navbar', {
        method: 'PUT',
        body: JSON.stringify(navbar),
      });
      setGlobalConfig({ ...globalConfig, navbar });
      addToast('Navbar sauvegardée avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la sauvegarde: ${error}`, 'error');
    }
  };

  const saveFooter = async (footer: any) => {
    try {
      await fetchApi('/api/landing/global-config/footer', {
        method: 'PUT',
        body: JSON.stringify(footer),
      });
      setGlobalConfig({ ...globalConfig, footer });
      addToast('Footer sauvegardé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la sauvegarde: ${error}`, 'error');
    }
  };

  const saveTheme = async (theme: any) => {
    try {
      await fetchApi('/api/landing/global-config/theme', {
        method: 'PUT',
        body: JSON.stringify(theme),
      });
      setGlobalConfig({ ...globalConfig, theme });
      addToast('Thème sauvegardé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la sauvegarde: ${error}`, 'error');
    }
  };

  const saveSeo = async (seo: any) => {
    try {
      await fetchApi('/api/landing/global-config/seo', {
        method: 'PUT',
        body: JSON.stringify(seo),
      });
      setGlobalConfig({ ...globalConfig, seo });
      addToast('SEO sauvegardé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la sauvegarde: ${error}`, 'error');
    }
  };

  const saveLandingContent = async (section: string, contenu: any) => {
    try {
      await fetchApi('/api/landing/content', {
        method: 'PUT',
        body: JSON.stringify({ section, contenu }),
      });
      setLandingContent({ ...landingContent, [section]: contenu });
      addToast('Contenu sauvegardé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la sauvegarde: ${error}`, 'error');
    }
  };

  const getDefaultConfig = (type: string): Record<string, any> => {
    const configs: Record<string, Record<string, any>> = {
      hero: {
        title: 'Titre Hero',
        subtitle: 'Sous-titre',
        badge: { text: 'Badge', actif: false },
        ctaPrimary: { text: 'Bouton Primaire', link: '/' },
        ctaSecondary: { text: 'Bouton Secondaire', link: '/' },
      },
      stats: { items: [] },
      trust_badges: { items: [] },
      modules: { items: [] },
      agent_ia: {
        title: 'Titre',
        titleHighlight: 'Highlight',
        subtitle: 'Sous-titre',
        features: [],
        chatMessages: [],
      },
      upcoming: { title: 'À venir', subtitle: '', badge: '', items: [] },
      how_it_works: { title: 'Comment ça marche', subtitle: '', steps: [] },
      testimonials: { title: 'Témoignages', subtitle: '' },
      contact: { title: 'Contact', subtitle: '', rappelIA: false },
      cta: {
        title: 'CTA',
        subtitle: '',
        ctaPrimary: { text: '', link: '' },
        ctaSecondary: { text: '', link: '' },
        bgGradient: 'from-blue-500 to-purple-500',
      },
      custom_html: { html: '<div></div>', bgColor: 'bg-white' },
    };
    return configs[type] || {};
  };

  // ============= RENDER TABS =============
  const renderTabs = () => {
    const tabs = [
      { id: 'sections', label: 'Sections', icon: Layout },
      { id: 'navbar', label: 'Navbar & Footer', icon: Settings },
      { id: 'theme', label: 'Thème', icon: Settings },
      { id: 'seo', label: 'SEO', icon: Settings },
      { id: 'testimonials', label: 'Témoignages', icon: MessageSquare },
      { id: 'messages', label: 'Messages', icon: MessageSquare },
      { id: 'legal', label: 'Pages Légales', icon: Lock },
      { id: 'pages', label: 'Pages', icon: FileText },
      { id: 'plans', label: 'Tarifs', icon: DollarSign },
      { id: 'config', label: 'Configuration', icon: Settings },
    ];

    return (
      <div className="flex overflow-x-auto border-b border-slate-700 mb-6 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  };

  // ============= TAB CONTENT =============
  const renderSectionsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Sections</h2>
        <div className="flex gap-2">
          <button
            onClick={() => window.open('/', '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            <Eye size={18} /> Prévisualiser
          </button>
          <button
            onClick={() => setShowSectionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Plus size={18} /> Ajouter une section
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <div
              key={section.id}
              className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveSection(section.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => moveSection(section.id, 'down')}
                        disabled={idx === sections.length - 1}
                        className="p-1 hover:bg-slate-700 disabled:opacity-30 rounded"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded">
                          {section.type}
                        </span>
                        <h3 className="font-semibold text-white">{section.titre}</h3>
                      </div>
                      <p className="text-sm text-slate-400">Ordre: {section.ordre}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingSection(section);
                      setShowSectionModal(true);
                    }}
                    className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => updateSection(section.id, { actif: !section.actif })}
                    className={`px-3 py-2 rounded transition text-sm font-medium ${
                      section.actif
                        ? 'bg-green-900 text-green-200'
                        : 'bg-red-900 text-red-200'
                    }`}
                  >
                    {section.actif ? 'Actif' : 'Inactif'}
                  </button>
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-2 bg-red-900 hover:bg-red-800 text-red-200 rounded transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSectionModal && (
        <SectionModal
          section={editingSection}
          sectionType={sectionType}
          setSectionType={setSectionType}
          onClose={() => {
            setShowSectionModal(false);
            setEditingSection(null);
          }}
          onCreate={createSection}
          onUpdate={updateSection}
        />
      )}
    </div>
  );

  const renderNavbarTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Navbar & Footer</h2>
      <NavbarFooterEditor
        config={globalConfig}
        onSaveNavbar={saveNavbar}
        onSaveFooter={saveFooter}
      />
    </div>
  );

  const renderThemeTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Thème</h2>
      <ThemeEditor
        theme={globalConfig.theme || {}}
        onSave={saveTheme}
      />
    </div>
  );

  const renderSeoTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">SEO</h2>
      <SeoEditor
        seo={globalConfig.seo || {}}
        onSave={saveSeo}
      />
    </div>
  );

  const renderTestimonialsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Témoignages</h2>
        <button
          onClick={() => {
            setEditingTestimonial(null);
            setShowTestimonialModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <Plus size={18} /> Ajouter un témoignage
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-300">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Prénom</th>
                <th className="px-4 py-3 text-left">Entreprise</th>
                <th className="px-4 py-3 text-left">Poste</th>
                <th className="px-4 py-3 text-left">Note</th>
                <th className="px-4 py-3 text-left">Affiche</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {testimonials.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800 transition">
                  <td className="px-4 py-3">{t.nom}</td>
                  <td className="px-4 py-3">{t.prenom}</td>
                  <td className="px-4 py-3">{t.entreprise}</td>
                  <td className="px-4 py-3">{t.poste}</td>
                  <td className="px-4 py-3">{t.note}/5</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateTestimonial(t.id, { affiche: !t.affiche })}
                      className={`px-2 py-1 rounded text-xs ${
                        t.affiche ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {t.affiche ? 'Oui' : 'Non'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTestimonial(t);
                          setShowTestimonialModal(true);
                        }}
                        className="p-1 hover:bg-slate-700 rounded"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteTestimonial(t.id)}
                        className="p-1 hover:bg-red-900 rounded text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showTestimonialModal && (
        <TestimonialModal
          testimonial={editingTestimonial}
          onClose={() => {
            setShowTestimonialModal(false);
            setEditingTestimonial(null);
          }}
          onCreate={createTestimonial}
          onUpdate={updateTestimonial}
        />
      )}
    </div>
  );

  const renderMessagesTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Messages de Contact</h2>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-300">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Sujet</th>
                <th className="px-4 py-3 text-left">Message</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {messages.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800 transition">
                  <td className="px-4 py-3">{m.nom}</td>
                  <td className="px-4 py-3">{m.email}</td>
                  <td className="px-4 py-3">{m.sujet}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{m.message}</td>
                  <td className="px-4 py-3">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteMessage(m.id)}
                      className="p-1 hover:bg-red-900 rounded text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderLegalTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Pages Légales</h2>
      <LegalPagesEditor
        content={landingContent}
        onSave={saveLandingContent}
      />
    </div>
  );

  const renderPagesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Pages CMS</h2>
        <button
          onClick={() => {
            setEditingPage(null);
            setShowPageModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <Plus size={18} /> Ajouter une page
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-300">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">Titre</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Publiée</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800 transition">
                  <td className="px-4 py-3">{p.titre}</td>
                  <td className="px-4 py-3 text-slate-400">{p.slug}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updatePage(p.id, { publie: !p.publie })}
                      className={`px-2 py-1 rounded text-xs ${
                        p.publie ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                      }`}
                    >
                      {p.publie ? 'Oui' : 'Non'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPage(p);
                          setShowPageModal(true);
                        }}
                        className="p-1 hover:bg-slate-700 rounded"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deletePage(p.id)}
                        className="p-1 hover:bg-red-900 rounded text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPageModal && (
        <PageModal
          page={editingPage}
          onClose={() => {
            setShowPageModal(false);
            setEditingPage(null);
          }}
          onCreate={createPage}
          onUpdate={updatePage}
        />
      )}
    </div>
  );

  const renderPlansTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Tarifs</h2>
        <button
          onClick={() => {
            setEditingPlan(null);
            setShowPlanModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <Plus size={18} /> Ajouter un plan
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-slate-600 transition"
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white mb-2">{plan.nom}</h3>
                <p className="text-slate-400 text-sm mb-3">{plan.description}</p>
                <p className="text-2xl font-bold text-blue-400 mb-3">{plan.prix}€</p>
                {plan.populaire && (
                  <span className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded">
                    Populaire
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingPlan(plan);
                    setShowPlanModal(true);
                  }}
                  className="flex-1 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition text-sm"
                >
                  <Edit2 size={16} className="inline mr-1" /> Éditer
                </button>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="flex-1 p-2 bg-red-900 hover:bg-red-800 text-red-200 rounded transition text-sm"
                >
                  <Trash2 size={16} className="inline mr-1" /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPlanModal && (
        <PlanModal
          plan={editingPlan}
          onClose={() => {
            setShowPlanModal(false);
            setEditingPlan(null);
          }}
          onCreate={createPlan}
          onUpdate={updatePlan}
        />
      )}
    </div>
  );

  const renderConfigTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Configuration</h2>
      <ConfigurationEditor
        content={landingContent}
        onSave={saveLandingContent}
      />
    </div>
  );

  return (
    <div className="text-white">
      <h1 className="text-3xl font-bold mb-6">Gestionnaire CMS</h1>

      {renderTabs()}

      {activeTab === 'sections' && renderSectionsTab()}
      {activeTab === 'navbar' && renderNavbarTab()}
      {activeTab === 'theme' && renderThemeTab()}
      {activeTab === 'seo' && renderSeoTab()}
      {activeTab === 'testimonials' && renderTestimonialsTab()}
      {activeTab === 'messages' && renderMessagesTab()}
      {activeTab === 'legal' && renderLegalTab()}
      {activeTab === 'pages' && renderPagesTab()}
      {activeTab === 'plans' && renderPlansTab()}
      {activeTab === 'config' && renderConfigTab()}

      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-green-900 text-green-200'
              : 'bg-red-900 text-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {toast.message}
        </div>
      ))}
    </div>
  );
}

// ============= MODALS & EDITORS =============

interface SectionModalProps {
  section: Section | null;
  sectionType: string;
  setSectionType: (type: string) => void;
  onClose: () => void;
  onCreate: (type: string) => void;
  onUpdate: (id: string, updates: Partial<Section>) => void;
}

function SectionModal({
  section,
  sectionType,
  setSectionType,
  onClose,
  onCreate,
  onUpdate,
}: SectionModalProps) {
  const [formData, setFormData] = useState<Partial<Section>>(
    section || { titre: '', config: {} }
  );

  const sectionTypes = [
    'hero',
    'stats',
    'trust_badges',
    'modules',
    'agent_ia',
    'how_it_works',
    'testimonials',
    'upcoming',
    'cta',
    'contact',
    'custom_html',
  ];

  const handleSave = () => {
    if (section) {
      onUpdate(section.id, formData);
    } else {
      onCreate(sectionType);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {section ? 'Éditer la section' : 'Ajouter une section'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {!section && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Type de section
              </label>
              <select
                value={sectionType}
                onChange={(e) => setSectionType(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              >
                {sectionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Titre
            </label>
            <input
              type="text"
              value={formData.titre || ''}
              onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
            >
              <Save size={18} /> Enregistrer
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded px-4 py-2 transition"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TestimonialModalProps {
  testimonial: Testimonial | null;
  onClose: () => void;
  onCreate: (data: Partial<Testimonial>) => void;
  onUpdate: (id: string, data: Partial<Testimonial>) => void;
}

function TestimonialModal({
  testimonial,
  onClose,
  onCreate,
  onUpdate,
}: TestimonialModalProps) {
  const [formData, setFormData] = useState<Partial<Testimonial>>(
    testimonial || {
      nom: '',
      prenom: '',
      entreprise: '',
      poste: '',
      note: 5,
      commentaire: '',
      affiche: true,
      ordre: 0,
    }
  );

  const handleSave = () => {
    if (testimonial) {
      onUpdate(testimonial.id, formData);
    } else {
      onCreate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {testimonial ? 'Éditer le témoignage' : 'Ajouter un témoignage'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom
            </label>
            <input
              type="text"
              value={formData.nom || ''}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Prénom
            </label>
            <input
              type="text"
              value={formData.prenom || ''}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Entreprise
            </label>
            <input
              type="text"
              value={formData.entreprise || ''}
              onChange={(e) => setFormData({ ...formData, entreprise: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Poste
            </label>
            <input
              type="text"
              value={formData.poste || ''}
              onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Note (1-5)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.note || 5}
              onChange={(e) => setFormData({ ...formData, note: parseInt(e.target.value) })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Commentaire
          </label>
          <textarea
            value={formData.commentaire || ''}
            onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
            rows={4}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            <Save size={18} /> Enregistrer
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded px-4 py-2 transition"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

interface PageModalProps {
  page: CMSPage | null;
  onClose: () => void;
  onCreate: (data: Partial<CMSPage>) => void;
  onUpdate: (id: string, data: Partial<CMSPage>) => void;
}

function PageModal({ page, onClose, onCreate, onUpdate }: PageModalProps) {
  const [formData, setFormData] = useState<Partial<CMSPage>>(
    page || { titre: '', slug: '', contenu: '', publie: false }
  );

  const handleSave = () => {
    if (page) {
      onUpdate(page.id, formData);
    } else {
      onCreate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg p-6 max-w-3xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {page ? 'Éditer la page' : 'Ajouter une page'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Titre
              </label>
              <input
                type="text"
                value={formData.titre || ''}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contenu (Markdown)
            </label>
            <textarea
              value={formData.contenu || ''}
              onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
              rows={6}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            <Save size={18} /> Enregistrer
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded px-4 py-2 transition"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

interface PlanModalProps {
  plan: Plan | null;
  onClose: () => void;
  onCreate: (data: Partial<Plan>) => void;
  onUpdate: (id: string, data: Partial<Plan>) => void;
}

function PlanModal({ plan, onClose, onCreate, onUpdate }: PlanModalProps) {
  const [formData, setFormData] = useState<Partial<Plan>>(
    plan || { nom: '', description: '', prix: 0, features: [], populaire: false, ordre: 0 }
  );

  const handleSave = () => {
    if (plan) {
      onUpdate(plan.id, formData);
    } else {
      onCreate(formData);
    }
  };

  const addFeature = () => {
    const features = formData.features || [];
    setFormData({ ...formData, features: [...features, ''] });
  };

  const removeFeature = (idx: number) => {
    const features = formData.features || [];
    setFormData({ ...formData, features: features.filter((_, i) => i !== idx) });
  };

  const updateFeature = (idx: number, value: string) => {
    const features = formData.features || [];
    features[idx] = value;
    setFormData({ ...formData, features });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {plan ? 'Éditer le plan' : 'Ajouter un plan'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom
            </label>
            <input
              type="text"
              value={formData.nom || ''}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Prix (€)
            </label>
            <input
              type="number"
              value={formData.prix || 0}
              onChange={(e) => setFormData({ ...formData, prix: parseFloat(e.target.value) })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Fonctionnalités
            </label>
            <div className="space-y-2">
              {(formData.features || []).map((feature, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(idx, e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  />
                  <button
                    onClick={() => removeFeature(idx)}
                    className="px-3 py-2 bg-red-900 hover:bg-red-800 text-red-200 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={addFeature}
                className="w-full px-3 py-2 border border-slate-600 border-dashed rounded text-slate-300 hover:text-slate-200 hover:border-slate-500 transition"
              >
                <Plus size={16} className="inline mr-1" /> Ajouter une fonctionnalité
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.populaire || false}
              onChange={(e) => setFormData({ ...formData, populaire: e.target.checked })}
              className="rounded"
            />
            <span className="text-slate-300">Populaire</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            <Save size={18} /> Enregistrer
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded px-4 py-2 transition"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

interface NavbarFooterEditorProps {
  config: GlobalConfig;
  onSaveNavbar: (navbar: any) => void;
  onSaveFooter: (footer: any) => void;
}

function NavbarFooterEditor({
  config,
  onSaveNavbar,
  onSaveFooter,
}: NavbarFooterEditorProps) {
  const [navbar, setNavbar] = useState(config.navbar || { logo: '', logoText: '', links: [], ctaButton: {} });
  const [footer, setFooter] = useState(config.footer || { companyName: '', description: '', columns: [] });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Navbar</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Logo Text
            </label>
            <input
              type="text"
              value={navbar.logoText || ''}
              onChange={(e) => setNavbar({ ...navbar, logoText: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Logo URL
            </label>
            <input
              type="text"
              value={navbar.logo || ''}
              onChange={(e) => setNavbar({ ...navbar, logo: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              CTA Button Text
            </label>
            <input
              type="text"
              value={navbar.ctaButton?.text || ''}
              onChange={(e) =>
                setNavbar({
                  ...navbar,
                  ctaButton: { ...navbar.ctaButton, text: e.target.value },
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              CTA Button Link
            </label>
            <input
              type="text"
              value={navbar.ctaButton?.href || ''}
              onChange={(e) =>
                setNavbar({
                  ...navbar,
                  ctaButton: { ...navbar.ctaButton, href: e.target.value },
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <button
            onClick={() => onSaveNavbar(navbar)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            <Save size={18} /> Enregistrer Navbar
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Footer</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom Entreprise
            </label>
            <input
              type="text"
              value={footer.companyName || ''}
              onChange={(e) => setFooter({ ...footer, companyName: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={footer.description || ''}
              onChange={(e) => setFooter({ ...footer, description: e.target.value })}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <button
            onClick={() => onSaveFooter(footer)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            <Save size={18} /> Enregistrer Footer
          </button>
        </div>
      </div>
    </div>
  );
}

interface ThemeEditorProps {
  theme: any;
  onSave: (theme: any) => void;
}

function ThemeEditor({ theme, onSave }: ThemeEditorProps) {
  const [formData, setFormData] = useState(theme);

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Couleur Primaire
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={formData.primaryColor || '#3b82f6'}
              onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              className="w-12 h-10 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.primaryColor || '#3b82f6'}
              onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Couleur Accent
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={formData.accentColor || '#8b5cf6'}
              onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
              className="w-12 h-10 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.accentColor || '#8b5cf6'}
              onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Couleur de Fond
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={formData.bgColor || '#ffffff'}
              onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
              className="w-12 h-10 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.bgColor || '#ffffff'}
              onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Couleur Texte
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={formData.textColor || '#000000'}
              onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
              className="w-12 h-10 rounded cursor-pointer"
            />
            <input
              type="text"
              value={formData.textColor || '#000000'}
              onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Police de Caractères
          </label>
          <select
            value={formData.fontFamily || 'Inter'}
            onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
          >
            <option>Inter</option>
            <option>Poppins</option>
            <option>Roboto</option>
            <option>Montserrat</option>
          </select>
        </div>
      </div>

      <button
        onClick={() => onSave(formData)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
      >
        <Save size={18} /> Enregistrer Thème
      </button>
    </div>
  );
}

interface SeoEditorProps {
  seo: any;
  onSave: (seo: any) => void;
}

function SeoEditor({ seo, onSave }: SeoEditorProps) {
  const [formData, setFormData] = useState(seo);

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Meta Title
        </label>
        <input
          type="text"
          value={formData.metaTitle || ''}
          onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Meta Description
        </label>
        <textarea
          value={formData.metaDescription || ''}
          onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
          rows={3}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          OG Image URL
        </label>
        <input
          type="text"
          value={formData.ogImage || ''}
          onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Favicon URL
        </label>
        <input
          type="text"
          value={formData.favicon || ''}
          onChange={(e) => setFormData({ ...formData, favicon: e.target.value })}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
        />
      </div>

      <button
        onClick={() => onSave(formData)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
      >
        <Save size={18} /> Enregistrer SEO
      </button>
    </div>
  );
}

interface LegalPagesEditorProps {
  content: LandingContent;
  onSave: (section: string, contenu: any) => void;
}

function LegalPagesEditor({ content, onSave }: LegalPagesEditorProps) {
  const [mentionsLegales, setMentionsLegales] = useState(
    (content.mentions_legales as string) || ''
  );
  const [cgu, setCgu] = useState((content.cgu as string) || '');
  const [cgv, setCgv] = useState((content.cgv as string) || '');
  const [confidentialite, setConfidentialite] = useState(
    (content.confidentialite as string) || ''
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Mentions Légales</h3>
        <textarea
          value={mentionsLegales}
          onChange={(e) => setMentionsLegales(e.target.value)}
          rows={6}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm mb-4"
        />
        <button
          onClick={() => onSave('mentions_legales', mentionsLegales)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
        >
          <Save size={18} /> Enregistrer
        </button>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">CGU</h3>
        <textarea
          value={cgu}
          onChange={(e) => setCgu(e.target.value)}
          rows={6}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm mb-4"
        />
        <button
          onClick={() => onSave('cgu', cgu)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
        >
          <Save size={18} /> Enregistrer
        </button>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">CGV</h3>
        <textarea
          value={cgv}
          onChange={(e) => setCgv(e.target.value)}
          rows={6}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm mb-4"
        />
        <button
          onClick={() => onSave('cgv', cgv)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
        >
          <Save size={18} /> Enregistrer
        </button>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Politique de Confidentialité</h3>
        <textarea
          value={confidentialite}
          onChange={(e) => setConfidentialite(e.target.value)}
          rows={6}
          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white font-mono text-sm mb-4"
        />
        <button
          onClick={() => onSave('confidentialite', confidentialite)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
        >
          <Save size={18} /> Enregistrer
        </button>
      </div>
    </div>
  );
}

interface ConfigurationEditorProps {
  content: LandingContent;
  onSave: (section: string, contenu: any) => void;
}

function ConfigurationEditor({ content, onSave }: ConfigurationEditorProps) {
  const [contact, setContact] = useState({
    email: (content.contact as any)?.email || '',
    phone: (content.contact as any)?.phone || '',
    address: (content.contact as any)?.address || '',
  });

  const [legal, setLegal] = useState({
    companyName: (content.legal as any)?.companyName || '',
    legalForm: (content.legal as any)?.legalForm || '',
    capital: (content.legal as any)?.capital || '',
    siret: (content.legal as any)?.siret || '',
    tva: (content.legal as any)?.tva || '',
    address: (content.legal as any)?.address || '',
  });

  const [company, setCompany] = useState({
    description: (content.company as any)?.description || '',
    supportEmail: (content.company as any)?.supportEmail || '',
    rgpdEmail: (content.company as any)?.rgpdEmail || '',
  });

  const [hosting, setHosting] = useState({
    provider: (content.hosting as any)?.provider || '',
    companyName: (content.hosting as any)?.companyName || '',
    address: (content.hosting as any)?.address || '',
    phone: (content.hosting as any)?.phone || '',
    website: (content.hosting as any)?.website || '',
  });

  const [insurance, setInsurance] = useState({
    company: (content.insurance as any)?.company || '',
    policyNumber: (content.insurance as any)?.policyNumber || '',
    coverage: (content.insurance as any)?.coverage || '',
    address: (content.insurance as any)?.address || '',
    phone: (content.insurance as any)?.phone || '',
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Contact</h3>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Téléphone</label>
            <input
              type="tel"
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Adresse</label>
            <textarea
              value={contact.address}
              onChange={(e) => setContact({ ...contact, address: e.target.value })}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <button
            onClick={() => onSave('contact', contact)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition"
          >
            <Save size={16} className="inline mr-2" /> Enregistrer
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Informations Légales</h3>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom Entreprise
            </label>
            <input
              type="text"
              value={legal.companyName}
              onChange={(e) => setLegal({ ...legal, companyName: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Forme Juridique
            </label>
            <input
              type="text"
              value={legal.legalForm}
              onChange={(e) => setLegal({ ...legal, legalForm: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Capital</label>
            <input
              type="text"
              value={legal.capital}
              onChange={(e) => setLegal({ ...legal, capital: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">SIRET</label>
            <input
              type="text"
              value={legal.siret}
              onChange={(e) => setLegal({ ...legal, siret: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">TVA</label>
            <input
              type="text"
              value={legal.tva}
              onChange={(e) => setLegal({ ...legal, tva: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Adresse</label>
            <textarea
              value={legal.address}
              onChange={(e) => setLegal({ ...legal, address: e.target.value })}
              rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <button
            onClick={() => onSave('legal', legal)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition"
          >
            <Save size={16} className="inline mr-2" /> Enregistrer
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Entreprise</h3>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={company.description}
              onChange={(e) => setCompany({ ...company, description: e.target.value })}
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Support
            </label>
            <input
              type="email"
              value={company.supportEmail}
              onChange={(e) => setCompany({ ...company, supportEmail: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email RGPD
            </label>
            <input
              type="email"
              value={company.rgpdEmail}
              onChange={(e) => setCompany({ ...company, rgpdEmail: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <button
            onClick={() => onSave('company', company)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition"
          >
            <Save size={16} className="inline mr-2" /> Enregistrer
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Hébergement</h3>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Prestataire</label>
            <input
              type="text"
              value={hosting.provider}
              onChange={(e) => setHosting({ ...hosting, provider: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nom Entreprise
            </label>
            <input
              type="text"
              value={hosting.companyName}
              onChange={(e) => setHosting({ ...hosting, companyName: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Adresse</label>
            <textarea
              value={hosting.address}
              onChange={(e) => setHosting({ ...hosting, address: e.target.value })}
              rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Téléphone</label>
            <input
              type="tel"
              value={hosting.phone}
              onChange={(e) => setHosting({ ...hosting, phone: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Site Web</label>
            <input
              type="url"
              value={hosting.website}
              onChange={(e) => setHosting({ ...hosting, website: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <button
            onClick={() => onSave('hosting', hosting)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition"
          >
            <Save size={16} className="inline mr-2" /> Enregistrer
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Assurance</h3>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Entreprise</label>
            <input
              type="text"
              value={insurance.company}
              onChange={(e) => setInsurance({ ...insurance, company: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Numéro Police
            </label>
            <input
              type="text"
              value={insurance.policyNumber}
              onChange={(e) => setInsurance({ ...insurance, policyNumber: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Couverture</label>
            <textarea
              value={insurance.coverage}
              onChange={(e) => setInsurance({ ...insurance, coverage: e.target.value })}
              rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Adresse</label>
            <textarea
              value={insurance.address}
              onChange={(e) => setInsurance({ ...insurance, address: e.target.value })}
              rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Téléphone</label>
            <input
              type="tel"
              value={insurance.phone}
              onChange={(e) => setInsurance({ ...insurance, phone: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
          </div>
          <button
            onClick={() => onSave('insurance', insurance)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition"
          >
            <Save size={16} className="inline mr-2" /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
