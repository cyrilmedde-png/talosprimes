'use client';

import { useEffect, useState } from 'react';
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
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { Toast } from '@/components/Toast';
import { CallbackBubble } from '@/components/CallbackBubble';

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

interface LandingContent {
  [key: string]: string;
}

export default function LandingPage() {
  const [content, setContent] = useState<LandingContent>({});
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactForm, setContactForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    entreprise: '',
    message: '',
  });
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content`).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/testimonials`).then((r) => r.json()),
    ])
      .then(([contentData, testimonialsData]) => {
        setContent(contentData);
        setTestimonials(testimonialsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Erreur chargement landing:', err);
        setLoading(false);
      });
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus('sending');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (response.ok) {
        setContactStatus('success');
        setContactForm({ nom: '', prenom: '', email: '', telephone: '', entreprise: '', message: '' });
        setToastType('success');
        setToastMessage('Message envoyé. Nous vous répondrons rapidement.');
        setShowToast(true);
        setTimeout(() => setContactStatus('idle'), 3000);
      } else {
        setContactStatus('error');
        setToastType('error');
        setToastMessage("Erreur lors de l'envoi. Veuillez réessayer.");
        setShowToast(true);
      }
    } catch {
      setContactStatus('error');
      setToastType('error');
      setToastMessage('Erreur de connexion.');
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          Chargement...
        </div>
      </div>
    );
  }

  const linkFor = (key: string) => (content[`${key}_lien`] ?? '').trim();
  const primaryLink = linkFor('hero_cta_primary') || '/inscription';
  const secondaryLink = linkFor('hero_cta_secondary') || '#features';
  const ctaSectionLink = linkFor('cta_section_title') || '/inscription';
  const isExternal = (href: string) => href.startsWith('http') || href.startsWith('//');
  const CtaLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    isExternal(href) ? (
      <a href={href} className={className}>{children}</a>
    ) : (
      <Link href={href} className={className}>{children}</Link>
    );

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">
      {showToast && <Toast type={toastType} message={toastMessage} onClose={() => setShowToast(false)} />}

      {/* ─── HEADER ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-slate-900 font-semibold tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Workflow className="w-4.5 h-4.5 text-white" strokeWidth={2} />
            </div>
            <span className="text-lg">{content.footer_company_name || 'TalosPrimes'}</span>
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <a href="#features" className="px-3 py-2 text-slate-500 text-sm hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">Fonctionnalités</a>
            <Link href="/page/tarifs" className="px-3 py-2 text-slate-500 text-sm hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">Tarifs</Link>
            <a href="#testimonials" className="px-3 py-2 text-slate-500 text-sm hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">Témoignages</a>
            <a href="#contact" className="px-3 py-2 text-slate-500 text-sm hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">Contact</a>
            <div className="w-px h-5 bg-slate-200 mx-2" />
            <Link href="/login" className="px-3 py-2 text-slate-600 text-sm font-medium hover:text-slate-900 rounded-lg hover:bg-slate-50 transition">Connexion</Link>
            <CtaLink href={primaryLink} className="ml-1 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition shadow-sm">
              {content.hero_cta_primary || 'Essayer gratuitement'}
            </CtaLink>
          </div>
          {/* Hamburger mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-1 shadow-xl">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition">Fonctionnalités</a>
            <Link href="/page/tarifs" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition">Tarifs</Link>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition">Témoignages</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition">Contact</a>
            <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition">
                Connexion
              </Link>
              <CtaLink href={primaryLink} className="block w-full text-center px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition">
                {content.hero_cta_primary || 'Essayer gratuitement'}
              </CtaLink>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Fond subtil */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 to-white pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-slate-100/60 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Agent IA vocal intégré
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-slate-900 tracking-tight leading-[1.1] mb-6">
            {content.hero_title || 'Automatisez votre gestion d\'entreprise'}
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
              { icon: TrendingUp, title: content.feature_4_title || 'Gestion d\'équipe', desc: content.feature_4_desc || 'Attribuez des rôles et suivez la performance de chacun.' },
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
            {/* Form - 3 cols */}
            <form onSubmit={handleContactSubmit} className="md:col-span-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Prénom *"
                  required
                  value={contactForm.prenom}
                  onChange={(e) => setContactForm({ ...contactForm, prenom: e.target.value })}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white"
                />
                <input
                  type="text"
                  placeholder="Nom *"
                  required
                  value={contactForm.nom}
                  onChange={(e) => setContactForm({ ...contactForm, nom: e.target.value })}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white"
                />
              </div>
              <input
                type="email"
                placeholder="Email *"
                required
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={contactForm.telephone}
                  onChange={(e) => setContactForm({ ...contactForm, telephone: e.target.value })}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white"
                />
                <input
                  type="text"
                  placeholder="Entreprise"
                  value={contactForm.entreprise}
                  onChange={(e) => setContactForm({ ...contactForm, entreprise: e.target.value })}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white"
                />
              </div>
              <textarea
                placeholder="Votre message *"
                required
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none bg-white"
              />
              <button
                type="submit"
                disabled={contactStatus === 'sending'}
                className="w-full px-4 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition disabled:opacity-50 shadow-sm"
              >
                {contactStatus === 'sending' ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Envoi...
                  </span>
                ) : (
                  'Envoyer le message'
                )}
              </button>
            </form>
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
              <p className="text-xs text-slate-500 leading-relaxed">{content.footer_company_desc || 'Plateforme de gestion d\'entreprise automatisée.'}</p>
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
