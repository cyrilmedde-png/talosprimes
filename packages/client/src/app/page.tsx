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

async function getSections(): Promise<LandingSection[]> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/sections`, {
      cache: 'no-store',
    });
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

async function getGlobalConfig(): Promise<GlobalConfig> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/global-config`, {
      cache: 'no-store',
    });
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

async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/testimonials`, {
      cache: 'no-store',
    });
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
  const [sections, globalConfig, testimonials, content] = await Promise.all([
    getSections(),
    getGlobalConfig(),
    getTestimonials(),
    getLandingContent(),
  ]);

  const theme = globalConfig.theme;
  const contactInfo = {
    email: content.config_contact_email,
    phone: content.config_contact_phone,
    address: content.config_contact_address,
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">
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
    const globalConfig = await getGlobalConfig();
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
