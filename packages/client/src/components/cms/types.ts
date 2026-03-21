// ─── CMS Types ───

export interface LandingSection {
  id: string;
  type: string;
  titre: string | null;
  config: Record<string, unknown>;
  ordre: number;
  actif: boolean;
}

export interface NavbarConfig {
  logo?: string;
  logoText?: string;
  links?: { text: string; href: string; type?: string }[];
  ctaButton?: { text: string; href: string };
  showLoginLink?: boolean;
  loginHref?: string;
}

export interface FooterConfig {
  companyName?: string;
  description?: string;
  columns?: { title: string; links: { text: string; href: string }[] }[];
  legalLinks?: { text: string; href: string }[];
}

export interface ThemeConfig {
  primaryColor?: string;
  accentColor?: string;
  bgColor?: string;
  textColor?: string;
  fontFamily?: string;
}

export interface SeoConfig {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  favicon?: string;
}

export interface GlobalConfig {
  navbar?: NavbarConfig;
  footer?: FooterConfig;
  theme?: ThemeConfig;
  seo?: SeoConfig;
}

export interface Testimonial {
  id: string;
  nom: string;
  prenom: string;
  entreprise?: string;
  poste?: string;
  avatar?: string;
  note: number;
  commentaire: string;
  affiche: boolean;
  ordre: number;
}

export interface CMSPage {
  id: string;
  slug: string;
  titre: string;
  contenu: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  entreprise?: string;
  message: string;
  traite: boolean;
  createdAt: string;
}

export type CMSTab = 'sections' | 'pages' | 'design' | 'testimonials' | 'messages' | 'seo';

export const SECTION_TYPES: Record<string, { label: string; icon: string; description: string }> = {
  hero: { label: 'Hero', icon: '🎯', description: 'Section principale avec titre et CTA' },
  stats: { label: 'Statistiques', icon: '📊', description: 'Chiffres clés et métriques' },
  trust_badges: { label: 'Badges de confiance', icon: '🛡️', description: 'Logos et certifications' },
  modules: { label: 'Modules / Services', icon: '📦', description: 'Cards de services avec features' },
  agent_ia: { label: 'Agent IA', icon: '🤖', description: 'Showcase agent téléphonique IA' },
  how_it_works: { label: 'Comment ça marche', icon: '🔧', description: 'Étapes du processus' },
  testimonials: { label: 'Témoignages', icon: '⭐', description: 'Avis clients' },
  contact: { label: 'Contact', icon: '✉️', description: 'Formulaire de contact' },
  cta: { label: 'Call to Action', icon: '🚀', description: 'Appel à l\'action final' },
  dashboard_showcase: { label: 'Démo Dashboard', icon: '💻', description: 'Mockup interactif du dashboard' },
  custom_html: { label: 'HTML Custom', icon: '🧩', description: 'Bloc HTML personnalisé' },
  upcoming: { label: 'À venir', icon: '🔜', description: 'Fonctionnalités à venir' },
};
