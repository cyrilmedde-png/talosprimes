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
  Sparkles,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Link2,
  Quote,
  Code,
  FileCode,
  Minus,
  EyeIcon,
  Pencil,
  Image,
  Table,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Superscript,
  Subscript,
  Undo2,
  Redo2,
  BarChart3,
  BadgeCheck,
  Layers,
  Bot,
  Clock,
  HelpCircle,
  Mail,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '@/store/auth-store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Labels & icônes pour les types de sections ───
const sectionTypeMap: Record<string, { label: string; icon: LucideIcon }> = {
  hero: { label: 'Hero Principal', icon: Sparkles },
  stats: { label: 'Statistiques', icon: BarChart3 },
  trust_badges: { label: 'Badges de confiance', icon: BadgeCheck },
  modules: { label: 'Modules / Services', icon: Layers },
  agent_ia: { label: 'Agent IA', icon: Bot },
  upcoming: { label: 'À venir', icon: Clock },
  how_it_works: { label: 'Comment ça marche', icon: HelpCircle },
  testimonials: { label: 'Témoignages', icon: MessageSquare },
  contact: { label: 'Contact', icon: Mail },
  cta: { label: 'Call to Action', icon: Megaphone },
  custom_html: { label: 'HTML Custom', icon: Code },
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface Section {
  id: string;
  type: string;
  titre: string;
  config: Record<string, unknown>;
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

interface CMSPageData {
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
    links?: Array<{ text: string; href: string; type?: string }>;
    ctaButton?: { text: string; href: string };
    showLoginLink?: boolean;
    loginHref?: string;
  };
  footer?: {
    companyName?: string;
    description?: string;
    columns?: Array<{ title: string; links: Array<{ text: string; href: string }> }>;
    legalLinks?: Array<{ text: string; href: string }>;
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

// Sub-types extracted from GlobalConfig for reuse
type NavbarConfig = NonNullable<GlobalConfig['navbar']>;
type FooterConfig = NonNullable<GlobalConfig['footer']>;
type ThemeConfig = NonNullable<GlobalConfig['theme']>;
type SeoConfig = NonNullable<GlobalConfig['seo']>;

// Generic JSON value type for section configs and landing content
type JsonRecord = Record<string, unknown>;
type ContentValue = string | JsonRecord;

interface LandingContent {
  [key: string]: ContentValue;
}

/** Safely extract a string from unknown JSON values */
const str = (val: unknown): string => (typeof val === 'string' ? val : '');

const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || localStorage.getItem('token');
};

const fetchApi = async <T = { data: unknown }>(
  url: string,
  options?: RequestInit
): Promise<T> => {
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
  const [pages, setPages] = useState<CMSPageData[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({});
  const [landingContent, setLandingContent] = useState<LandingContent>({});

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionType, setSectionType] = useState('hero');

  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);

  const [showPageModal, setShowPageModal] = useState(false);
  const [editingPage, setEditingPage] = useState<CMSPageData | null>(null);

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
      const data = await fetchApi<{ data: Section[] }>('/api/landing/sections/all');
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
      const data = await fetchApi<{ data: Testimonial[] }>('/api/landing/testimonials/all');
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
      const data = await fetchApi<{ data: ContactMessage[] }>('/api/landing/contact');
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
      const data = await fetchApi<{ data: CMSPageData[] }>('/api/landing/pages/all');
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
      const data = await fetchApi<{ data: Plan[] }>('/api/plans/all');
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
      const data = await fetchApi<{ data: GlobalConfig }>('/api/landing/global-config');
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
      const data = await fetchApi<{ data: LandingContent }>('/api/landing/content');
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
  const createSection = async (type: string, overrides?: { titre?: string; config?: Record<string, unknown> }) => {
    try {
      const defaultConfig = getDefaultConfig(type);
      const config = overrides?.config ? { ...defaultConfig, ...overrides.config } : defaultConfig;
      const ordre = sections.length + 1;
      const titre = overrides?.titre || `Nouvelle section ${sectionTypeMap[type]?.label || type}`;
      const data = await fetchApi<{ data: Section }>('/api/landing/sections', {
        method: 'POST',
        body: JSON.stringify({
          type,
          titre,
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
      const data = await fetchApi<{ data: Section }>(`/api/landing/sections/${id}`, {
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
          items: sections.map((s, idx) => ({ id: s.id, ordre: idx + 1 })),
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
      const response = await fetchApi<{ data: Testimonial }>('/api/landing/testimonials', {
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
      const response = await fetchApi<{ data: Testimonial }>(`/api/landing/testimonials/${id}`, {
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
  const createPage = async (data: Partial<CMSPageData>) => {
    try {
      const response = await fetchApi<{ data: CMSPageData }>('/api/landing/pages', {
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

  const updatePage = async (id: string, data: Partial<CMSPageData>) => {
    try {
      const response = await fetchApi<{ data: CMSPageData }>(`/api/landing/pages/${id}`, {
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
      await fetchApi(`/api/landing/pages/${id}`, { method: 'DELETE' });
      setPages(pages.filter((p) => p.id !== id));
      addToast('Page supprimée avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la suppression: ${error}`, 'error');
    }
  };

  // ============= PLAN OPERATIONS =============
  const createPlan = async (data: Partial<Plan>) => {
    try {
      const response = await fetchApi<{ data: Plan }>('/api/plans', {
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
      const response = await fetchApi<{ data: Plan }>(`/api/plans/${id}`, {
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
      await fetchApi(`/api/landing/contact/${id}`, { method: 'DELETE' });
      setMessages(messages.filter((m) => m.id !== id));
      addToast('Message supprimé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la suppression: ${error}`, 'error');
    }
  };

  // ============= GLOBAL CONFIG OPERATIONS =============
  const saveNavbar = async (navbar: NavbarConfig) => {
    try {
      await fetchApi('/api/landing/global-config/navbar', {
        method: 'PUT',
        body: JSON.stringify({ config: navbar }),
      });
      setGlobalConfig({ ...globalConfig, navbar });
      addToast('Navbar sauvegardée avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la sauvegarde: ${error}`, 'error');
    }
  };

  const saveFooter = async (footer: FooterConfig) => {
    try {
      await fetchApi('/api/landing/global-config/footer', {
        method: 'PUT',
        body: JSON.stringify({ config: footer }),
      });
      setGlobalConfig({ ...globalConfig, footer });
      addToast('Footer sauvegardé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la sauvegarde: ${error}`, 'error');
    }
  };

  const saveTheme = async (theme: ThemeConfig) => {
    try {
      await fetchApi('/api/landing/global-config/theme', {
        method: 'PUT',
        body: JSON.stringify({ config: theme }),
      });
      setGlobalConfig({ ...globalConfig, theme });
      addToast('Thème sauvegardé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la sauvegarde: ${error}`, 'error');
    }
  };

  const saveSeo = async (seo: SeoConfig) => {
    try {
      await fetchApi('/api/landing/global-config/seo', {
        method: 'PUT',
        body: JSON.stringify({ config: seo }),
      });
      setGlobalConfig({ ...globalConfig, seo });
      addToast('SEO sauvegardé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la sauvegarde: ${error}`, 'error');
    }
  };

  const saveLandingContent = async (section: string, contenu: ContentValue) => {
    try {
      await fetchApi(`/api/landing/content/${section}`, {
        method: 'PUT',
        body: JSON.stringify({ contenu }),
      });
      setLandingContent({ ...landingContent, [section]: contenu });
      addToast('Contenu sauvegardé avec succès', 'success');
    } catch (error) {
      addToast(`Erreur lors de la sauvegarde: ${error}`, 'error');
    }
  };

  const getDefaultConfig = (type: string): JsonRecord => {
    const configs: Record<string, JsonRecord> = {
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
                        {(() => {
                          const meta = sectionTypeMap[section.type];
                          const Icon = meta?.icon || Layout;
                          return (
                            <span className="bg-blue-900 text-blue-200 text-xs px-2.5 py-1 rounded flex items-center gap-1.5">
                              <Icon size={13} />
                              {meta?.label || section.type}
                            </span>
                          );
                        })()}
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
        fetchApi={fetchApi}
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
  onCreate: (type: string, overrides?: { titre?: string; config?: Record<string, unknown> }) => void;
  onUpdate: (id: string, updates: Partial<Section>) => void;
}

// ─── Helpers for typed array manipulation ───
function arrPush<T>(arr: T[], item: T): T[] { return [...arr, item]; }
function arrRemove<T>(arr: T[], idx: number): T[] { return arr.filter((_, i) => i !== idx); }
function arrUpdate<T>(arr: T[], idx: number, patch: Partial<T>): T[] {
  return arr.map((item, i) => i === idx ? { ...item, ...patch } : item);
}

// ─── Reusable field input components for section config editor ───
function FieldInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-white text-sm" placeholder={placeholder} />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-white text-sm" />
    </div>
  );
}

function FieldToggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}

// ─── Icon names available in iconMap.ts ───
const ICON_NAMES = [
  'FileText', 'Calculator', 'Users', 'Bot', 'UserCheck', 'HardHat', 'Briefcase',
  'ClipboardList', 'Zap', 'Shield', 'Lock', 'Landmark', 'CreditCard', 'Layers',
  'Sparkles', 'TrendingUp', 'Receipt', 'PenTool', 'Smartphone', 'Globe',
  'BarChart3', 'Banknote', 'Brain', 'MessageSquare', 'PhoneCall', 'Mail',
  'BookOpen', 'Calendar', 'Bell', 'BadgeCheck', 'Headphones', 'Star',
  'CheckCircle', 'ArrowRight', 'ChevronDown', 'MapPin', 'Phone',
];

// ─── Tailwind gradient color presets for module cards ───
const COLOR_PRESETS = [
  { value: 'from-blue-500 to-blue-600', label: 'Bleu' },
  { value: 'from-emerald-500 to-emerald-600', label: 'Émeraude' },
  { value: 'from-violet-500 to-violet-600', label: 'Violet' },
  { value: 'from-amber-500 to-amber-600', label: 'Ambre' },
  { value: 'from-rose-500 to-rose-600', label: 'Rose' },
  { value: 'from-cyan-500 to-cyan-600', label: 'Cyan' },
  { value: 'from-indigo-500 to-indigo-600', label: 'Indigo' },
  { value: 'from-orange-500 to-orange-600', label: 'Orange' },
  { value: 'from-teal-500 to-teal-600', label: 'Teal' },
  { value: 'from-pink-500 to-pink-600', label: 'Pink' },
  { value: 'from-slate-700 to-slate-800', label: 'Sombre' },
  { value: 'from-red-500 to-red-600', label: 'Rouge' },
];

function FieldIconPicker({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = ICON_NAMES.filter(n => n.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm text-left flex items-center justify-between hover:border-slate-500 transition"
      >
        <span className={value ? 'text-white' : 'text-slate-500'}>{value || 'Choisir une icône…'}</span>
        <svg className={`w-4 h-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-52 overflow-hidden">
          <div className="p-2 border-b border-slate-600">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-40 overflow-y-auto p-1">
            {filtered.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => { onChange(name); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition ${
                  name === value ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'
                }`}
              >
                {name}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-slate-500 p-2 text-center">Aucun résultat</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldColorPicker({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <select
        value={COLOR_PRESETS.find(p => p.value === value) ? value : '__custom__'}
        onChange={(e) => { if (e.target.value !== '__custom__') onChange(e.target.value); }}
        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm mb-1"
      >
        {COLOR_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        {!COLOR_PRESETS.find(c => c.value === value) && value && <option value="__custom__">Personnalisé</option>}
      </select>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-white text-xs"
        placeholder="from-blue-500 to-blue-600"
      />
    </div>
  );
}

function ItemListHeader({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2 mt-3">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <button onClick={onAdd} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition">
        <Plus size={13} /> Ajouter
      </button>
    </div>
  );
}

// ============= MARKDOWN EDITOR (moved up for reuse in config editors) =============
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

function MarkdownEditor({ value, onChange, rows = 12, placeholder }: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || defaultText;
    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const insertLine = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const end = lineEnd === -1 ? value.length : lineEnd;
    const line = value.substring(lineStart, end);
    const newValue = value.substring(0, lineStart) + prefix + line + value.substring(end);
    onChange(newValue);
  };

  const insertBlock = (block: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const before = pos > 0 && value[pos - 1] !== '\n' ? '\n\n' : pos > 0 ? '\n' : '';
    const newValue = value.substring(0, pos) + before + block + '\n\n' + value.substring(pos);
    onChange(newValue);
    setTimeout(() => { textarea.focus(); }, 0);
  };

  const [history, setHistory] = React.useState<string[]>([value]);
  const [historyIdx, setHistoryIdx] = React.useState(0);

  const pushHistory = React.useCallback((v: string) => {
    setHistory(h => { const next = [...h.slice(0, historyIdx + 1), v]; return next.slice(-50); });
    setHistoryIdx(i => i + 1);
  }, [historyIdx]);

  const undo = () => {
    if (historyIdx > 0) { const idx = historyIdx - 1; setHistoryIdx(idx); onChange(history[idx]); }
  };
  const redo = () => {
    if (historyIdx < history.length - 1) { const idx = historyIdx + 1; setHistoryIdx(idx); onChange(history[idx]); }
  };

  // Track changes for undo/redo
  const prevValueRef = React.useRef(value);
  React.useEffect(() => {
    if (value !== prevValueRef.current && value !== history[historyIdx]) {
      pushHistory(value);
    }
    prevValueRef.current = value;
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const tools = [
    { icon: Undo2, label: 'Annuler', action: undo },
    { icon: Redo2, label: 'Rétablir', action: redo },
    { sep: true },
    { icon: Bold, label: 'Gras', action: () => insertMarkdown('**', '**', 'texte gras') },
    { icon: Italic, label: 'Italique', action: () => insertMarkdown('*', '*', 'texte italique') },
    { icon: Underline, label: 'Souligné', action: () => insertMarkdown('<u>', '</u>', 'texte souligné') },
    { icon: Strikethrough, label: 'Barré', action: () => insertMarkdown('~~', '~~', 'texte barré') },
    { icon: Highlighter, label: 'Surligné', action: () => insertMarkdown('<mark>', '</mark>', 'texte surligné') },
    { sep: true },
    { icon: Heading1, label: 'Titre 1', action: () => insertLine('# ') },
    { icon: Heading2, label: 'Titre 2', action: () => insertLine('## ') },
    { icon: Heading3, label: 'Titre 3', action: () => insertLine('### ') },
    { sep: true },
    { icon: AlignLeft, label: 'Aligner à gauche', action: () => insertMarkdown('<div style="text-align:left">', '</div>', 'texte') },
    { icon: AlignCenter, label: 'Centrer', action: () => insertMarkdown('<div style="text-align:center">', '</div>', 'texte centré') },
    { icon: AlignRight, label: 'Aligner à droite', action: () => insertMarkdown('<div style="text-align:right">', '</div>', 'texte') },
    { sep: true },
    { icon: List, label: 'Liste', action: () => insertLine('- ') },
    { icon: ListOrdered, label: 'Liste numérotée', action: () => insertLine('1. ') },
    { icon: ListChecks, label: 'Liste de tâches', action: () => insertLine('- [ ] ') },
    { icon: Quote, label: 'Citation', action: () => insertLine('> ') },
    { sep: true },
    { icon: Link2, label: 'Lien', action: () => insertMarkdown('[', '](https://)', 'texte du lien') },
    { icon: Image, label: 'Image', action: () => insertMarkdown('![', '](https://url-image.jpg)', 'alt text') },
    { icon: Table, label: 'Tableau', action: () => insertBlock('| Colonne 1 | Colonne 2 | Colonne 3 |\n|-----------|-----------|----------|\n| Cellule   | Cellule   | Cellule  |\n| Cellule   | Cellule   | Cellule  |') },
    { sep: true },
    { icon: Code, label: 'Code inline', action: () => insertMarkdown('`', '`', 'code') },
    { icon: FileCode, label: 'Bloc de code', action: () => insertBlock('```\n// votre code ici\n```') },
    { icon: Superscript, label: 'Exposant', action: () => insertMarkdown('<sup>', '</sup>', 'texte') },
    { icon: Subscript, label: 'Indice', action: () => insertMarkdown('<sub>', '</sub>', 'texte') },
    { icon: Minus, label: 'Séparateur', action: () => insertBlock('---') },
  ];

  return (
    <div className="border border-slate-600 rounded-lg overflow-hidden">
      <div className="bg-slate-700 border-b border-slate-600 px-2 py-1.5 flex items-center gap-0.5 flex-wrap">
        {tools.map((tool, i) =>
          'sep' in tool ? (
            <div key={i} className="w-px h-5 bg-slate-500 mx-1" />
          ) : (
            <button key={i} type="button" onClick={tool.action} title={tool.label}
              className="p-1.5 hover:bg-slate-600 rounded text-slate-300 hover:text-white transition">
              {tool.icon && <tool.icon size={15} />}
            </button>
          )
        )}
        <div className="flex-1" />
        <button type="button" onClick={() => setPreview(!preview)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${preview ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-300 hover:text-white'}`}>
          {preview ? <><Pencil size={13} /> Éditer</> : <><EyeIcon size={13} /> Aperçu</>}
        </button>
      </div>
      {preview ? (
        <div className="bg-slate-800 p-4 min-h-[200px] prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-blue-400 prose-strong:text-white prose-li:text-slate-300 prose-blockquote:border-slate-500 prose-blockquote:text-slate-400 prose-code:text-emerald-400">
          {value ? <ReactMarkdown>{value}</ReactMarkdown> : <p className="text-slate-500 italic">Aucun contenu à prévisualiser</p>}
        </div>
      ) : (
        <textarea ref={textareaRef} value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
          className="w-full bg-slate-800 px-4 py-3 text-white font-mono text-sm resize-y focus:outline-none focus:ring-0 border-0" />
      )}
    </div>
  );
}

function FieldMarkdown({ label, value, onChange, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <MarkdownEditor value={value} onChange={onChange} rows={rows} />
    </div>
  );
}

// ─── Per-section-type config editors ───
function HeroConfigEditor({ config, onChange }: { config: JsonRecord; onChange: (c: JsonRecord) => void }) {
  const badge = (config.badge as { text?: string; actif?: boolean }) || {};
  const ctaP = (config.ctaPrimary as { text?: string; link?: string }) || {};
  const ctaS = (config.ctaSecondary as { text?: string; link?: string }) || {};
  return (
    <div className="space-y-3">
      <FieldInput label="Titre" value={str(config.title)} onChange={(v) => onChange({ ...config, title: v })} />
      <FieldMarkdown label="Sous-titre" value={str(config.subtitle)} onChange={(v) => onChange({ ...config, subtitle: v })} rows={4} />
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Badge texte" value={str(badge.text)} onChange={(v) => onChange({ ...config, badge: { ...badge, text: v } })} />
        <FieldToggle label="Badge actif" checked={!!badge.actif} onChange={(v) => onChange({ ...config, badge: { ...badge, actif: v } })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="CTA Primaire - Texte" value={str(ctaP.text)} onChange={(v) => onChange({ ...config, ctaPrimary: { ...ctaP, text: v } })} />
        <FieldInput label="CTA Primaire - Lien" value={str(ctaP.link)} onChange={(v) => onChange({ ...config, ctaPrimary: { ...ctaP, link: v } })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="CTA Secondaire - Texte" value={str(ctaS.text)} onChange={(v) => onChange({ ...config, ctaSecondary: { ...ctaS, text: v } })} />
        <FieldInput label="CTA Secondaire - Lien" value={str(ctaS.link)} onChange={(v) => onChange({ ...config, ctaSecondary: { ...ctaS, link: v } })} />
      </div>
      <FieldInput label="Gradient de fond" value={str(config.bgGradient)} onChange={(v) => onChange({ ...config, bgGradient: v })} placeholder="from-blue-500 to-purple-500" />
    </div>
  );
}

function StatsConfigEditor({ config, onChange }: { config: JsonRecord; onChange: (c: JsonRecord) => void }) {
  const items = (config.items as { value?: string; label?: string; suffix?: string }[]) || [];
  return (
    <div>
      <ItemListHeader label={`Statistiques (${items.length})`} onAdd={() => onChange({ ...config, items: arrPush(items, { value: '', label: '', suffix: '' }) })} />
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start bg-slate-700/50 rounded p-2">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <FieldInput label="Valeur" value={str(item.value)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, value: v }) })} placeholder="190+" />
              <FieldInput label="Label" value={str(item.label)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, label: v }) })} placeholder="Workflows" />
              <FieldInput label="Suffixe" value={str(item.suffix)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, suffix: v }) })} />
            </div>
            <button onClick={() => onChange({ ...config, items: arrRemove(items, i) })} className="text-red-400 hover:text-red-300 p-1 mt-4"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustBadgesConfigEditor({ config, onChange }: { config: JsonRecord; onChange: (c: JsonRecord) => void }) {
  const items = (config.items as { icon?: string; text?: string }[]) || [];
  return (
    <div>
      <ItemListHeader label={`Badges (${items.length})`} onAdd={() => onChange({ ...config, items: arrPush(items, { icon: '', text: '' }) })} />
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start bg-slate-700/50 rounded p-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <FieldInput label="Icône" value={str(item.icon)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, icon: v }) })} placeholder="Shield, Award..." />
              <FieldInput label="Texte" value={str(item.text)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, text: v }) })} />
            </div>
            <button onClick={() => onChange({ ...config, items: arrRemove(items, i) })} className="text-red-400 hover:text-red-300 p-1 mt-4"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModulesConfigEditor({ config, onChange }: { config: JsonRecord; onChange: (c: JsonRecord) => void }) {
  const badge = (config.badge as { text?: string; icon?: string }) || {};
  const items = (config.items as { icon?: string; title?: string; description?: string; features?: string[]; color?: string }[]) || [];
  return (
    <div className="space-y-3">
      <FieldInput label="Titre" value={str(config.title)} onChange={(v) => onChange({ ...config, title: v })} />
      <FieldMarkdown label="Sous-titre" value={str(config.subtitle)} onChange={(v) => onChange({ ...config, subtitle: v })} rows={4} />
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Badge texte" value={str(badge.text)} onChange={(v) => onChange({ ...config, badge: { ...badge, text: v } })} />
        <FieldIconPicker label="Badge icône" value={str(badge.icon)} onChange={(v) => onChange({ ...config, badge: { ...badge, icon: v } })} />
      </div>
      <ItemListHeader label={`Modules (${items.length})`} onAdd={() => onChange({ ...config, items: arrPush(items, { icon: '', title: '', description: '', features: [], color: '' }) })} />
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-slate-700/50 rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Module #{i + 1}</span>
              <button onClick={() => onChange({ ...config, items: arrRemove(items, i) })} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FieldIconPicker label="Icône" value={str(item.icon)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, icon: v }) })} />
              <FieldColorPicker label="Couleur" value={str(item.color)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, color: v }) })} />
            </div>
            <FieldInput label="Titre" value={str(item.title)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, title: v }) })} />
            <FieldTextarea label="Description" value={str(item.description)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, description: v }) })} />
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Features</span>
                <button onClick={() => {
                  const feats = [...(item.features || []), ''];
                  onChange({ ...config, items: arrUpdate(items, i, { ...item, features: feats }) });
                }} className="text-xs text-blue-400 hover:text-blue-300"><Plus size={12} className="inline" /> Ajouter</button>
              </div>
              {(item.features || []).map((f, fi) => (
                <div key={fi} className="flex gap-1 mb-1">
                  <input type="text" value={f} onChange={(e) => {
                    const feats = [...(item.features || [])];
                    feats[fi] = e.target.value;
                    onChange({ ...config, items: arrUpdate(items, i, { ...item, features: feats }) });
                  }} className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                  <button onClick={() => {
                    const feats = (item.features || []).filter((_, k) => k !== fi);
                    onChange({ ...config, items: arrUpdate(items, i, { ...item, features: feats }) });
                  }} className="text-red-400 hover:text-red-300"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentIAConfigEditor({ config, onChange }: { config: JsonRecord; onChange: (c: JsonRecord) => void }) {
  const badge = (config.badge as { text?: string; icon?: string }) || {};
  const features = (config.features as { icon?: string; text?: string }[]) || [];
  const chatMessages = (config.chatMessages as { role?: string; text?: string }[]) || [];
  return (
    <div className="space-y-3">
      <FieldInput label="Titre" value={str(config.title)} onChange={(v) => onChange({ ...config, title: v })} />
      <FieldInput label="Titre highlight" value={str(config.titleHighlight)} onChange={(v) => onChange({ ...config, titleHighlight: v })} />
      <FieldMarkdown label="Sous-titre" value={str(config.subtitle)} onChange={(v) => onChange({ ...config, subtitle: v })} rows={4} />
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="Badge texte" value={str(badge.text)} onChange={(v) => onChange({ ...config, badge: { ...badge, text: v } })} />
        <FieldIconPicker label="Badge icône" value={str(badge.icon)} onChange={(v) => onChange({ ...config, badge: { ...badge, icon: v } })} />
      </div>
      <FieldInput label="Gradient de fond" value={str(config.bgGradient)} onChange={(v) => onChange({ ...config, bgGradient: v })} />
      <ItemListHeader label={`Features (${features.length})`} onAdd={() => onChange({ ...config, features: arrPush(features, { icon: '', text: '' }) })} />
      <div className="space-y-2">
        {features.map((f, i) => (
          <div key={i} className="flex gap-2 items-start bg-slate-700/50 rounded p-2">
            <div className="flex-1 grid grid-cols-2 gap-2">
              <FieldIconPicker label="Icône" value={str(f.icon)} onChange={(v) => onChange({ ...config, features: arrUpdate(features, i, { ...f, icon: v }) })} />
              <FieldInput label="Texte" value={str(f.text)} onChange={(v) => onChange({ ...config, features: arrUpdate(features, i, { ...f, text: v }) })} />
            </div>
            <button onClick={() => onChange({ ...config, features: arrRemove(features, i) })} className="text-red-400 hover:text-red-300 p-1 mt-4"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <ItemListHeader label={`Messages Chat (${chatMessages.length})`} onAdd={() => onChange({ ...config, chatMessages: arrPush(chatMessages, { role: 'user', text: '' }) })} />
      <div className="space-y-2">
        {chatMessages.map((m, i) => (
          <div key={i} className="flex gap-2 items-start bg-slate-700/50 rounded p-2">
            <select value={str(m.role)} onChange={(e) => onChange({ ...config, chatMessages: arrUpdate(chatMessages, i, { ...m, role: e.target.value }) })}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-xs w-24">
              <option value="user">User</option>
              <option value="assistant">IA</option>
            </select>
            <input type="text" value={str(m.text)} onChange={(e) => onChange({ ...config, chatMessages: arrUpdate(chatMessages, i, { ...m, text: e.target.value }) })}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-sm" />
            <button onClick={() => onChange({ ...config, chatMessages: arrRemove(chatMessages, i) })} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingConfigEditor({ config, onChange }: { config: JsonRecord; onChange: (c: JsonRecord) => void }) {
  const badge = (config.badge as { text?: string; icon?: string } | string) || {};
  const badgeObj = typeof badge === 'string' ? { text: badge } : badge;
  const items = (config.items as { icon?: string; title?: string; description?: string; badge?: string }[]) || [];
  return (
    <div className="space-y-3">
      <FieldInput label="Titre" value={str(config.title)} onChange={(v) => onChange({ ...config, title: v })} />
      <FieldMarkdown label="Sous-titre" value={str(config.subtitle)} onChange={(v) => onChange({ ...config, subtitle: v })} rows={4} />
      <FieldInput label="Badge" value={str(badgeObj.text || (typeof badge === 'string' ? badge : ''))} onChange={(v) => onChange({ ...config, badge: v })} />
      <ItemListHeader label={`Éléments (${items.length})`} onAdd={() => onChange({ ...config, items: arrPush(items, { icon: '', title: '', description: '', badge: '' }) })} />
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="bg-slate-700/50 rounded p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">#{i + 1}</span>
              <button onClick={() => onChange({ ...config, items: arrRemove(items, i) })} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FieldIconPicker label="Icône" value={str(item.icon)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, icon: v }) })} />
              <FieldInput label="Badge" value={str(item.badge)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, badge: v }) })} />
            </div>
            <FieldInput label="Titre" value={str(item.title)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, title: v }) })} />
            <FieldTextarea label="Description" value={str(item.description)} onChange={(v) => onChange({ ...config, items: arrUpdate(items, i, { ...item, description: v }) })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorksConfigEditor({ config, onChange }: { config: JsonRecord; onChange: (c: JsonRecord) => void }) {
  const steps = (config.steps as { number?: number; title?: string; description?: string; icon?: string }[]) || [];
  return (
    <div className="space-y-3">
      <FieldInput label="Titre" value={str(config.title)} onChange={(v) => onChange({ ...config, title: v })} />
      <FieldMarkdown label="Sous-titre" value={str(config.subtitle)} onChange={(v) => onChange({ ...config, subtitle: v })} rows={4} />
      <ItemListHeader label={`Étapes (${steps.length})`} onAdd={() => onChange({ ...config, steps: arrPush(steps, { number: steps.length + 1, title: '', description: '', icon: '' }) })} />
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="bg-slate-700/50 rounded p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Étape {i + 1}</span>
              <button onClick={() => onChange({ ...config, steps: arrRemove(steps, i) })} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FieldIconPicker label="Icône" value={str(step.icon)} onChange={(v) => onChange({ ...config, steps: arrUpdate(steps, i, { ...step, icon: v }) })} />
              <FieldInput label="Titre" value={str(step.title)} onChange={(v) => onChange({ ...config, steps: arrUpdate(steps, i, { ...step, title: v }) })} />
            </div>
            <FieldTextarea label="Description" value={str(step.description)} onChange={(v) => onChange({ ...config, steps: arrUpdate(steps, i, { ...step, description: v }) })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialsConfigEditor({ config, onChange }: { config: JsonRecord; onChange: (c: JsonRecord) => void }) {
  return (
    <div className="space-y-3">
      <FieldInput label="Titre" value={str(config.title)} onChange={(v) => onChange({ ...config, title: v })} />
      <FieldMarkdown label="Sous-titre" value={str(config.subtitle)} onChange={(v) => onChange({ ...config, subtitle: v })} rows={4} />
      <p className="text-xs text-slate-500 italic">Les témoignages se gèrent dans l'onglet « Témoignages » du CMS.</p>
    </div>
  );
}

function ContactConfigEditor({ config, onChange }: { config: JsonRecord; onChange: (c: JsonRecord) => void }) {
  const rappelIA = (config.rappelIA as { title?: string; description?: string; actif?: boolean }) || {};
  return (
    <div className="space-y-3">
      <FieldInput label="Titre" value={str(config.title)} onChange={(v) => onChange({ ...config, title: v })} />
      <FieldMarkdown label="Sous-titre" value={str(config.subtitle)} onChange={(v) => onChange({ ...config, subtitle: v })} rows={4} />
      <div className="bg-slate-700/30 rounded p-3 space-y-2">
        <span className="text-xs font-medium text-slate-400">Rappel IA (Bulle de rappel)</span>
        <FieldToggle label="Activer le rappel IA" checked={!!rappelIA.actif} onChange={(v) => onChange({ ...config, rappelIA: { ...rappelIA, actif: v } })} />
        {rappelIA.actif && (
          <>
            <FieldInput label="Titre rappel" value={str(rappelIA.title)} onChange={(v) => onChange({ ...config, rappelIA: { ...rappelIA, title: v } })} />
            <FieldInput label="Description rappel" value={str(rappelIA.description)} onChange={(v) => onChange({ ...config, rappelIA: { ...rappelIA, description: v } })} />
          </>
        )}
      </div>
    </div>
  );
}

function CTAConfigEditor({ config, onChange }: { config: JsonRecord; onChange: (c: JsonRecord) => void }) {
  const ctaP = (config.ctaPrimary as { text?: string; link?: string; icon?: string }) || {};
  const ctaS = (config.ctaSecondary as { text?: string; link?: string; icon?: string }) || {};
  return (
    <div className="space-y-3">
      <FieldInput label="Titre" value={str(config.title)} onChange={(v) => onChange({ ...config, title: v })} />
      <FieldMarkdown label="Sous-titre" value={str(config.subtitle)} onChange={(v) => onChange({ ...config, subtitle: v })} rows={4} />
      <FieldInput label="Gradient de fond" value={str(config.bgGradient)} onChange={(v) => onChange({ ...config, bgGradient: v })} placeholder="from-blue-500 to-purple-500" />
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="CTA Primaire - Texte" value={str(ctaP.text)} onChange={(v) => onChange({ ...config, ctaPrimary: { ...ctaP, text: v } })} />
        <FieldInput label="CTA Primaire - Lien" value={str(ctaP.link)} onChange={(v) => onChange({ ...config, ctaPrimary: { ...ctaP, link: v } })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FieldInput label="CTA Secondaire - Texte" value={str(ctaS.text)} onChange={(v) => onChange({ ...config, ctaSecondary: { ...ctaS, text: v } })} />
        <FieldInput label="CTA Secondaire - Lien" value={str(ctaS.link)} onChange={(v) => onChange({ ...config, ctaSecondary: { ...ctaS, link: v } })} />
      </div>
    </div>
  );
}

function CustomHTMLConfigEditor({ config, onChange }: { config: JsonRecord; onChange: (c: JsonRecord) => void }) {
  return (
    <div className="space-y-3">
      <FieldTextarea label="HTML" value={str(config.html)} onChange={(v) => onChange({ ...config, html: v })} rows={8} />
      <FieldInput label="Classe CSS de fond" value={str(config.bgColor)} onChange={(v) => onChange({ ...config, bgColor: v })} placeholder="bg-white" />
    </div>
  );
}

// Map type → config editor component
const sectionConfigEditors: Record<string, React.FC<{ config: JsonRecord; onChange: (c: JsonRecord) => void }>> = {
  hero: HeroConfigEditor,
  stats: StatsConfigEditor,
  trust_badges: TrustBadgesConfigEditor,
  modules: ModulesConfigEditor,
  agent_ia: AgentIAConfigEditor,
  upcoming: UpcomingConfigEditor,
  how_it_works: HowItWorksConfigEditor,
  testimonials: TestimonialsConfigEditor,
  contact: ContactConfigEditor,
  cta: CTAConfigEditor,
  custom_html: CustomHTMLConfigEditor,
};

function SectionModal({
  section,
  sectionType,
  setSectionType,
  onClose,
  onCreate,
  onUpdate,
}: SectionModalProps) {
  const currentType = section?.type || sectionType;
  const [formData, setFormData] = useState<Partial<Section>>(
    section || { titre: '', config: {} }
  );
  const [sectionConfig, setSectionConfig] = useState<JsonRecord>(() => {
    const raw = (section?.config || {}) as JsonRecord;
    // strip background keys — those go in bgConfig
    const { backgroundImage: _bi, bgColor: _bc, bgOverlay: _bo, bgSize: _bs, bgPosition: _bp, ...rest } = raw;
    return rest;
  });

  const [bgConfig, setBgConfig] = useState(() => {
    const raw = section?.config as Record<string, unknown> | undefined;
    let overlayNum = 0;
    const rawOverlay = raw?.bgOverlay;
    if (typeof rawOverlay === 'number') {
      overlayNum = rawOverlay;
    } else if (typeof rawOverlay === 'string') {
      const match = rawOverlay.match(/rgba?\([\d,\s]+,\s*([\d.]+)\)/);
      overlayNum = match ? parseFloat(match[1]) : (parseFloat(rawOverlay) || 0);
    }
    return {
      backgroundImage: str(raw?.backgroundImage),
      bgColor: str(raw?.bgColor),
      bgOverlay: overlayNum,
      bgSize: str(raw?.bgSize) || 'cover',
      bgPosition: str(raw?.bgPosition) || 'center',
    };
  });

  const [activePanel, setActivePanel] = useState<'content' | 'background'>('content');

  const sectionTypes = [
    'hero', 'stats', 'trust_badges', 'modules', 'agent_ia',
    'how_it_works', 'testimonials', 'upcoming', 'cta', 'contact', 'custom_html',
  ];

  const handleSave = () => {
    const overlayValue = bgConfig.bgOverlay ? `rgba(0,0,0,${bgConfig.bgOverlay})` : '';
    const mergedConfig = {
      ...sectionConfig,
      backgroundImage: bgConfig.backgroundImage || undefined,
      bgColor: bgConfig.bgColor || undefined,
      bgOverlay: overlayValue || undefined,
      bgSize: bgConfig.bgSize,
      bgPosition: bgConfig.bgPosition,
    };
    if (section) {
      onUpdate(section.id, { ...formData, config: mergedConfig });
    } else {
      onCreate(sectionType, { titre: formData.titre || undefined, config: mergedConfig });
    }
  };

  const ConfigEditor = sectionConfigEditors[currentType];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            {(() => {
              const meta = sectionTypeMap[currentType];
              const Icon = meta?.icon || Layout;
              return <Icon size={20} className="text-blue-400" />;
            })()}
            <h2 className="text-xl font-bold text-white">
              {section ? `Éditer : ${sectionTypeMap[currentType]?.label || currentType}` : 'Ajouter une section'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>

        {/* Type selector for new sections */}
        {!section && (
          <div className="mb-4 flex-shrink-0">
            <label className="block text-sm font-medium text-slate-300 mb-2">Type de section</label>
            <select value={sectionType} onChange={(e) => setSectionType(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white">
              {sectionTypes.map((type) => (
                <option key={type} value={type}>{sectionTypeMap[type]?.label || type}</option>
              ))}
            </select>
          </div>
        )}

        {/* Titre */}
        <div className="mb-3 flex-shrink-0">
          <FieldInput label="Titre de la section" value={formData.titre || ''} onChange={(v) => setFormData({ ...formData, titre: v })} />
        </div>

        {/* Tabs Contenu / Background */}
        <div className="flex gap-2 mb-3 flex-shrink-0">
          <button onClick={() => setActivePanel('content')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${activePanel === 'content' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}>
            Contenu
          </button>
          <button onClick={() => setActivePanel('background')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${activePanel === 'background' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'}`}>
            Fond / Background
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {activePanel === 'content' ? (
            ConfigEditor ? (
              <ConfigEditor config={sectionConfig} onChange={setSectionConfig} />
            ) : (
              <p className="text-slate-400 text-sm italic">Aucun éditeur disponible pour le type « {currentType} ».</p>
            )
          ) : (
            <div className="space-y-4">
              <FieldInput label="URL de l'image de fond" value={bgConfig.backgroundImage} onChange={(v) => setBgConfig({ ...bgConfig, backgroundImage: v })} placeholder="https://..." />
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Couleur de fond</label>
                <div className="flex gap-2">
                  <input type="color" value={bgConfig.bgColor || '#000000'} onChange={(e) => setBgConfig({ ...bgConfig, bgColor: e.target.value })} className="w-12 h-10 bg-slate-700 border border-slate-600 rounded cursor-pointer" />
                  <input type="text" value={bgConfig.bgColor} onChange={(e) => setBgConfig({ ...bgConfig, bgColor: e.target.value })} className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white" placeholder="#000000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Opacité overlay ({bgConfig.bgOverlay})</label>
                <input type="range" min="0" max="1" step="0.1" value={bgConfig.bgOverlay} onChange={(e) => setBgConfig({ ...bgConfig, bgOverlay: parseFloat(e.target.value) })} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Taille du fond</label>
                  <select value={bgConfig.bgSize} onChange={(e) => setBgConfig({ ...bgConfig, bgSize: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white">
                    <option value="cover">cover</option><option value="contain">contain</option><option value="auto">auto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Position du fond</label>
                  <select value={bgConfig.bgPosition} onChange={(e) => setBgConfig({ ...bgConfig, bgPosition: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white">
                    <option value="center">center</option><option value="top">top</option><option value="bottom">bottom</option><option value="left">left</option><option value="right">right</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-2 mt-4 flex-shrink-0">
          <button onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2.5 transition flex items-center justify-center gap-2 font-medium">
            <Save size={18} /> Enregistrer
          </button>
          <button onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded px-4 py-2.5 transition">
            Annuler
          </button>
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
  page: CMSPageData | null;
  onClose: () => void;
  onCreate: (data: Partial<CMSPageData>) => void;
  onUpdate: (id: string, data: Partial<CMSPageData>) => void;
}

function PageModal({ page, onClose, onCreate, onUpdate }: PageModalProps) {
  const [formData, setFormData] = useState<Partial<CMSPageData>>(
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
      <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full max-h-[85vh] overflow-y-auto">
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
            <MarkdownEditor
              value={formData.contenu || ''}
              onChange={(val) => setFormData({ ...formData, contenu: val })}
              rows={14}
              placeholder="Rédigez le contenu de la page en Markdown..."
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
  onSaveNavbar: (navbar: NavbarConfig) => void;
  onSaveFooter: (footer: FooterConfig) => void;
}

function NavbarFooterEditor({
  config,
  onSaveNavbar,
  onSaveFooter,
}: NavbarFooterEditorProps) {
  const [navbar, setNavbar] = useState<NavbarConfig>(config.navbar || { logo: '', logoText: '', links: [], ctaButton: { text: '', href: '' }, showLoginLink: true, loginHref: '/login' });
  const [footer, setFooter] = useState<FooterConfig>(config.footer || { companyName: '', description: '', columns: [], legalLinks: [
    { text: 'Mentions légales', href: '/mentions-legales' },
    { text: 'Confidentialité', href: '/confidentialite' },
    { text: 'CGV', href: '/cgv' },
  ] });

  // ─── Navbar Links helpers ───
  const navLinks = navbar.links || [];
  const updateNavLink = (idx: number, field: 'text' | 'href', val: string) => {
    const updated = [...navLinks];
    updated[idx] = { ...updated[idx], [field]: val };
    setNavbar({ ...navbar, links: updated });
  };
  const addNavLink = () => {
    setNavbar({ ...navbar, links: [...navLinks, { text: '', href: '' }] });
  };
  const removeNavLink = (idx: number) => {
    setNavbar({ ...navbar, links: navLinks.filter((_, i) => i !== idx) });
  };
  const moveNavLink = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= navLinks.length) return;
    const updated = [...navLinks];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setNavbar({ ...navbar, links: updated });
  };

  // ─── Footer Legal Links helpers ───
  const legalLinks = footer.legalLinks || [];
  const updateLegalLink = (idx: number, field: 'text' | 'href', val: string) => {
    const updated = [...legalLinks];
    updated[idx] = { ...updated[idx], [field]: val };
    setFooter({ ...footer, legalLinks: updated });
  };
  const addLegalLink = () => {
    setFooter({ ...footer, legalLinks: [...legalLinks, { text: '', href: '' }] });
  };
  const removeLegalLink = (idx: number) => {
    setFooter({ ...footer, legalLinks: legalLinks.filter((_, i) => i !== idx) });
  };

  // ─── Footer Columns helpers ───
  const columns = footer.columns || [];
  const addColumn = () => {
    setFooter({ ...footer, columns: [...columns, { title: '', links: [] }] });
  };
  const removeColumn = (idx: number) => {
    setFooter({ ...footer, columns: columns.filter((_, i) => i !== idx) });
  };
  const updateColumnTitle = (idx: number, title: string) => {
    const updated = [...columns];
    updated[idx] = { ...updated[idx], title };
    setFooter({ ...footer, columns: updated });
  };
  const addColumnLink = (colIdx: number) => {
    const updated = [...columns];
    updated[colIdx] = { ...updated[colIdx], links: [...updated[colIdx].links, { text: '', href: '' }] };
    setFooter({ ...footer, columns: updated });
  };
  const removeColumnLink = (colIdx: number, linkIdx: number) => {
    const updated = [...columns];
    updated[colIdx] = { ...updated[colIdx], links: updated[colIdx].links.filter((_, i) => i !== linkIdx) };
    setFooter({ ...footer, columns: updated });
  };
  const updateColumnLink = (colIdx: number, linkIdx: number, field: 'text' | 'href', val: string) => {
    const updated = [...columns];
    const links = [...updated[colIdx].links];
    links[linkIdx] = { ...links[linkIdx], [field]: val };
    updated[colIdx] = { ...updated[colIdx], links };
    setFooter({ ...footer, columns: updated });
  };

  return (
    <div className="space-y-6">
      {/* ═══ NAVBAR ═══ */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-5">Navbar</h3>
        <div className="space-y-5">
          {/* Logo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Logo Text</label>
              <input
                type="text"
                value={navbar.logoText || ''}
                onChange={(e) => setNavbar({ ...navbar, logoText: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                placeholder="TalosPrimes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Logo URL (image)</label>
              <input
                type="text"
                value={navbar.logo || ''}
                onChange={(e) => setNavbar({ ...navbar, logo: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Liens de navigation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">Liens de navigation</label>
              <button
                onClick={addNavLink}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
              >
                <Plus size={14} /> Ajouter un lien
              </button>
            </div>
            {navLinks.length === 0 && (
              <p className="text-xs text-slate-500 italic mb-2">Aucun lien configuré. Ajoutez-en pour les afficher dans la navbar.</p>
            )}
            <div className="space-y-2">
              {navLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-700/50 rounded p-2">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveNavLink(idx, -1)} disabled={idx === 0}
                      className="text-slate-400 hover:text-white disabled:opacity-20 transition"><ArrowUp size={12} /></button>
                    <button onClick={() => moveNavLink(idx, 1)} disabled={idx === navLinks.length - 1}
                      className="text-slate-400 hover:text-white disabled:opacity-20 transition"><ArrowDown size={12} /></button>
                  </div>
                  <input
                    type="text"
                    value={link.text}
                    onChange={(e) => updateNavLink(idx, 'text', e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-white text-sm"
                    placeholder="Texte du lien"
                  />
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => updateNavLink(idx, 'href', e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-white text-sm"
                    placeholder="#section ou /page/slug"
                  />
                  <button onClick={() => removeNavLink(idx)} className="text-red-400 hover:text-red-300 p-1 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Bouton CTA - Texte</label>
              <input
                type="text"
                value={navbar.ctaButton?.text || ''}
                onChange={(e) => setNavbar({ ...navbar, ctaButton: { text: e.target.value, href: navbar.ctaButton?.href || '' } })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                placeholder="Essayer gratuitement"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Bouton CTA - Lien</label>
              <input
                type="text"
                value={navbar.ctaButton?.href || ''}
                onChange={(e) => setNavbar({ ...navbar, ctaButton: { text: navbar.ctaButton?.text || '', href: e.target.value } })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                placeholder="/inscription"
              />
            </div>
          </div>

          {/* Lien Connexion */}
          <div className="flex items-center gap-4 bg-slate-700/30 rounded p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={navbar.showLoginLink !== false}
                onChange={(e) => setNavbar({ ...navbar, showLoginLink: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-slate-300">Afficher le lien Connexion</span>
            </label>
            {navbar.showLoginLink !== false && (
              <input
                type="text"
                value={navbar.loginHref || '/login'}
                onChange={(e) => setNavbar({ ...navbar, loginHref: e.target.value })}
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-white text-sm"
                placeholder="/login"
              />
            )}
          </div>

          <button
            onClick={() => onSaveNavbar(navbar)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2.5 transition flex items-center justify-center gap-2 font-medium"
          >
            <Save size={18} /> Enregistrer Navbar
          </button>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-5">Footer</h3>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nom Entreprise</label>
              <input
                type="text"
                value={footer.companyName || ''}
                onChange={(e) => setFooter({ ...footer, companyName: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <input
                type="text"
                value={footer.description || ''}
                onChange={(e) => setFooter({ ...footer, description: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          {/* Colonnes du footer */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">Colonnes du footer</label>
              <button
                onClick={addColumn}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
              >
                <Plus size={14} /> Ajouter une colonne
              </button>
            </div>
            {columns.length === 0 && (
              <p className="text-xs text-slate-500 italic mb-2">Aucune colonne configurée. Ajoutez-en pour afficher des liens dans le footer.</p>
            )}
            <div className="space-y-4">
              {columns.map((col, colIdx) => (
                <div key={colIdx} className="bg-slate-700/30 rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={col.title}
                      onChange={(e) => updateColumnTitle(colIdx, e.target.value)}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-white text-sm font-medium"
                      placeholder="Titre de la colonne"
                    />
                    <button onClick={() => removeColumn(colIdx)} className="text-red-400 hover:text-red-300 p-1.5 transition" title="Supprimer la colonne">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="space-y-1.5 pl-2">
                    {col.links.map((link, linkIdx) => (
                      <div key={linkIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={link.text}
                          onChange={(e) => updateColumnLink(colIdx, linkIdx, 'text', e.target.value)}
                          className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                          placeholder="Texte du lien"
                        />
                        <input
                          type="text"
                          value={link.href}
                          onChange={(e) => updateColumnLink(colIdx, linkIdx, 'href', e.target.value)}
                          className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                          placeholder="#section ou /page"
                        />
                        <button onClick={() => removeColumnLink(colIdx, linkIdx)} className="text-red-400 hover:text-red-300">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addColumnLink(colIdx)}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition mt-1"
                    >
                      <Plus size={12} /> Ajouter un lien
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Liens légaux du footer */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">Liens légaux (bas de page)</label>
              <button
                onClick={addLegalLink}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {legalLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-700/50 rounded p-2">
                  <input
                    type="text"
                    value={link.text}
                    onChange={(e) => updateLegalLink(idx, 'text', e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-white text-sm"
                    placeholder="Mentions légales"
                  />
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => updateLegalLink(idx, 'href', e.target.value)}
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-white text-sm"
                    placeholder="/mentions-legales"
                  />
                  <button onClick={() => removeLegalLink(idx)} className="text-red-400 hover:text-red-300 p-1 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onSaveFooter(footer)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2.5 transition flex items-center justify-center gap-2 font-medium"
          >
            <Save size={18} /> Enregistrer Footer
          </button>
        </div>
      </div>
    </div>
  );
}

interface ThemeEditorProps {
  theme: ThemeConfig;
  onSave: (theme: ThemeConfig) => void;
}

function ThemeEditor({ theme, onSave }: ThemeEditorProps) {
  const [formData, setFormData] = useState<ThemeConfig>(theme);

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
  seo: SeoConfig;
  onSave: (seo: SeoConfig) => void;
}

function SeoEditor({ seo, onSave }: SeoEditorProps) {
  const [formData, setFormData] = useState<SeoConfig>(seo);

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
  onSave: (section: string, contenu: ContentValue) => void;
  fetchApi: <T = { data: unknown }>(
    url: string,
    options?: RequestInit
  ) => Promise<T>;
}

function LegalPagesEditor({ content, onSave, fetchApi }: LegalPagesEditorProps) {
  const [mentionsLegales, setMentionsLegales] = useState(
    (content.mentions_legales as string) || ''
  );
  const [cgu, setCgu] = useState((content.cgu as string) || '');
  const [cgv, setCgv] = useState((content.cgv as string) || '');
  const [confidentialite, setConfidentialite] = useState(
    (content.confidentialite as string) || ''
  );
  const [generating, setGenerating] = useState<string | null>(null);

  const generateLegalPage = async (pageId: string, setter: (value: string) => void) => {
    try {
      setGenerating(pageId);
      const contactData = content.contact as Record<string, unknown> | undefined;
      const legalData = content.legal as Record<string, unknown> | undefined;
      const companyData = content.company as Record<string, unknown> | undefined;
      const hostingData = content.hosting as Record<string, unknown> | undefined;
      const insuranceData = content.insurance as Record<string, unknown> | undefined;

      const companyInfo = {
        contact: {
          email: str(contactData?.email),
          phone: str(contactData?.phone),
          address: str(contactData?.address),
        },
        legal: {
          companyName: str(legalData?.companyName),
          legalForm: str(legalData?.legalForm),
          capital: str(legalData?.capital),
          siret: str(legalData?.siret),
          tva: str(legalData?.tva),
          address: str(legalData?.address),
        },
        company: {
          description: str(companyData?.description),
          supportEmail: str(companyData?.supportEmail),
          rgpdEmail: str(companyData?.rgpdEmail),
        },
        hosting: {
          provider: str(hostingData?.provider),
          companyName: str(hostingData?.companyName),
          address: str(hostingData?.address),
          phone: str(hostingData?.phone),
          website: str(hostingData?.website),
        },
        insurance: {
          company: str(insuranceData?.company),
          policyNumber: str(insuranceData?.policyNumber),
          coverage: str(insuranceData?.coverage),
          address: str(insuranceData?.address),
          phone: str(insuranceData?.phone),
        },
      };

      const response = await fetchApi<{ content: string }>(
        `/api/landing/generate-legal/${pageId}`,
        {
          method: 'POST',
          body: JSON.stringify(companyInfo),
        }
      );

      setter(response.content);
    } catch (error) {
      console.error(`Erreur lors de la génération de la page légale:`, error);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Mentions Légales</h3>
        <div className="mb-4">
          <MarkdownEditor value={mentionsLegales} onChange={setMentionsLegales} rows={10} placeholder="Rédigez vos mentions légales en Markdown..." />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generateLegalPage('mentions-legales', setMentionsLegales)}
            disabled={generating === 'mentions-legales'}
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            {generating === 'mentions-legales' ? (
              <>
                <Loader size={18} className="animate-spin" /> Génération...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Générer avec l'IA
              </>
            )}
          </button>
          <button
            onClick={() => onSave('mentions_legales', mentionsLegales)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            <Save size={18} /> Enregistrer
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">CGU</h3>
        <div className="mb-4">
          <MarkdownEditor value={cgu} onChange={setCgu} rows={10} placeholder="Rédigez vos CGU en Markdown..." />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generateLegalPage('cgu', setCgu)}
            disabled={generating === 'cgu'}
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            {generating === 'cgu' ? (
              <>
                <Loader size={18} className="animate-spin" /> Génération...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Générer avec l'IA
              </>
            )}
          </button>
          <button
            onClick={() => onSave('cgu', cgu)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            <Save size={18} /> Enregistrer
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">CGV</h3>
        <div className="mb-4">
          <MarkdownEditor value={cgv} onChange={setCgv} rows={10} placeholder="Rédigez vos CGV en Markdown..." />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generateLegalPage('cgv', setCgv)}
            disabled={generating === 'cgv'}
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            {generating === 'cgv' ? (
              <>
                <Loader size={18} className="animate-spin" /> Génération...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Générer avec l'IA
              </>
            )}
          </button>
          <button
            onClick={() => onSave('cgv', cgv)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            <Save size={18} /> Enregistrer
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Politique de Confidentialité</h3>
        <div className="mb-4">
          <MarkdownEditor value={confidentialite} onChange={setConfidentialite} rows={10} placeholder="Rédigez votre politique de confidentialité en Markdown..." />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generateLegalPage('confidentialite', setConfidentialite)}
            disabled={generating === 'confidentialite'}
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            {generating === 'confidentialite' ? (
              <>
                <Loader size={18} className="animate-spin" /> Génération...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Générer avec l'IA
              </>
            )}
          </button>
          <button
            onClick={() => onSave('confidentialite', confidentialite)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition flex items-center justify-center gap-2"
          >
            <Save size={18} /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfigurationEditorProps {
  content: LandingContent;
  onSave: (section: string, contenu: ContentValue) => void;
}

function ConfigurationEditor({ content, onSave }: ConfigurationEditorProps) {
  const contactData = content.contact as JsonRecord | undefined;
  const legalData = content.legal as JsonRecord | undefined;
  const companyData = content.company as JsonRecord | undefined;
  const hostingData = content.hosting as JsonRecord | undefined;
  const insuranceData = content.insurance as JsonRecord | undefined;

  const [contact, setContact] = useState({
    email: str(contactData?.email),
    phone: str(contactData?.phone),
    address: str(contactData?.address),
  });

  const [legal, setLegal] = useState({
    companyName: str(legalData?.companyName),
    legalForm: str(legalData?.legalForm),
    capital: str(legalData?.capital),
    siret: str(legalData?.siret),
    tva: str(legalData?.tva),
    address: str(legalData?.address),
  });

  const [company, setCompany] = useState({
    description: str(companyData?.description),
    supportEmail: str(companyData?.supportEmail),
    rgpdEmail: str(companyData?.rgpdEmail),
  });

  const [hosting, setHosting] = useState({
    provider: str(hostingData?.provider),
    companyName: str(hostingData?.companyName),
    address: str(hostingData?.address),
    phone: str(hostingData?.phone),
    website: str(hostingData?.website),
  });

  const [insurance, setInsurance] = useState({
    company: str(insuranceData?.company),
    policyNumber: str(insuranceData?.policyNumber),
    coverage: str(insuranceData?.coverage),
    address: str(insuranceData?.address),
    phone: str(insuranceData?.phone),
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
