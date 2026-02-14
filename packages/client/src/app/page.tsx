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
} from 'lucide-react';
import { Toast } from '@/components/Toast';

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
        setToastMessage('Erreur lors de l\'envoi. Veuillez réessayer.');
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30 text-slate-800 antialiased">
      {showToast && <Toast type={toastType} message={toastMessage} onClose={() => setShowToast(false)} />}

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-800 font-semibold">
            <Workflow className="w-7 h-7 text-indigo-600" strokeWidth={1.8} />
            <span>{content.footer_company_name || 'TalosPrimes'}</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-indigo-600 text-sm font-medium transition">
              Fonctionnalités
            </a>
            <a href="#testimonials" className="text-slate-600 hover:text-indigo-600 text-sm font-medium transition">
              Témoignages
            </a>
            <a href="#contact" className="text-slate-600 hover:text-indigo-600 text-sm font-medium transition">
              Contact
            </a>
            <Link href="/login" className="text-slate-600 hover:text-indigo-600 text-sm font-medium transition">
              Connexion
            </Link>
            <Link
              href="/inscription"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              {content.hero_cta_primary || 'Essayer'}
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-20 px-6 bg-gradient-to-b from-indigo-50/70 to-slate-50 border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-slate-900 tracking-tight leading-[1.15] mb-6">
            {content.hero_title || 'Automatisez votre gestion d\'entreprise'}
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
            {content.hero_subtitle || 'CRM, facturation et automatisation dans une seule plateforme. Simple, clair, efficace.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/inscription"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              {content.hero_cta_primary || 'Essayer'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition"
            >
              {content.hero_cta_secondary || 'Découvrir'}
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>
          {/* Stats */}
          <div className="mt-16 pt-12 border-t border-indigo-100 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-2xl font-semibold text-indigo-700">{content.stats_1_value || '95%'}</div>
              <div className="text-sm text-slate-500 mt-0.5">{content.stats_1_label || 'Gain de temps'}</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-indigo-700">{content.stats_2_value || '24/7'}</div>
              <div className="text-sm text-slate-500 mt-0.5">{content.stats_2_label || 'Automatisation'}</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-indigo-700">{content.stats_3_value || '100%'}</div>
              <div className="text-sm text-slate-500 mt-0.5">{content.stats_3_label || 'Satisfaction'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-3">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              Une plateforme complète pour piloter et automatiser votre activité.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: content.feature_1_title || 'CRM intelligent', desc: content.feature_1_desc },
              { icon: FileText, title: content.feature_2_title || 'Facturation automatisée', desc: content.feature_2_desc },
              { icon: Zap, title: content.feature_3_title || 'Workflows n8n', desc: content.feature_3_desc },
              { icon: TrendingUp, title: content.feature_4_title || 'Gestion d\'équipe', desc: content.feature_4_desc },
              { icon: CheckCircle, title: content.feature_5_title || 'Modules adaptables', desc: content.feature_5_desc },
              { icon: Shield, title: content.feature_6_title || 'Sécurité & conformité', desc: content.feature_6_desc },
            ].map((item, i) => (
              <div
                key={i}
                className="group p-6 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md transition"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition">
                  <item.icon className="w-5 h-5 text-indigo-600" strokeWidth={1.6} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section id="testimonials" className="py-20 px-6 bg-indigo-50/40 border-y border-slate-200/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-3">
              Ils nous font confiance
            </h2>
            <p className="text-slate-600 text-lg">Ce que nos clients disent de TalosPrimes.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.id} className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  {[...Array(t.note)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-4">"{t.commentaire}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm">
                    {t.avatar || `${t.prenom[0]}${t.nom[0]}`}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 text-sm">{t.prenom} {t.nom}</div>
                    {(t.poste || t.entreprise) && (
                      <div className="text-xs text-slate-500">{[t.poste, t.entreprise].filter(Boolean).join(' · ')}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact — formulaire + infos */}
      <section id="contact" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-3">
              Contactez-nous
            </h2>
            <p className="text-slate-600">Une question ? Nous vous répondons rapidement.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Prénom *"
                  required
                  value={contactForm.prenom}
                  onChange={(e) => setContactForm({ ...contactForm, prenom: e.target.value })}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                />
                <input
                  type="text"
                  placeholder="Nom *"
                  required
                  value={contactForm.nom}
                  onChange={(e) => setContactForm({ ...contactForm, nom: e.target.value })}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                />
              </div>
              <input
                type="email"
                placeholder="Email *"
                required
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={contactForm.telephone}
                onChange={(e) => setContactForm({ ...contactForm, telephone: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
              <input
                type="text"
                placeholder="Entreprise"
                value={contactForm.entreprise}
                onChange={(e) => setContactForm({ ...contactForm, entreprise: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
              <textarea
                placeholder="Message *"
                required
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
              />
              <button
                type="submit"
                disabled={contactStatus === 'sending'}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {contactStatus === 'sending' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Envoi...
                  </span>
                ) : (
                  'Envoyer'
                )}
              </button>
            </form>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <Mail className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-900 text-sm">Email</div>
                  <p className="text-slate-600 text-sm">{content.config_contact_email || 'contact@talosprimes.com'}</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <Phone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-900 text-sm">Téléphone</div>
                  <p className="text-slate-600 text-sm">{content.config_contact_phone || '+33 1 23 45 67 89'}</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <MapPin className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-900 text-sm">Adresse</div>
                  <p className="text-slate-600 text-sm whitespace-pre-line">{content.config_contact_address || '123 Avenue de la Tech\n75001 Paris'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 px-6 bg-indigo-700 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
            {content.cta_section_title || 'Prêt à simplifier votre gestion ?'}
          </h2>
          <p className="text-indigo-100 mb-8">
            {content.cta_section_subtitle || 'Rejoignez les entreprises qui automatisent leur quotidien.'}
          </p>
          <Link
            href="/inscription"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-medium rounded-lg hover:bg-indigo-50 transition"
          >
            Commencer
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Workflow className="w-6 h-6 text-indigo-400" />
                <span className="font-semibold text-white">{content.footer_company_name || 'TalosPrimes'}</span>
              </div>
              <p className="text-sm text-slate-400">{content.footer_company_desc || 'Plateforme de gestion intelligente.'}</p>
            </div>
            <div>
              <h3 className="font-medium text-white text-sm mb-3">Produit</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Fonctionnalités</a></li>
                <li><a href="#testimonials" className="hover:text-white transition">Témoignages</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-white text-sm mb-3">Légal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/mentions-legales" className="hover:text-white transition">Mentions légales</Link></li>
                <li><Link href="/cgu" className="hover:text-white transition">CGU</Link></li>
                <li><Link href="/cgv" className="hover:text-white transition">CGV</Link></li>
                <li><Link href="/confidentialite" className="hover:text-white transition">Confidentialité</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-white text-sm mb-3">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#contact" className="hover:text-white transition">Contact</a></li>
                <li><Link href="/login" className="hover:text-white transition">Connexion</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} {content.footer_company_name || 'TalosPrimes'}. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
