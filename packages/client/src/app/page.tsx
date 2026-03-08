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
} from '@/components/landing/sections';

// ─── Types ───
interface LandingSection {
  id: string;
  type: string;
  titre: string | null;
  config: any;
  ordre: number;
  actif: boolean;
}

interface GlobalConfig {
  navbar?: any;
  footer?: any;
  seo?: any;
  theme?: any;
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

// ─── Data fetching côté serveur (ISR: revalidate toutes les 5 min) ───
const SERVER_API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function getSections(): Promise<LandingSection[]> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/sections`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(`[SSR] landing/sections failed: ${res.status}`);
      return [];
    }
    return res.json();
  } catch (err) {
    console.error('[SSR] landing/sections error:', err);
    return [];
  }
}

async function getGlobalConfig(): Promise<GlobalConfig> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/global-config`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(`[SSR] landing/global-config failed: ${res.status}`);
      return {};
    }
    return res.json();
  } catch (err) {
    console.error('[SSR] landing/global-config error:', err);
    return {};
  }
}

async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/testimonials`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// Fallback : lire l'ancien contenu (compatibilité pendant la migration)
async function getLandingContent(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/content`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

// ─── Section Renderer ───
function renderSection(
  section: LandingSection,
  { testimonials, theme, contactInfo }: {
    testimonials: Testimonial[];
    theme?: any;
    contactInfo?: any;
  }
) {
  const { type, config, id } = section;

  switch (type) {
    case 'hero':
      return <HeroSection key={id} config={config} theme={theme} />;
    case 'stats':
      return <StatsSection key={id} config={config} theme={theme} />;
    case 'trust_badges':
      return <TrustBadgesSection key={id} config={config} theme={theme} />;
    case 'modules':
      return <ModulesSection key={id} config={config} theme={theme} />;
    case 'agent_ia':
      return <AgentIASection key={id} config={config} theme={theme} />;
    case 'upcoming':
      return <UpcomingSection key={id} config={config} theme={theme} />;
    case 'how_it_works':
      return <HowItWorksSection key={id} config={config} theme={theme} />;
    case 'testimonials':
      return <TestimonialsSection key={id} config={config} testimonials={testimonials} theme={theme} />;
    case 'contact':
      return <ContactSection key={id} config={config} contactInfo={contactInfo} theme={theme} />;
    case 'cta':
      return <CTASection key={id} config={config} theme={theme} />;
    case 'custom_html':
      return <CustomHTMLSection key={id} config={config} />;
    default:
      return null;
  }
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
