import { headers } from 'next/headers';
import { DynamicLandingHeader } from '@/components/landing/DynamicLandingHeader';
import { DynamicFooter } from '@/components/landing/DynamicFooter';
import { CallbackBubble } from '@/components/CallbackBubble';
import {
  HeroSection,
  StatsSection,
  TrustBadgesSection,
  ModulesSection,
  AgentIASection,
  UpcomingSection,
  HowItWorksSection,
  TestimonialsSection,
  ContactSection,
  CTASection,
  CustomHTMLSection,
  DashboardShowcaseSection,
  CarouselSection,
} from '@/components/landing/sections';

// ─── Types ───
type JsonRecord = Record<string, unknown>;

interface LandingSection {
  id: string;
  type: string;
  titre: string | null;
  config: JsonRecord;
  ordre: number;
  actif: boolean;
}

interface NavbarConfig extends JsonRecord {
  logo?: { text?: string; image?: string | null } | string;
  logoText?: string;
  links?: { text: string; href: string; type?: string }[];
  ctaButton?: { text: string; href: string };
  bgColor?: string;
  sticky?: boolean;
  showLoginLink?: boolean;
  loginHref?: string;
}

interface FooterConfig extends JsonRecord {
  companyName?: string;
  description?: string;
  columns?: { title: string; links: { text: string; href: string }[] }[];
  copyright?: string;
  legalLinks?: { text: string; href: string }[];
}

interface SeoConfig extends JsonRecord {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

interface ThemeConfig extends JsonRecord {
  primaryColor?: string;
  secondaryColor?: string;
}

interface GlobalConfig {
  navbar?: NavbarConfig;
  footer?: FooterConfig;
  seo?: SeoConfig;
  theme?: ThemeConfig;
}

interface Testimonial {
  id: string;
  nom: string;
  prenom: string;
  entreprise?: string;
  poste?: string;
  avatar?: string;
  note: number;
  commentaire: string;
}

// Force dynamic rendering — ne pas pré-générer pendant le build
// car le serveur API n'est pas disponible pendant next build
export const dynamic = 'force-dynamic';

// ─── Data fetching côté serveur ───
const SERVER_API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

// Sous-domaines réservés (mêmes que dans middleware.ts)
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'n8n', 'app', 'admin', 'mail', 'smtp', 'ftp']);

/**
 * Détecte le sous-domaine client depuis les headers de la requête SSR.
 * Retourne le slug du tenant ou null si domaine principal.
 */
function detectSubdomain(headersList: Headers): string | null {
  // 1. Header injecté par Nginx (le plus fiable)
  const nginxSubdomain = headersList.get('x-client-subdomain');
  if (nginxSubdomain && !RESERVED_SUBDOMAINS.has(nginxSubdomain)) {
    return nginxSubdomain;
  }

  // 2. Fallback sur le header host
  const host = headersList.get('host') || '';
  const parts = host.split('.');
  if (parts.length >= 3) {
    const domain = parts.slice(-2).join('.');
    if (domain === 'talosprimes.com') {
      const sub = parts[0];
      if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
        return sub;
      }
    }
  }

  return null;
}

async function getSections(slug: string | null): Promise<LandingSection[]> {
  try {
    const url = slug
      ? `${SERVER_API}/api/landing/site/${encodeURIComponent(slug)}/sections`
      : `${SERVER_API}/api/landing/sections`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`[SSR] landing/sections failed: ${res.status}`);
      return [];
    }
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
  } catch (err) {
    console.error('[SSR] landing/sections error:', err);
    return [];
  }
}

async function getGlobalConfig(slug: string | null): Promise<GlobalConfig> {
  try {
    const url = slug
      ? `${SERVER_API}/api/landing/site/${encodeURIComponent(slug)}/global-config`
      : `${SERVER_API}/api/landing/global-config`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error(`[SSR] landing/global-config failed: ${res.status}`);
      return {};
    }
    const json = await res.json();
    return json.data || json || {};
  } catch (err) {
    console.error('[SSR] landing/global-config error:', err);
    return {};
  }
}

async function getTestimonials(slug: string | null): Promise<Testimonial[]> {
  try {
    const url = slug
      ? `${SERVER_API}/api/landing/site/${encodeURIComponent(slug)}/testimonials`
      : `${SERVER_API}/api/landing/testimonials`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

// Fallback : lire l'ancien contenu (compatibilité pendant la migration)
async function getLandingContent(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/content`, {
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const json = await res.json();
    return json.data || json || {};
  } catch {
    return {};
  }
}

// ─── Section Renderer ───
function renderSection(
  section: LandingSection,
  { testimonials, theme, contactInfo }: {
    testimonials: Testimonial[];
    theme?: ThemeConfig;
    contactInfo?: JsonRecord;
  }
) {
  const { type, config, id } = section;

  let inner: React.ReactNode = null;
  switch (type) {
    case 'hero':
      inner = <HeroSection config={config} theme={theme} />;
      break;
    case 'stats':
      inner = <StatsSection config={config} theme={theme} />;
      break;
    case 'trust_badges':
      inner = <TrustBadgesSection config={config} theme={theme} />;
      break;
    case 'modules':
      inner = <ModulesSection config={config} theme={theme} />;
      break;
    case 'agent_ia':
      inner = <AgentIASection config={config} theme={theme} />;
      break;
    case 'upcoming':
      inner = <UpcomingSection config={config} theme={theme} />;
      break;
    case 'how_it_works':
      inner = <HowItWorksSection config={config} theme={theme} />;
      break;
    case 'testimonials':
      inner = <TestimonialsSection config={config} testimonials={testimonials} theme={theme} />;
      break;
    case 'contact':
      inner = <ContactSection config={config} contactInfo={contactInfo} theme={theme} />;
      break;
    case 'cta':
      inner = <CTASection config={config} theme={theme} />;
      break;
    case 'custom_html':
      inner = <CustomHTMLSection config={config} />;
      break;
    case 'dashboard_showcase':
      inner = <DashboardShowcaseSection config={config} theme={theme} />;
      break;
    case 'carousel':
      inner = <CarouselSection config={config} theme={theme} />;
      break;
    default:
      return null;
  }

  // ─── Background wrapper (backgroundImage, bgColor, bgOverlay) ───
  const bgImage = config.backgroundImage as string | undefined;
  const bgColor = config.bgColor as string | undefined;
  const bgOverlay = config.bgOverlay as string | undefined;
  const bgSize = (config.bgSize as string) || 'cover';
  const bgPosition = (config.bgPosition as string) || 'center';
  const hasBg = bgImage || bgColor;

  if (!hasBg) {
    return <div key={id}>{inner}</div>;
  }

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    ...(bgColor ? { backgroundColor: bgColor } : {}),
    ...(bgImage ? {
      backgroundImage: `url(${bgImage})`,
      backgroundSize: bgSize,
      backgroundPosition: bgPosition,
      backgroundRepeat: 'no-repeat',
    } : {}),
  };

  return (
    <div key={id} style={wrapperStyle}>
      {bgImage && bgOverlay && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: bgOverlay, zIndex: 1 }} />
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>{inner}</div>
    </div>
  );
}

// ─── Page ───
export default async function LandingPage() {
  // Détecter le sous-domaine client (ex: demo.talosprimes.com → 'demo')
  const headersList = await headers();
  const slug = detectSubdomain(headersList);

  const [sections, globalConfig, testimonials, content] = await Promise.all([
    getSections(slug),
    getGlobalConfig(slug),
    getTestimonials(slug),
    getLandingContent(),
  ]);

  const theme = globalConfig.theme;
  const contactInfo = {
    email: content.config_contact_email,
    phone: content.config_contact_phone,
    address: content.config_contact_address,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 antialiased relative">
      {/* ─── Grid pattern background global ─── */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      {/* ─── HEADER dynamique ─── */}
      <DynamicLandingHeader config={globalConfig.navbar} />

      {/* ─── SECTIONS dynamiques ─── */}
      {sections.map((section) =>
        renderSection(section, { testimonials, theme, contactInfo })
      )}

      {/* ─── FOOTER dynamique ─── */}
      <DynamicFooter config={globalConfig.footer} />

      {/* ─── BULLE RAPPEL IA ─── */}
      <CallbackBubble />
    </div>
  );
}

// ─── Metadata SEO dynamique ───
export async function generateMetadata() {
  try {
    const headersList = await headers();
    const slug = detectSubdomain(headersList);
    const globalConfig = await getGlobalConfig(slug);
    const seo = globalConfig.seo;
    if (seo) {
      return {
        title: seo.metaTitle || 'TalosPrimes — Gestion d\'entreprise automatisée',
        description: seo.metaDescription || 'CRM, facturation, comptabilité, RH, BTP et agent IA vocal.',
        openGraph: seo.ogImage ? { images: [seo.ogImage] } : undefined,
      };
    }
  } catch {}
  return {
    title: 'TalosPrimes — Gestion d\'entreprise automatisée',
    description: 'CRM, facturation, comptabilité, RH, BTP et agent IA vocal. 190+ workflows automatisés.',
  };
}
