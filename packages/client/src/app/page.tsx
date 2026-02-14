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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-slate-500 text-sm">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">
      {showToast && <Toast type={toastType} message={toastMessage} onClose={() => setShowToast(false)} />}

      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-900 font-medium">
            <Workflow className="w-6 h-6 text-slate-700" strokeWidth={1.5} />
            <span>{content.footer_company_name || 'TalosPrimes'}</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-slate-500 text-sm hover:text-slate-900 transition">Fonctionnalités</a>
            <a href="#testimonials" className="text-slate-500 text-sm hover:text-slate-900 transition">Témoignages</a>
            <a href="#contact" className="text-slate-500 text-sm hover:text-slate-900 transition">Contact</a>
            <Link href="/login" className="text-slate-500 text-sm hover:text-slate-900 transition">Connexion</Link>
            <Link href="/inscription" className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition">
              {content.hero_cta_primary || 'Essayer'}
            </Link>
          </div>
        </nav>
      </header>

      <section className="pt-24 pb-16 px-6 border-b border-slate-100">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium text-slate-900 tracking-tight leading-tight mb-5">
            {content.hero_title || 'Automatisez votre gestion d\'entreprise'}
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
            {content.hero_subtitle || 'CRM, facturation et automatisation dans une seule plateforme.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/inscription" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition">
              {content.hero_cta_primary || 'Essayer'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-300 text-slate-600 text-sm font-medium rounded-md hover:bg-slate-50 transition">
              {content.hero_cta_secondary || 'Découvrir'}
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>
          <div className="mt-14 pt-10 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-lg mx-auto">
            <div>
              <div className="text-xl font-medium text-slate-900">{content.stats_1_value || '95%'}</div>
              <div className="text-xs text-slate-500 mt-1">{content.stats_1_label || 'Gain de temps'}</div>
            </div>
            <div>
              <div className="text-xl font-medium text-slate-900">{content.stats_2_value || '24/7'}</div>
              <div className="text-xs text-slate-500 mt-1">{content.stats_2_label || 'Automatisation'}</div>
            </div>
            <div>
              <div className="text-xl font-medium text-slate-900">{content.stats_3_value || '100%'}</div>
              <div className="text-xs text-slate-500 mt-1">{content.stats_3_label || 'Satisfaction'}</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 px-6 bg-slate-50/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-medium text-slate-900 tracking-tight mb-2">Tout ce dont vous avez besoin</h2>
            <p className="text-slate-600 text-sm max-w-md mx-auto">Une plateforme pour piloter et automatiser votre activité.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Users, title: content.feature_1_title || 'CRM intelligent', desc: content.feature_1_desc },
              { icon: FileText, title: content.feature_2_title || 'Facturation automatisée', desc: content.feature_2_desc },
              { icon: Zap, title: content.feature_3_title || 'Workflows n8n', desc: content.feature_3_desc },
              { icon: TrendingUp, title: content.feature_4_title || 'Gestion d\'équipe', desc: content.feature_4_desc },
              { icon: CheckCircle, title: content.feature_5_title || 'Modules adaptables', desc: content.feature_5_desc },
              { icon: Shield, title: content.feature_6_title || 'Sécurité & conformité', desc: content.feature_6_desc },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-lg border border-slate-200 bg-white">
                <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center mb-3">
                  <item.icon className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-medium text-slate-900 mb-1.5">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 px-6 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-medium text-slate-900 tracking-tight mb-2">Ils nous font confiance</h2>
            <p className="text-slate-600 text-sm">Ce que nos clients disent de TalosPrimes.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.id} className="p-5 rounded-lg border border-slate-200 bg-slate-50/30">
                <div className="flex gap-1 mb-2">
                  {[...Array(t.note)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-slate-400 fill-slate-400" />
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-3">"{t.commentaire}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs">
                    {t.avatar || `${t.prenom[0]}${t.nom[0]}`}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 text-xs">{t.prenom} {t.nom}</div>
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

      <section id="contact" className="py-16 px-6 bg-slate-50/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-medium text-slate-900 tracking-tight mb-2">Contactez-nous</h2>
            <p className="text-slate-600 text-sm">Une question ? Nous vous répondons.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <form onSubmit={handleContactSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Prénom *"
                  required
                  value={contactForm.prenom}
                  onChange={(e) => setContactForm({ ...contactForm, prenom: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-md text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                />
                <input
                  type="text"
                  placeholder="Nom *"
                  required
                  value={contactForm.nom}
                  onChange={(e) => setContactForm({ ...contactForm, nom: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-md text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
                />
              </div>
              <input
                type="email"
                placeholder="Email *"
                required
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              />
              <input
                type="tel"
                placeholder="Téléphone"
                value={contactForm.telephone}
                onChange={(e) => setContactForm({ ...contactForm, telephone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              />
              <input
                type="text"
                placeholder="Entreprise"
                value={contactForm.entreprise}
                onChange={(e) => setContactForm({ ...contactForm, entreprise: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              />
              <textarea
                placeholder="Message *"
                required
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 resize-none"
              />
              <button
                type="submit"
                disabled={contactStatus === 'sending'}
                className="w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition disabled:opacity-50"
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
            <div className="space-y-3">
              <div className="flex gap-3 p-3 rounded-md border border-slate-200">
                <Mail className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-900 text-xs">Email</div>
                  <p className="text-slate-600 text-sm">{content.config_contact_email || 'contact@talosprimes.com'}</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-md border border-slate-200">
                <Phone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-900 text-xs">Téléphone</div>
                  <p className="text-slate-600 text-sm">{content.config_contact_phone || '+33 1 23 45 67 89'}</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 rounded-md border border-slate-200">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-900 text-xs">Adresse</div>
                  <p className="text-slate-600 text-sm whitespace-pre-line">{content.config_contact_address || '123 Avenue de la Tech\n75001 Paris'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-6 bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-medium text-white mb-3">
            {content.cta_section_title || 'Prêt à simplifier votre gestion ?'}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {content.cta_section_subtitle || 'Rejoignez les entreprises qui automatisent leur quotidien.'}
          </p>
          <Link href="/inscription" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 text-sm font-medium rounded-md hover:bg-slate-100 transition">
            Commencer
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Workflow className="w-5 h-5 text-slate-500" />
                <span className="font-medium text-slate-300">{content.footer_company_name || 'TalosPrimes'}</span>
              </div>
              <p className="text-xs text-slate-500">{content.footer_company_desc || 'Plateforme de gestion.'}</p>
            </div>
            <div>
              <h3 className="font-medium text-slate-300 text-xs mb-2">Produit</h3>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#features" className="hover:text-slate-200 transition">Fonctionnalités</a></li>
                <li><a href="#testimonials" className="hover:text-slate-200 transition">Témoignages</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-slate-300 text-xs mb-2">Légal</h3>
              <ul className="space-y-1.5 text-xs">
                <li><Link href="/mentions-legales" className="hover:text-slate-200 transition">Mentions légales</Link></li>
                <li><Link href="/cgu" className="hover:text-slate-200 transition">CGU</Link></li>
                <li><Link href="/cgv" className="hover:text-slate-200 transition">CGV</Link></li>
                <li><Link href="/confidentialite" className="hover:text-slate-200 transition">Confidentialité</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-slate-300 text-xs mb-2">Support</h3>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#contact" className="hover:text-slate-200 transition">Contact</a></li>
                <li><Link href="/login" className="hover:text-slate-200 transition">Connexion</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} {content.footer_company_name || 'TalosPrimes'}. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
