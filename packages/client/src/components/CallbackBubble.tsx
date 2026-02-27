'use client';

import { useState } from 'react';
import { Phone, X, Sparkles, Loader2, CheckCircle } from 'lucide-react';

export function CallbackBubble() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nom: '', telephone: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.telephone.trim()) return;
    setStatus('sending');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/callback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom: form.nom, telephone: form.telephone }),
        }
      );
      if (response.ok) {
        setStatus('success');
        setTimeout(() => {
          setOpen(false);
          setStatus('idle');
          setForm({ nom: '', telephone: '' });
        }, 3000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Formulaire expandé */}
      {open && (
        <div className="mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
          <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-white text-sm font-medium">Léa, votre assistante IA</div>
                <div className="text-slate-400 text-xs">Rappel gratuit immédiat</div>
              </div>
            </div>
            <button
              onClick={() => { setOpen(false); setStatus('idle'); }}
              className="text-slate-400 hover:text-white transition p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {status === 'success' ? (
            <div className="px-5 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-slate-900 font-medium text-sm">Demande envoyée !</div>
              <div className="text-slate-500 text-xs mt-1">Léa vous rappelle dans quelques instants.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <p className="text-slate-600 text-xs leading-relaxed">
                Entrez votre numéro, notre agent IA vous rappelle immédiatement pour répondre à toutes vos questions.
              </p>
              <input
                type="text"
                placeholder="Votre nom (optionnel)"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-slate-50/50"
              />
              <input
                type="tel"
                placeholder="Votre numéro de téléphone *"
                required
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-slate-50/50"
              />
              {status === 'error' && (
                <p className="text-red-600 text-xs">Erreur. Veuillez réessayer.</p>
              )}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition disabled:opacity-60"
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" />
                    Me faire rappeler
                  </>
                )}
              </button>
              <p className="text-slate-400 text-[10px] text-center">
                Gratuit · Sans engagement · Réponse immédiate
              </p>
            </form>
          )}
        </div>
      )}

      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(!open)}
        className={`group w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-xl hover:scale-105'
        }`}
        aria-label="Demander un rappel"
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <div className="relative">
            <Phone className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-white animate-pulse" />
          </div>
        )}
      </button>
    </div>
  );
}
