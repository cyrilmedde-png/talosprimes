import Link from 'next/link';
import {
  ArrowRight,
  Star,
  CheckCircle,
  Zap,
  Shield,
  Users,
  TrendingUp,
  FileText,
  Workflow,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  Sparkles,
  Calculator,
  HardHat,
  Bot,
  Bell,
  UserCheck,
  Briefcase,
  ClipboardList,
  CreditCard,
  Globe,
  Smartphone,
  BarChart3,
  PenTool,
  Receipt,
  BookOpen,
  Headphones,
  MessageSquare,
  PhoneCall,
  Brain,
  Calendar,
  BadgeCheck,
  Banknote,
  Landmark,
  Lock,
  Layers,
} from 'lucide-react';
import { LandingContactForm } from '@/components/landing/LandingContactForm';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { CallbackBubble } from '@/components/CallbackBubble';

// ─── Types ───
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

type LandingContent = Record<string, string>;

// ─── Data fetching côté serveur (ISR: revalidate toutes les 5 min) ───
const SERVER_API = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function getLandingContent(): Promise<LandingContent> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/content`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(`[SSR] landing/content failed: ${res.status} ${res.statusText}`);
      return {};
    }
    return res.json();
  } catch (err) {
    console.error('[SSR] landing/content error:', err);
    return {};
  }
}

async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${SERVER_API}/api/landing/testimonials`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(`[SSR] landing/testimonials failed: ${res.status} ${res.statusText}`);
      return [];
    }
    return res.json();
  } catch (err) {
    console.error('[SSR] landing/testimonials error:', err);
    return [];
  }
}

// ─── Helpers ───
function linkFor(content: LandingContent, key: string) {
  return (content[`${key}_lien`] ?? '').trim();
}

function CtaLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const isExternal = href.startsWith('http') || href.startsWith('//');
  return isExternal ? (
    <a href={href} className={className}>{children}</a>
  ) : (
    <Link href={href} className={className}>{children}</Link>
  );
}

// ─── Données des modules ───
const modules = [
  {
    icon: FileText,
    title: 'Facturation complète',
    desc: 'Factures, devis, avoirs, proformas et bons de commande. Génération PDF automatique, numérotation séquentielle et suivi des paiements.',
    features: ['Factures & Avoirs', 'Devis & Proformas', 'Bons de commande', 'OCR intelligent', 'Paiement Stripe'],
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Calculator,
    title: 'Comptabilité intégrée',
    desc: 'Plan comptable OHADA/français, écritures automatiques, lettrage, rapprochement bancaire et déclarations TVA.',
    features: ['Plan comptable', 'Écritures automatiques', 'Rapprochement bancaire', 'Déclarations TVA', 'Immobilisations & amortissements'],
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: Users,
    title: 'CRM & Leads',
    desc: 'Gestion complète du pipeline commercial : leads, conversion en clients, suivi des contacts et historique des interactions.',
    features: ['Pipeline de leads', 'Conversion automatique', 'Fiches clients', 'Historique complet', 'Notifications temps réel'],
    color: 'from-violet-500 to-violet-600',
  },
  {
    icon: Bot,
    title: 'Agent IA vocal & texte',
    desc: 'Assistant intelligent disponible 24/7 sur Telegram (vocal + texte), téléphonie entrante/sortante via Twilio et campagnes SMS.',
    features: ['Telegram vocal & texte', 'Téléphonie Twilio', 'Campagnes SMS', 'Base de connaissances', 'Calendrier IA'],
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: UserCheck,
    title: 'Ressources Humaines',
    desc: '8 modules RH complets : contrats, bulletins de paie, congés, documents, entretiens, formations, inscriptions et évaluations.',
    features: ['Contrats de travail', 'Bulletins de paie', 'Gestion des congés', 'Formations & évaluations', 'Documents RH'],
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: HardHat,
    title: 'BTP & Chantiers',
    desc: 'Module spécialisé pour le bâtiment : suivi de chantiers, situations de travaux, gestion des équipes terrain.',
    features: ['Fiches chantier', 'Situations de travaux', 'Suivi financier', 'Équipes terrain', 'Documents chantier'],
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: Briefcase,
    title: 'Gestion de projets',
    desc: 'Créez des projets, assignez des tâches, suivez l\'avancement et collaborez efficacement avec votre équipe.',
    features: ['Projets & tâches', 'Assignation d\'équipe', 'Suivi d\'avancement', 'Deadlines & priorités', 'Vue tableau'],
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: ClipboardList,
    title: 'Gestion d\'équipe',
    desc: 'Gérez vos collaborateurs, pointages, absences et plannings. Visibilité totale sur l\'activité de votre équipe.',
    features: ['Membres & rôles', 'Pointages', 'Absences & congés', 'Plannings', 'Performance'],
    color: 'from-teal-500 to-emerald-500',
  },
  {
    icon: Zap,
    title: '190+ Workflows automatisés',
    desc: 'Moteur n8n intégré avec 190+ workflows prêts à l\'emploi : onboarding, relances, notifications, rapports automatiques.',
    features: ['Onboarding auto', 'Relances impayés', 'Notifications Telegram', 'Rapports automatiques', 'Webhooks temps réel'],
    color: 'from-yellow-500 to-amber-500',
  },
  {
    icon: Shield,
    title: 'Sécurité & RGPD',
    desc: 'Conformité RGPD native, registre des consentements, droit à l\'effacement, journalisation et chiffrement SSL.',
    features: ['Conformité RGPD', 'Registre consentements', 'Droit à l\'effacement', 'Logs d\'audit', 'Chiffrement SSL'],
    color: 'from-slate-500 to-slate-600',
  },
];

const upcomingFeatures = [
  { icon: Receipt, title: 'Factur-X / e-invoicing', desc: 'Facturation électronique conforme aux normes européennes 2026.' },
  { icon: PenTool, title: 'Signature électronique', desc: 'Signez vos devis et contrats directement depuis la plateforme.' },
  { icon: Smartphone, title: 'Application mobile', desc: 'Accédez à toutes vos données en déplacement depuis iOS et Android.' },
  { icon: Globe, title: 'Multi-devises', desc: 'Facturez dans la devise de vos clients internationaux.' },
  { icon: BarChart3, title: 'Analytics avancé', desc: 'Tableaux de bord personnalisables et rapports BI intégrés.' },
  { icon: Banknote, title: 'Intégration Qonto', desc: 'Synchronisation bancaire automatique avec votre compte Qonto.' },
];

// ─── Page ───
export default async function LandingPage() {
  const [content, testimonials] = await Promise.all([
    getLandingContent(),
    getTestimonials(),
  ]);

  const primaryLink = linkFor(content, 'hero_cta_primary') || '/inscription';
  const secondaryLink = linkFor(content, 'hero_cta_secondary') || '#services';
  const ctaSectionLink = linkFor(content, 'cta_section_title') || '/inscription';

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">

      {/* ─── HEADER ─── */}
      <LandingHeader
        companyName={content.footer_company_name || 'TalosPrimes'}
        ctaLabel={content.hero_cta_primary || 'Essayer gratuitement'}
        ctaHref={primaryLink}
      />

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 to-white pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-gradient-to-br from-blue-50/40 via-violet-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 text-amber-700 text-xs font-medium mb-8">
            <Bot className="w-3.5 h-3.5" />
            Agent IA vocal intégré — disponible 24/7
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.08] mb-6">
            {content.hero_title || (
              <>La plateforme <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">tout-en-un</span> pour piloter votre entreprise</>
            )}
          </h1>
          <p className="text-slate-500 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            {content.hero_subtitle || 'Facturation, comptabilité, CRM, RH, BTP, agent IA et 190+ automatisations — tout dans une seule plateforme.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <CtaLink href={primaryLink} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
              {content.hero_cta_primary || 'Essayer gratuitement'}
              <ArrowRight className="w-4 h-4" />
            </CtaLink>
            <CtaLink href={secondaryLink} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition">
              {content.hero_cta_secondary || 'Découvrir les services'}
              <ChevronDown className="w-4 h-4" />
            </CtaLink>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {[
              { value: content.stats_1_value || '10+', label: content.stats_1_label || 'Modules métier' },
              { value: content.stats_2_value || '190+', label: content.stats_2_label || 'Workflows automatisés' },
              { value: content.stats_3_value || '24/7', label: content.stats_3_label || 'Agent IA disponible' },
              { value: '100%', label: 'Conforme RGPD' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BANDE DE CONFIANCE ─── */}
      <section className="py-6 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-slate-400">
            <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> SSL/HTTPS</span>
            <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> RGPD natif</span>
            <span className="flex items-center gap-2"><Landmark className="w-4 h-4" /> Hébergé en France</span>
            <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Paiement Stripe</span>
            <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> Multi-tenant</span>
          </div>
        </div>
      </section>

      {/* ─── SERVICES / MODULES ─── */}
      <section id="services" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              10 modules intégrés
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              {content.features_title || 'Tous vos outils métier, une seule plateforme'}
            </h2>
            <p className="text-slate-500 text-base max-w-xl mx-auto">
              {content.features_subtitle || 'Activez uniquement les modules dont vous avez besoin. Tarification à la carte, sans engagement.'}
            </p>
          </div>

          {/* Grid des modules */}
          <div className="grid md:grid-cols-2 gap-5">
            {modules.map((mod, i) => (
              <div key={i} className="group relative p-6 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0 shadow-sm`}>
                    <mod.icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1.5">{mod.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-3">{mod.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {mod.features.map((f, j) => (
                        <span key={j} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-medium">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AGENT IA (section dédiée) ─── */}
      <section className="py-24 px-6 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium mb-6">
                <Brain className="w-3.5 h-3.5" />
                Intelligence Artificielle
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5 leading-tight">
                Votre assistant IA,<br />
                <span className="text-amber-400">disponible 24h/24</span>
              </h2>
              <p className="text-slate-400 text-base leading-relaxed mb-8">
                Notre agent IA comprend le contexte de votre entreprise, répond à vos clients par téléphone et Telegram,
                prend des rendez-vous et envoie des notifications en temps réel.
              </p>
              <div className="space-y-3">
                {[
                  { icon: MessageSquare, text: 'Telegram vocal & texte — réponses instantanées' },
                  { icon: PhoneCall, text: 'Téléphonie entrante & sortante via Twilio' },
                  { icon: Mail, text: 'Campagnes SMS personnalisées' },
                  { icon: BookOpen, text: 'Base de connaissances personnalisable' },
                  { icon: Calendar, text: 'Prise de RDV automatique Google Calendar' },
                  { icon: Bell, text: 'Notifications Telegram temps réel' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-slate-300 text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Illustration card */}
            <div className="relative">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="space-y-4">
                  {/* Simulated chat */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="bg-white/10 rounded-xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-300 max-w-xs">
                      Bonjour, je souhaiterais un devis pour une installation complète.
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="bg-amber-500/20 rounded-xl rounded-tr-sm px-4 py-2.5 text-sm text-amber-100 max-w-xs">
                      Bien sûr ! Je vais vous mettre en relation avec notre commercial. Quand êtes-vous disponible cette semaine ?
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="bg-white/10 rounded-xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-300 max-w-xs">
                      Jeudi à 14h, c&apos;est possible ?
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="bg-amber-500/20 rounded-xl rounded-tr-sm px-4 py-2.5 text-sm text-amber-100 max-w-xs">
                      Parfait ! RDV confirmé jeudi à 14h. Vous recevrez une confirmation par email. 📅
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Agent IA actif — temps de réponse &lt; 2s
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BIENTÔT DISPONIBLE ─── */}
      <section className="py-24 px-6 bg-slate-50/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-medium mb-4">
              <TrendingUp className="w-3.5 h-3.5" />
              Roadmap 2026
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">Bientôt disponible</h2>
            <p className="text-slate-500 text-base max-w-lg mx-auto">
              Nous travaillons continuellement pour enrichir la plateforme avec de nouvelles fonctionnalités.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingFeatures.map((item, i) => (
              <div key={i} className="group p-5 rounded-xl border border-dashed border-slate-300/80 bg-white/60 hover:border-violet-300 hover:bg-white transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center shrink-0 transition">
                    <item.icon className="w-5 h-5 text-violet-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMMENT ÇA MARCHE ─── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">Démarrez en 3 étapes</h2>
            <p className="text-slate-500 text-base max-w-lg mx-auto">Simple, rapide et sans engagement.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Inscrivez-vous', desc: 'Créez votre espace en quelques clics. Période d\'essai gratuite incluse.', icon: BadgeCheck },
              { step: '02', title: 'Configurez vos modules', desc: 'Activez uniquement les modules dont vous avez besoin : facturation, comptabilité, RH, BTP…', icon: Layers },
              { step: '03', title: 'Automatisez & pilotez', desc: 'Laissez les 190+ workflows gérer le quotidien. Concentrez-vous sur votre métier.', icon: Zap },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
                  <item.icon className="w-7 h-7 text-slate-600" strokeWidth={1.5} />
                </div>
                <div className="text-xs font-bold text-slate-300 mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      {testimonials.length > 0 && (
        <section id="testimonials" className="py-24 px-6 bg-slate-50/60">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">Ils nous font confiance</h2>
              <p className="text-slate-500 text-base">Ce que nos clients disent de TalosPrimes.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testimonials.map((t) => (
                <div key={t.id} className="p-6 rounded-2xl border border-slate-200/80 bg-white hover:shadow-md transition-all duration-300">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < t.note ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
                      />
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">&ldquo;{t.commentaire}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
                      {t.avatar || `${t.prenom[0]}${t.nom[0]}`}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 text-sm">{t.prenom} {t.nom}</div>
                      {(t.poste || t.entreprise) && (
                        <div className="text-xs text-slate-400">{[t.poste, t.entreprise].filter(Boolean).join(' · ')}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CONTACT ─── */}
      <section id="contact" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">Contactez-nous</h2>
            <p className="text-slate-500 text-base">Une question ? Notre équipe vous répond rapidement.</p>
          </div>
          <div className="grid md:grid-cols-5 gap-8">
            <LandingContactForm className="md:col-span-3 space-y-3" />
            <div className="md:col-span-2 space-y-3">
              <div className="flex gap-4 p-4 rounded-xl border border-slate-200/80 bg-white">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 text-sm">Email</div>
                  <p className="text-slate-500 text-sm mt-0.5">{content.config_contact_email || 'contact@talosprimes.com'}</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-xl border border-slate-200/80 bg-white">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 text-sm">Téléphone</div>
                  <p className="text-slate-500 text-sm mt-0.5">{content.config_contact_phone || '+33 1 23 45 67 89'}</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-xl border border-slate-200/80 bg-white">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 text-sm">Adresse</div>
                  <p className="text-slate-500 text-sm mt-0.5 whitespace-pre-line">{content.config_contact_address || '123 Avenue de la Tech\n75001 Paris'}</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium">Rappel IA immédiat</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Cliquez sur la bulle en bas à droite pour être rappelé instantanément par notre agent IA.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="py-20 px-6 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            {content.cta_section_title || 'Prêt à simplifier votre gestion ?'}
          </h2>
          <p className="text-slate-400 text-base mb-8 max-w-lg mx-auto">
            {content.cta_section_subtitle || 'Rejoignez les entreprises qui automatisent leur quotidien avec TalosPrimes.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <CtaLink href={ctaSectionLink} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-slate-900 text-sm font-medium rounded-xl hover:bg-slate-100 transition shadow-lg">
              Commencer gratuitement
              <ArrowRight className="w-4 h-4" />
            </CtaLink>
            <CtaLink href="#contact" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-800 transition">
              <Headphones className="w-4 h-4" />
              Parler à un conseiller
            </CtaLink>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center">
                  <Workflow className="w-4 h-4 text-slate-400" />
                </div>
                <span className="font-semibold text-slate-200">{content.footer_company_name || 'TalosPrimes'}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{content.footer_company_desc || "Plateforme de gestion d'entreprise automatisée."}</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-3">Produit</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#services" className="hover:text-slate-200 transition">Services</a></li>
                <li><Link href="/page/tarifs" className="hover:text-slate-200 transition">Tarifs</Link></li>
                <li><a href="#testimonials" className="hover:text-slate-200 transition">Témoignages</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-3">Légal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/mentions-legales" className="hover:text-slate-200 transition">Mentions légales</Link></li>
                <li><Link href="/cgu" className="hover:text-slate-200 transition">CGU</Link></li>
                <li><Link href="/cgv" className="hover:text-slate-200 transition">CGV</Link></li>
                <li><Link href="/confidentialite" className="hover:text-slate-200 transition">Confidentialité & RGPD</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-300 text-xs uppercase tracking-wider mb-3">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#contact" className="hover:text-slate-200 transition">Contact</a></li>
                <li><Link href="/login" className="hover:text-slate-200 transition">Connexion</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>&copy; {new Date().getFullYear()} {content.footer_company_name || 'TalosPrimes'}. Tous droits réservés.</span>
            <div className="flex gap-4">
              <Link href="/mentions-legales" className="hover:text-slate-300 transition">Mentions légales</Link>
              <Link href="/confidentialite" className="hover:text-slate-300 transition">Confidentialité</Link>
              <Link href="/cgv" className="hover:text-slate-300 transition">CGV</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── BULLE RAPPEL IA ─── */}
      <CallbackBubble />
    </div>
  );
}
