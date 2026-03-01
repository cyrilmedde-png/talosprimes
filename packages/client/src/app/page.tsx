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
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001';

async function getLandingContent(): Promise<LandingContent> {
  try {
    const res = await fetch(`${API_URL}/api/landing/content`, {
      next: { revalidate: 300 }, // 5 min ISR
    });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${API_URL}/api/landing/testimonials`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
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

// ─── Page (Server Component — rendu côté serveur, zéro JS client pour le contenu) ───
export default async function LandingPage() {
  // Fetch en parallèle côté serveur — l'utilisateur reçoit du HTML prêt à afficher
  const [content, testimonials] = await Promise.all([
    getLandingContent(),
    getTestimonials(),
  ]);

  const primaryLink = linkFor(content, 'hero_cta_primary') || '/inscription';
  const secondaryLink = linkFor(content, 'hero_cta_secondary') || '#features';
  const ctaSectionLink = linkFor(content, 'cta_section_title') || '/inscription';

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">

      {/* ─── HEADER (client: menu mobile toggle) ─── */}
      <LandingHeader
        companyName={content.footer_company_name || 'TalosPrimes'}
        ctaLabel={content.hero_cta_primary || 'Essayer gratuitement'}
        ctaHref={primaryLink}
      />

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 to-white pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-slate-100/60 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Agent IA vocal intégré
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-slate-900 tracking-tight leading-[1.1] mb-6">
            {content.hero_title || "Automatisez votre gestion d'entreprise"}
          </h1>
          <p className="text-slate-500 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            {content.hero_subtitle || 'CRM, facturation et automatisation dans une seule plateforme.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <CtaLink href={primaryLink} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition shadow-sm shadow-slate-900/10">
              {content.hero_cta_primary || 'Essayer gratuitement'}
              <ArrowRight className="w-4 h-4" />
            </CtaLink>
            <CtaLink href={secondaryLink} className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 hover:border-slate-300 transition">
              {content.hero_cta_secondary || 'Découvrir'}
              <ChevronDown className="w-4 h-4" />
            </CtaLink>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto">
            {[
              { value: content.stats_1_value || '95%', label: content.stats_1_label || 'Gain de temps' },
              { value: content.stats_2_value || '24/7', label: content.stats_2_label || 'Automatisation' },
              { value: content.stats_3_value || '100%', label: content.stats_3_label || 'Satisfaction' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-semibold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 px-6 bg-slate-50/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">Tout ce dont vous avez besoin</h2>
            <p className="text-slate-500 text-base max-w-lg mx-auto">Une plateforme complète pour piloter et automatiser votre activité au quotidien.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Users, title: content.feature_1_title || 'CRM intelligent', desc: content.feature_1_desc || 'Gérez vos contacts, leads et clients depuis une interface unique.' },
              { icon: FileText, title: content.feature_2_title || 'Facturation automatisée', desc: content.feature_2_desc || 'Devis, factures et bons de commande générés automatiquement.' },
              { icon: Zap, title: content.feature_3_title || 'Workflows n8n', desc: content.feature_3_desc || 'Automatisez vos processus métier sans écrire de code.' },
              { icon: TrendingUp, title: content.feature_4_title || "Gestion d'équipe", desc: content.feature_4_desc || 'Attribuez des rôles et suivez la performance de chacun.' },
              { icon: CheckCircle, title: content.feature_5_title || 'Modules adaptables', desc: content.feature_5_desc || 'Activez uniquement les modules dont vous avez besoin.' },
              { icon: Shield, title: content.feature_6_title || 'Sécurité & conformité', desc: content.feature_6_desc || 'RGPD, chiffrement SSL et sauvegardes quotidiennes.' },
            ].map((item, i) => (
              <div key={i} className="group p-6 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-900 flex items-center justify-center mb-4 transition">
                  <item.icon className="w-5 h-5 text-slate-600 group-hover:text-white transition" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      {testimonials.length > 0 && (
        <section id="testimonials" className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">Ils nous font confiance</h2>
              <p className="text-slate-500 text-base">Ce que nos clients disent de TalosPrimes.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testimonials.map((t) => (
                <div key={t.id} className="p-6 rounded-xl border border-slate-200/80 bg-white hover:shadow-sm transition">
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
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-xs">
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
      <section id="contact" className="py-20 px-6 bg-slate-50/60">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">Contactez-nous</h2>
            <p className="text-slate-500 text-base">Une question ? Notre équipe vous répond rapidement.</p>
          </div>
          <div className="grid md:grid-cols-5 gap-8">
            {/* Form (client component) - 3 cols */}
            <LandingContactForm className="md:col-span-3 space-y-3" />
            {/* Info - 2 cols */}
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
              {/* Mini CTA rappel */}
              <div className="p-4 rounded-xl bg-slate-900 text-white">
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
      <section className="py-16 px-6 bg-slate-900">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-4">
            {content.cta_section_title || 'Prêt à simplifier votre gestion ?'}
          </h2>
          <p className="text-slate-400 text-base mb-8 max-w-lg mx-auto">
            {content.cta_section_subtitle || 'Rejoignez les entreprises qui automatisent leur quotidien avec TalosPrimes.'}
          </p>
          <CtaLink href={ctaSectionLink} className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-100 transition shadow-sm">
            Commencer gratuitement
            <ArrowRight className="w-4 h-4" />
          </CtaLink>
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
                <li><a href="#features" className="hover:text-slate-200 transition">Fonctionnalités</a></li>
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
