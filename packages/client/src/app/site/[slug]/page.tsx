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

interface ThemeConfig extends JsonRecord {
  primaryColor?: string;
  secondaryColor?: string;
}

interface GlobalConfig {
  navbar?: NavbarConfig;
  footer?: FooterConfig;
  seo?: { metaTitle?: string; metaDescription?: string; ogImage?: string };
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

export const dynamic = 'force-dynamic';

const SERVER_API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function getTenantSections(slug: string): Promise<LandingSection[]> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/site/${slug}/sections`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

async function getTenantGlobalConfig(slug: string): Promise<GlobalConfig> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/site/${slug}/global-config`, { cache: 'no-store' });
    if (!res.ok) return {};
    const json = await res.json();
    return json.data || {};
  } catch {
    return {};
  }
}

async function getTenantTestimonials(slug: string): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/site/${slug}/testimonials`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
  } catch {
    return [];
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

  const bgImage = config.backgroundImage as string | undefined;
  const bgColor = config.bgColor as string | undefined;
  const bgOverlay = config.bgOverlay as string | undefined;
  const bgSize = (config.bgSize as string) || 'cover';
  const bgPosition = (config.bgPosition as string) || 'center';
  const hasBg = bgImage || bgColor;

  if (!hasBg) return <div key={id}>{inner}</div>;

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
export default async function TenantLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [sections, globalConfig, testimonials] = await Promise.all([
    getTenantSections(slug),
    getTenantGlobalConfig(slug),
    getTenantTestimonials(slug),
  ]);

  if (sections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Site introuvable</h1>
          <p className="text-slate-500">Ce site n&apos;existe pas ou n&apos;a pas encore été configuré.</p>
        </div>
      </div>
    );
  }

  const theme = globalConfig.theme;

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">
      <DynamicLandingHeader config={globalConfig.navbar} />

      {sections.map((section) =>
        renderSection(section, { testimonials, theme })
      )}

      <DynamicFooter config={globalConfig.footer} />
      <CallbackBubble />
    </div>
  );
}

// ─── Metadata SEO dynamique ───
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const globalConfig = await getTenantGlobalConfig(slug);
    const seo = globalConfig.seo;
    if (seo) {
      return {
        title: seo.metaTitle || `${slug} — Propulsé par TalosPrimes`,
        description: seo.metaDescription || 'Site propulsé par TalosPrimes.',
        openGraph: seo.ogImage ? { images: [seo.ogImage] } : undefined,
      };
    }
  } catch { /* fallback */ }
  return {
    title: `${slug} — Propulsé par TalosPrimes`,
    description: 'Site propulsé par TalosPrimes.',
  };
}
