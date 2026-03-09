'use client';

import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Search, Clock, Loader, Tag, AlertTriangle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CATEGORIES = [
  { value: 'general', label: 'Question générale' },
  { value: 'technique', label: 'Support technique' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'facturation', label: 'Facturation' },
  { value: 'autre', label: 'Autre' },
];

const PRIORITES = [
  { value: 'basse', label: 'Basse', color: 'text-slate-400' },
  { value: 'normale', label: 'Normale', color: 'text-blue-500' },
  { value: 'haute', label: 'Haute', color: 'text-orange-500' },
  { value: 'urgente', label: 'Urgente', color: 'text-red-500' },
];

const STATUT_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  ouvert: { label: 'Ouvert', color: 'bg-blue-100 text-blue-700', icon: Clock },
  en_cours: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700', icon: Loader },
  en_attente: { label: 'En attente', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  resolu: { label: 'Résolu', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  ferme: { label: 'Fermé', color: 'bg-slate-100 text-slate-600', icon: AlertCircle },
};

interface TicketTrackData {
  numero: string;
  sujet: string;
  statut: string;
  priorite: string;
  categorie: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  replies: Array<{ auteur: string; message: string; createdAt: string }>;
}

export function LandingTicketForm({ className }: { className?: string }) {
  const [mode, setMode] = useState<'create' | 'track'>('create');
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '', entreprise: '',
    sujet: '', message: '', categorie: 'general', priorite: 'normale',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [ticketNumero, setTicketNumero] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Track state
  const [trackNumero, setTrackNumero] = useState('');
  const [trackStatus, setTrackStatus] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
  const [trackData, setTrackData] = useState<TicketTrackData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch(`${API}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('success');
        setTicketNumero(data.data.numero);
        setForm({ nom: '', prenom: '', email: '', telephone: '', entreprise: '', sujet: '', message: '', categorie: 'general', priorite: 'normale' });
      } else {
        setStatus('error');
        setErrorMsg(data.message || "Erreur lors de l'envoi.");
      }
    } catch {
      setStatus('error');
      setErrorMsg('Erreur de connexion. Veuillez réessayer.');
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackNumero.trim()) return;
    setTrackStatus('loading');
    try {
      const res = await fetch(`${API}/api/tickets/track/${trackNumero.trim().toUpperCase()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTrackStatus('found');
        setTrackData(data.data);
      } else {
        setTrackStatus('not_found');
        setTrackData(null);
      }
    } catch {
      setTrackStatus('not_found');
    }
  };

  return (
    <div className={className}>
      {/* Toggle Mode */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-5">
        <button
          type="button"
          onClick={() => { setMode('create'); setStatus('idle'); }}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition flex items-center justify-center gap-2 ${
            mode === 'create' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Send size={15} /> Nouveau ticket
        </button>
        <button
          type="button"
          onClick={() => { setMode('track'); setTrackStatus('idle'); }}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition flex items-center justify-center gap-2 ${
            mode === 'track' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Search size={15} /> Suivre un ticket
        </button>
      </div>

      {/* ─── CREATE MODE ─── */}
      {mode === 'create' && status !== 'success' && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Prénom *" required value={form.prenom}
              onChange={(e) => setForm({ ...form, prenom: e.target.value })}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white" />
            <input type="text" placeholder="Nom *" required value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white" />
          </div>
          <input type="email" placeholder="Email *" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white" />
          <div className="grid grid-cols-2 gap-3">
            <input type="tel" placeholder="Téléphone" value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white" />
            <input type="text" placeholder="Entreprise" value={form.entreprise}
              onChange={(e) => setForm({ ...form, entreprise: e.target.value })}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white" />
          </div>
          <input type="text" placeholder="Sujet du ticket *" required value={form.sujet}
            onChange={(e) => setForm({ ...form, sujet: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white">
              {PRIORITES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <textarea placeholder="Décrivez votre demande en détail *" required rows={5} value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-none bg-white" />
          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}
          <button type="submit" disabled={status === 'sending'}
            className="w-full px-4 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition disabled:opacity-50 shadow-sm flex items-center justify-center gap-2">
            {status === 'sending' ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>
            ) : (
              <><Send size={16} /> Envoyer le ticket</>
            )}
          </button>
        </form>
      )}

      {/* ─── SUCCESS ─── */}
      {mode === 'create' && status === 'success' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Ticket créé avec succès !</h3>
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-900 font-mono text-lg font-bold px-4 py-2 rounded-lg mb-3">
            <Tag size={18} /> {ticketNumero}
          </div>
          <p className="text-slate-500 text-sm mb-4">
            Conservez ce numéro pour suivre l&apos;avancement de votre demande.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setStatus('idle')}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition text-slate-700">
              Nouveau ticket
            </button>
            <button onClick={() => { setMode('track'); setTrackNumero(ticketNumero); setTrackStatus('idle'); }}
              className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition">
              Suivre ce ticket
            </button>
          </div>
        </div>
      )}

      {/* ─── TRACK MODE ─── */}
      {mode === 'track' && (
        <div className="space-y-4">
          <form onSubmit={handleTrack} className="flex gap-2">
            <input type="text" placeholder="Numéro de ticket (ex: TKT-00001)" value={trackNumero}
              onChange={(e) => setTrackNumero(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white font-mono" />
            <button type="submit" disabled={trackStatus === 'loading'}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium disabled:opacity-50">
              {trackStatus === 'loading' ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </form>

          {trackStatus === 'not_found' && (
            <div className="flex items-center gap-2 text-orange-600 text-sm bg-orange-50 p-3 rounded-lg">
              <AlertCircle size={16} /> Aucun ticket trouvé avec ce numéro.
            </div>
          )}

          {trackStatus === 'found' && trackData && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="bg-slate-50 p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-slate-900">{trackData.numero}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUT_LABELS[trackData.statut]?.color || 'bg-slate-100 text-slate-600'}`}>
                    {STATUT_LABELS[trackData.statut]?.label || trackData.statut}
                  </span>
                </div>
                <h4 className="font-semibold text-slate-900 text-sm">{trackData.sujet}</h4>
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span>Catégorie: {CATEGORIES.find(c => c.value === trackData.categorie)?.label || trackData.categorie}</span>
                  <span>Priorité: {PRIORITES.find(p => p.value === trackData.priorite)?.label || trackData.priorite}</span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-slate-400">
                  <span>Créé le {new Date(trackData.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  {trackData.resolvedAt && <span>Résolu le {new Date(trackData.resolvedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                </div>
              </div>

              {/* Replies */}
              {trackData.replies.length > 0 && (
                <div className="p-4 space-y-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Réponses</p>
                  {trackData.replies.map((r, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-900">{r.auteur}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{r.message}</p>
                    </div>
                  ))}
                </div>
              )}
              {trackData.replies.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-400">
                  Aucune réponse pour le moment. Notre équipe traite votre demande.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
