'use client';

import { useState } from 'react';
import { Toast } from '@/components/Toast';

interface ContactFormProps {
  className?: string;
}

export function LandingContactForm({ className }: ContactFormProps) {
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

  return (
    <>
      {showToast && <Toast type={toastType} message={toastMessage} onClose={() => setShowToast(false)} />}
      <form onSubmit={handleContactSubmit} className={className}>
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
    </>
  );
}
