'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TicketIcon,
  Search,
  Filter,
  Send,
  X,
  Loader,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { getAccessToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Types ───
interface TicketReply {
  id: string;
  auteur: string;
  email: string;
  message: string;
  interne: boolean;
  createdAt: string;
}

interface Ticket {
  id: string;
  numero: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  entreprise: string | null;
  sujet: string;
  message: string;
  categorie: string;
  priorite: string;
  statut: string;
  assigneA: string | null;
  tags: string[];
  replies: TicketReply[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

interface TicketStats {
  total: number;
  ouvert: number;
  enCours: number;
  enAttente: number;
  resolu: number;
  ferme: number;
}

// ─── Constantes ───
const STATUTS = [
  { value: 'ouvert', label: 'Ouvert', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'en_cours', label: 'En cours', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'en_attente', label: 'En attente', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'resolu', label: 'Résolu', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'ferme', label: 'Fermé', color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const PRIORITES = [
  { value: 'basse', label: 'Basse', color: 'text-slate-400' },
  { value: 'normale', label: 'Normale', color: 'text-blue-500' },
  { value: 'haute', label: 'Haute', color: 'text-orange-500' },
  { value: 'urgente', label: 'Urgente', color: 'text-red-600 font-semibold' },
];

const CATEGORIES = [
  { value: 'general', label: 'Général' },
  { value: 'technique', label: 'Technique' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'facturation', label: 'Facturation' },
  { value: 'autre', label: 'Autre' },
];

function fetchApi(path: string, options?: RequestInit) {
  const token = getAccessToken();
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  }).then((r) => r.json());
}

// ─── Composant principal ───
export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterPriorite, setFilterPriorite] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyInterne, setReplyInterne] = useState(false);
  const [sending, setSending] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (filterStatut) params.set('statut', filterStatut);
    if (filterPriorite) params.set('priorite', filterPriorite);
    if (filterCategorie) params.set('categorie', filterCategorie);

    const data = await fetchApi(`/api/tickets?${params}`);
    if (data.success) {
      setTickets(data.data);
      setTotalPages(data.pagination.pages);
    }
    setLoading(false);
  }, [page, filterStatut, filterPriorite, filterCategorie]);

  const loadStats = useCallback(async () => {
    const data = await fetchApi('/api/tickets/stats');
    if (data.success) setStats(data.data);
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const updateTicket = async (id: string, patch: Record<string, unknown>) => {
    const data = await fetchApi(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (data.success) {
      loadTickets();
      loadStats();
      if (selectedTicket?.id === id) setSelectedTicket(data.data);
    }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm('Supprimer définitivement ce ticket ?')) return;
    await fetchApi(`/api/tickets/${id}`, { method: 'DELETE' });
    setSelectedTicket(null);
    loadTickets();
    loadStats();
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSending(true);
    const data = await fetchApi(`/api/tickets/${selectedTicket.id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message: replyText, interne: replyInterne }),
    });
    if (data.success) {
      setReplyText('');
      setReplyInterne(false);
      // Refresh ticket
      const fresh = await fetchApi(`/api/tickets/${selectedTicket.id}`);
      if (fresh.success) setSelectedTicket(fresh.data);
      loadTickets();
    }
    setSending(false);
  };

  const filteredTickets = search
    ? tickets.filter(t =>
        t.numero.toLowerCase().includes(search.toLowerCase()) ||
        t.sujet.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase()) ||
        `${t.prenom} ${t.nom}`.toLowerCase().includes(search.toLowerCase())
      )
    : tickets;

  const getStatutBadge = (statut: string) => {
    const s = STATUTS.find(s => s.value === statut);
    return s ? `${s.color} border` : 'bg-slate-100 text-slate-600 border-slate-200 border';
  };

  const getPrioriteBadge = (priorite: string) => {
    const p = PRIORITES.find(p => p.value === priorite);
    return p?.color || 'text-slate-400';
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <TicketIcon className="w-7 h-7 text-blue-600" /> Tickets Support
        </h1>
        <p className="text-slate-500 text-sm mt-1">Gestion des demandes et tickets de support</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'bg-slate-100 text-slate-700' },
            { label: 'Ouverts', value: stats.ouvert, color: 'bg-blue-50 text-blue-700' },
            { label: 'En cours', value: stats.enCours, color: 'bg-yellow-50 text-yellow-700' },
            { label: 'En attente', value: stats.enAttente, color: 'bg-orange-50 text-orange-700' },
            { label: 'Résolus', value: stats.resolu, color: 'bg-green-50 text-green-700' },
            { label: 'Fermés', value: stats.ferme, color: 'bg-slate-50 text-slate-600' },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs font-medium opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Filter size={14} />
          <select value={filterStatut} onChange={e => { setFilterStatut(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="">Tous statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterPriorite} onChange={e => { setFilterPriorite(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="">Toutes priorités</option>
            {PRIORITES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={filterCategorie} onChange={e => { setFilterCategorie(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-4">
        {/* Ticket List */}
        <div className={`${selectedTicket ? 'w-1/2 hidden lg:block' : 'w-full'} space-y-2`}>
          {loading ? (
            <div className="text-center py-12 text-slate-400"><Loader className="animate-spin mx-auto" size={24} /></div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <TicketIcon className="mx-auto mb-3 opacity-50" size={40} />
              <p>Aucun ticket trouvé</p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <div key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 rounded-xl border cursor-pointer transition hover:shadow-sm ${
                  selectedTicket?.id === ticket.id
                    ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{ticket.numero}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatutBadge(ticket.statut)}`}>
                      {STATUTS.find(s => s.value === ticket.statut)?.label || ticket.statut}
                    </span>
                  </div>
                  <span className={`text-xs ${getPrioriteBadge(ticket.priorite)}`}>
                    {PRIORITES.find(p => p.value === ticket.priorite)?.label}
                  </span>
                </div>
                <h4 className="font-medium text-slate-900 text-sm mb-1 truncate">{ticket.sujet}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><User size={12} /> {ticket.prenom} {ticket.nom}</span>
                  <span>{ticket.email}</span>
                  {ticket.replies.length > 0 && (
                    <span className="flex items-center gap-1"><MessageSquare size={12} /> {ticket.replies.length}</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {new Date(ticket.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-500">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Ticket Detail */}
        {selectedTicket && (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            {/* Detail Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-slate-600">{selectedTicket.numero}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatutBadge(selectedTicket.statut)}`}>
                    {STATUTS.find(s => s.value === selectedTicket.statut)?.label}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900">{selectedTicket.sujet}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => deleteTicket(selectedTicket.id)}
                  className="p-1.5 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition" title="Supprimer">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelectedTicket(null)}
                  className="p-1.5 rounded text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition lg:hidden">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 border-b border-slate-100 grid grid-cols-2 gap-3 text-sm shrink-0">
              <div>
                <span className="text-xs text-slate-400 block">Demandeur</span>
                <span className="font-medium text-slate-800">{selectedTicket.prenom} {selectedTicket.nom}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Email</span>
                <a href={`mailto:${selectedTicket.email}`} className="text-blue-600 hover:underline">{selectedTicket.email}</a>
              </div>
              {selectedTicket.telephone && (
                <div>
                  <span className="text-xs text-slate-400 block">Téléphone</span>
                  <span className="text-slate-800">{selectedTicket.telephone}</span>
                </div>
              )}
              {selectedTicket.entreprise && (
                <div>
                  <span className="text-xs text-slate-400 block">Entreprise</span>
                  <span className="text-slate-800">{selectedTicket.entreprise}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-slate-400 block mb-1">Statut</span>
                <select value={selectedTicket.statut}
                  onChange={e => updateTicket(selectedTicket.id, { statut: e.target.value })}
                  className="border border-slate-200 rounded px-2 py-1 text-xs">
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">Priorité</span>
                <select value={selectedTicket.priorite}
                  onChange={e => updateTicket(selectedTicket.id, { priorite: e.target.value })}
                  className="border border-slate-200 rounded px-2 py-1 text-xs">
                  {PRIORITES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Message original */}
            <div className="p-4 border-b border-slate-100 shrink-0">
              <p className="text-xs text-slate-400 mb-1 font-medium">Message original</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTicket.message}</p>
            </div>

            {/* Replies */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedTicket.replies.map(r => (
                <div key={r.id} className={`rounded-lg p-3 ${r.interne ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-900">
                      {r.auteur} {r.interne && <span className="text-xs text-amber-600 ml-1">(note interne)</span>}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{r.message}</p>
                </div>
              ))}
              {selectedTicket.replies.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-4">Aucune réponse pour le moment</p>
              )}
            </div>

            {/* Reply form */}
            <div className="p-3 border-t border-slate-100 shrink-0">
              <div className="flex gap-2">
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                  placeholder="Votre réponse..." rows={2}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                <div className="flex flex-col gap-1">
                  <button onClick={sendReply} disabled={sending || !replyText.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm flex items-center gap-1.5">
                    {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} Envoyer
                  </button>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input type="checkbox" checked={replyInterne} onChange={e => setReplyInterne(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300" />
                    Note interne
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
