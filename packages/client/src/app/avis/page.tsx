'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Workflow, Star, Send, CheckCircle, AlertCircle } from 'lucide-react';

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_URL || 'https://n8n.talosprimes.com';

export default function AvisPage() {
  const [note, setNote] = useState(0);
  const [hoverNote, setHoverNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [entreprise, setEntreprise] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [token, setToken] = useState('');
  const [channel, setChannel] = useState('web');
  const [tenantId, setTenantId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Parse URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) setToken(params.get('token') || '');
    if (params.get('email')) setEmail(decodeURIComponent(params.get('email') || ''));
    if (params.get('tel')) setTelephone(decodeURIComponent(params.get('tel') || ''));
    if (params.get('nom')) setNom(decodeURIComponent(params.get('nom') || ''));
    if (params.get('prenom')) setPrenom(decodeURIComponent(params.get('prenom') || ''));
    if (params.get('channel')) setChannel(params.get('channel') || 'web');
    if (params.get('tenantId')) setTenantId(params.get('tenantId') || '');
    if (params.get('leadId')) setLeadId(params.get('leadId') || '');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (note === 0) {
      setError('Veuillez sélectionner une note');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${N8N_BASE}/webhook/avis-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token || undefined,
          tenantId: tenantId || '00000000-0000-0000-0000-000000000000',
          leadId: leadId || undefined,
          nom,
          prenom,
          entreprise,
          email,
          telephone,
          note,
          commentaire,
          channel,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
    } catch {
      setError('Impossible de contacter le serveur. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Merci pour votre avis !</h2>
            <p className="text-slate-500 mb-2">
              Votre retour est précieux et nous aide à nous améliorer.
            </p>
            <div className="flex justify-center gap-1 my-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-8 h-8 ${i <= note ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`}
                />
              ))}
            </div>
            <p className="text-sm text-slate-400">Vous avez donné {note}/5</p>
            <Link
              href="/"
              className="inline-block mt-8 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-2">
              Donnez-nous votre avis
            </h1>
            <p className="text-slate-500">
              Votre retour nous aide à vous offrir un meilleur service
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-6">
            {/* Note étoiles */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Votre satisfaction <span className="text-red-400">*</span>
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNote(i)}
                    onMouseEnter={() => setHoverNote(i)}
                    onMouseLeave={() => setHoverNote(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        i <= (hoverNote || note)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-slate-200 hover:text-yellow-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {note > 0 && (
                <p className="text-center text-sm text-slate-400 mt-2">
                  {note === 1 && 'Très insatisfait'}
                  {note === 2 && 'Insatisfait'}
                  {note === 3 && 'Correct'}
                  {note === 4 && 'Satisfait'}
                  {note === 5 && 'Très satisfait'}
                </p>
              )}
            </div>

            {/* Commentaire */}
            <div>
              <label htmlFor="commentaire" className="block text-sm font-medium text-slate-700 mb-1.5">
                Votre commentaire
              </label>
              <textarea
                id="commentaire"
                rows={4}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Partagez votre expérience..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Nom / Prénom */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="prenom" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Prénom
                </label>
                <input
                  id="prenom"
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Jean"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="nom" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nom
                </label>
                <input
                  id="nom"
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Dupont"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Entreprise */}
            <div>
              <label htmlFor="entreprise" className="block text-sm font-medium text-slate-700 mb-1.5">
                Entreprise
              </label>
              <input
                id="entreprise"
                type="text"
                value={entreprise}
                onChange={(e) => setEntreprise(e.target.value)}
                placeholder="Nom de votre entreprise"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean@entreprise.com"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || note === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer mon avis
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Vos données sont traitées conformément à notre{' '}
            <Link href="/confidentialite" className="underline hover:text-slate-600">
              politique de confidentialité
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-slate-100">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-slate-900 font-semibold tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <Workflow className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-lg">TalosPrimes</span>
        </Link>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-6 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center">
            <Workflow className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <span className="text-sm text-slate-300 font-medium">TalosPrimes</span>
        </div>
        <span className="text-xs text-slate-500">&copy; {new Date().getFullYear()} TalosPrimes</span>
      </div>
    </footer>
  );
}
