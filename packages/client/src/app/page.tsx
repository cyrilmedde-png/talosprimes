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
  MapPin
} from 'lucide-react';
import { Toast } from '@/components/Toast';

// Types
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
    // Charger le contenu et les testimonials
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content`).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/testimonials`).then(r => r.json()),
    ])
      .then(([contentData, testimonialsData]) => {
        setContent(contentData);
        setTestimonials(testimonialsData);
        setLoading(false);
      })
      .catch(err => {
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
        setToastMessage('Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.');
        setShowToast(true);
        setTimeout(() => setContactStatus('idle'), 3000);
      } else {
        setContactStatus('error');
        setToastType('error');
        setToastMessage('Erreur lors de l\'envoi du message. Veuillez réessayer.');
        setShowToast(true);
      }
    } catch (error) {
      setContactStatus('error');
      setToastType('error');
      setToastMessage('Erreur de connexion. Veuillez vérifier votre connexion internet.');
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Toast Notification */}
      {showToast && (
        <Toast
          type={toastType}
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
      {/* Header / Navigation */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Workflow className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                TalosPrimes
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-purple-600 transition">Fonctionnalités</a>
              <a href="#testimonials" className="text-gray-700 hover:text-purple-600 transition">Avis clients</a>
              <a href="#contact" className="text-gray-700 hover:text-purple-600 transition">Contact</a>
              <Link href="/login" className="text-gray-700 hover:text-purple-600 transition">Connexion</Link>
              <Link 
                href="/inscription" 
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition"
              >
                Inscription
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {content.hero_title || 'Automatisez votre gestion d\'entreprise'}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto">
            {content.hero_subtitle || 'La plateforme tout-en-un qui combine CRM, facturation, et automatisation intelligente.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/inscription" 
              className="px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:shadow-2xl transition transform hover:scale-105 flex items-center justify-center"
            >
              {content.hero_cta_primary || 'Essayer gratuitement'}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <a 
              href="#features" 
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition"
            >
              {content.hero_cta_secondary || 'Découvrir la démo'}
            </a>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-4xl font-bold text-white mb-2">{content.stats_1_value || '95%'}</div>
              <div className="text-gray-300">{content.stats_1_label || 'Gain de temps'}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-4xl font-bold text-white mb-2">{content.stats_2_value || '24/7'}</div>
              <div className="text-gray-300">{content.stats_2_label || 'Automatisation'}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-4xl font-bold text-white mb-2">{content.stats_3_value || '100%'}</div>
              <div className="text-gray-300">{content.stats_3_label || 'Satisfaction'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-gray-600">Une plateforme complète pour automatiser votre succès</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition group">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {content.feature_1_title || 'CRM intelligent'}
              </h3>
              <p className="text-gray-600">
                {content.feature_1_desc || 'Gérez vos clients avec une isolation totale des données.'}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition group">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {content.feature_2_title || 'Facturation automatisée'}
              </h3>
              <p className="text-gray-600">
                {content.feature_2_desc || 'Créez et envoyez vos factures automatiquement.'}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition group">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {content.feature_3_title || 'Workflows n8n'}
              </h3>
              <p className="text-gray-600">
                {content.feature_3_desc || 'Automatisez toutes vos tâches répétitives.'}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition group">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {content.feature_4_title || 'Gestion d\'équipe'}
              </h3>
              <p className="text-gray-600">
                {content.feature_4_desc || 'Gérez les rôles et permissions de votre équipe.'}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition group">
              <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <CheckCircle className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {content.feature_5_title || 'Modules adaptables'}
              </h3>
              <p className="text-gray-600">
                {content.feature_5_desc || 'Activez uniquement les modules dont vous avez besoin.'}
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition group">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {content.feature_6_title || 'Sécurité & conformité'}
              </h3>
              <p className="text-gray-600">
                {content.feature_6_desc || 'Conformité RGPD, SSL/HTTPS, sauvegardes automatiques.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-6 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-xl text-gray-600">Découvrez ce que nos clients disent de TalosPrimes</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-gray-50 p-8 rounded-xl hover:shadow-xl transition">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold mr-4">
                    {testimonial.avatar || `${testimonial.prenom[0]}${testimonial.nom[0]}`}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.prenom} {testimonial.nom}</div>
                    {testimonial.poste && <div className="text-sm text-gray-600">{testimonial.poste}</div>}
                    {testimonial.entreprise && <div className="text-sm text-gray-500">{testimonial.entreprise}</div>}
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(testimonial.note)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 italic">"{testimonial.commentaire}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Contactez-nous
            </h2>
            <p className="text-xl text-gray-600">Une question ? Nous sommes là pour vous aider</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Prénom *"
                    required
                    value={contactForm.prenom}
                    onChange={(e) => setContactForm({ ...contactForm, prenom: e.target.value })}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Nom *"
                    required
                    value={contactForm.nom}
                    onChange={(e) => setContactForm({ ...contactForm, nom: e.target.value })}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email *"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={contactForm.telephone}
                  onChange={(e) => setContactForm({ ...contactForm, telephone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Entreprise"
                  value={contactForm.entreprise}
                  onChange={(e) => setContactForm({ ...contactForm, entreprise: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
                <textarea
                  placeholder="Votre message *"
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={contactStatus === 'sending'}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition disabled:opacity-50 disabled:hover:scale-100"
                >
                  {contactStatus === 'sending' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Envoi en cours...
                    </span>
                  ) : (
                    'Envoyer le message'
                  )}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-lg flex items-start">
                <Mail className="w-6 h-6 text-purple-600 mr-4 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600">{content.config_contact_email || 'contact@talosprimes.com'}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg flex items-start">
                <Phone className="w-6 h-6 text-purple-600 mr-4 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Téléphone</h3>
                  <p className="text-gray-600">{content.config_contact_phone || '+33 1 23 45 67 89'}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg flex items-start">
                <MapPin className="w-6 h-6 text-purple-600 mr-4 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Adresse</h3>
                  <p className="text-gray-600 whitespace-pre-line">{content.config_contact_address || '123 Avenue de la Tech\n75001 Paris, France'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {content.cta_section_title || 'Prêt à transformer votre gestion ?'}
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {content.cta_section_subtitle || 'Rejoignez les entreprises qui automatisent leur succès.'}
          </p>
          <Link 
            href="/inscription" 
            className="inline-block px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:shadow-2xl transition transform hover:scale-105"
          >
            Commencer gratuitement
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Workflow className="w-8 h-8 text-purple-400" />
                <span className="text-xl font-bold">{content.footer_company_name || 'TalosPrimes'}</span>
              </div>
              <p className="text-gray-400">
                {content.footer_company_desc || 'La plateforme de gestion intelligente.'}
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Produit</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-white transition">Tarifs</a></li>
                <li><a href="#testimonials" className="hover:text-white transition">Témoignages</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Entreprise</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/mentions-legales" className="hover:text-white transition">Mentions légales</Link></li>
                <li><Link href="/cgu" className="hover:text-white transition">CGU</Link></li>
                <li><Link href="/cgv" className="hover:text-white transition">CGV</Link></li>
                <li><Link href="/confidentialite" className="hover:text-white transition">Politique de confidentialité</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#contact" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2026 TalosPrimes. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
