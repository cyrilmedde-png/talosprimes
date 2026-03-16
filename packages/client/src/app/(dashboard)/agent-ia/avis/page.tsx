'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';
import {
  StarIcon,
  EyeIcon,
  XMarkIcon,
  FunnelIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_URL || 'https://n8n.talosprimes.com';

interface Avis {
  id: string;
  nom: string;
  prenom: string;
  entreprise: string;
  email: string;
  telephone: string;
  note: number;
  commentaire: string;
  channel: 'telephone' | 'email' | 'web';
  affiche: boolean;
  leadId: string | null;
  token: string;
  createdAt: string;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: typeof PhoneIcon; color: string }> = {
  telephone: { label: 'Téléphone', icon: PhoneIcon, color: 'text-blue-400 bg-blue-900/30 border-blue-700/50' },
  email: { label: 'Email', icon: EnvelopeIcon, color: 'text-purple-400 bg-purple-900/30 border-purple-700/50' },
  web: { label: 'Web', icon: GlobeAltIcon, color: 'text-green-400 bg-green-900/30 border-green-700/50' },
};

function NoteStars({ note, size = 'sm' }: { note: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) =>
        i <= note ? (
          <StarIconSolid key={i} className={`${cls} text-yellow-400`} />
        ) : (
          <StarIcon key={i} className={`${cls} text-gray-600`} />
        )
      )}
    </div>
  );
}

export default function AvisPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const tenantId = user?.tenantId || '';
  const [avis, setAvis] = useState<Avis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Avis | null>(null);
  const [filterChannel, setFilterChannel] = useState<string>('');
  const [filterNote, setFilterNote] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = avis.length;
    const completed = avis.filter((a) => a.note > 0).length;
    const avg = completed > 0 ? avis.filter((a) => a.note > 0).reduce((s, a) => s + a.note, 0) / completed : 0;
    const byNote = [0, 0, 0, 0, 0];
    avis.filter((a) => a.note > 0).forEach((a) => byNote[a.note - 1]++);
    return { total, completed, avg, byNote };
  }, [avis]);

  const filteredAvis = useMemo(() => {
    return avis.filter((a) => {
      if (filterChannel && a.channel !== filterChannel) return false;
      if (filterNote > 0 && a.note < filterNote) return false;
      return true;
    });
  }, [avis, filterChannel, filterNote]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadAvis();
  }, [router]);

  const loadAvis = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${N8N_BASE}/webhook/avis-list?tenantId=${tenantId}`);
      if (!res.ok) {
        setError(`Erreur serveur (${res.status}). Vérifiez que le workflow avis-list est actif dans n8n.`);
        return;
      }
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        // Si la réponse n'est pas du JSON valide (ex: [object Object])
        setError('Réponse n8n invalide. Vérifiez que le workflow avis-list est bien importé (version corrigée).');
        return;
      }
      // Gérer plusieurs formats : tableau direct ou { success, avis }
      if (Array.isArray(data)) {
        // respondWith: allIncomingItems → [{ success, avis: [...] }]
        const item = data[0] || {};
        setAvis(item.avis || []);
      } else if (data.success) {
        setAvis(data.avis || []);
      } else {
        setError(data.error || 'Erreur lors du chargement des avis');
      }
    } catch {
      setError('Impossible de contacter n8n. Vérifiez que le workflow avis-list est actif.');
    } finally {
      setLoading(false);
    }
  };

  const copyAvisLink = () => {
    const link = `https://demo.talosprimes.com/avis?tenantId=${tenantId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendEmailRequest = async () => {
    const emailAddr = prompt('Email du client à solliciter :');
    if (!emailAddr) return;
    const nomClient = prompt('Nom du client (optionnel) :') || '';
    try {
      await fetch(`${N8N_BASE}/webhook/avis-request-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, email: emailAddr, nom: nomClient }),
      });
      alert('Email de demande d\'avis envoyé !');
    } catch {
      alert('Erreur lors de l\'envoi');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Avis clients</h1>
            <p className="text-gray-400 mt-1">
              Collectez et gérez les retours de vos clients
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={copyAvisLink}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition"
            >
              {copied ? (
                <CheckCircleIcon className="w-4 h-4 text-green-400" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4" />
              )}
              {copied ? 'Copié !' : 'Copier le lien'}
            </button>
            <button
              onClick={sendEmailRequest}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
              <EnvelopeIcon className="w-4 h-4" />
              Demander un avis
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Note moyenne</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold">{stats.avg.toFixed(1)}</p>
              <NoteStars note={Math.round(stats.avg)} />
            </div>
          </div>
          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
            <p className="text-xs text-green-400 uppercase tracking-wide">Répondus</p>
            <p className="text-2xl font-bold text-green-300 mt-1">{stats.completed}</p>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
            <p className="text-xs text-yellow-400 uppercase tracking-wide">En attente</p>
            <p className="text-2xl font-bold text-yellow-300 mt-1">{stats.total - stats.completed}</p>
          </div>
        </div>

        {/* Distribution par note */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
          <p className="text-sm font-medium text-gray-300 mb-3">Distribution des notes</p>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = stats.byNote[n - 1];
              const pct = stats.completed > 0 ? (count / stats.completed) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 w-12 flex items-center gap-1">
                    {n} <StarIconSolid className="w-3.5 h-3.5 text-yellow-400" />
                  </span>
                  <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Tous les canaux</option>
            <option value="telephone">Téléphone</option>
            <option value="email">Email</option>
            <option value="web">Web</option>
          </select>
          <select
            value={filterNote}
            onChange={(e) => setFilterNote(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value={0}>Toutes les notes</option>
            <option value={5}>5 étoiles</option>
            <option value={4}>4+ étoiles</option>
            <option value={3}>3+ étoiles</option>
          </select>
        </div>

        {/* Liste des avis */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            <span className="ml-3 text-gray-400">Chargement des avis...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XMarkIcon className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        ) : filteredAvis.length === 0 ? (
          <div className="text-center py-12">
            <StarIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aucun avis pour le moment</p>
            <p className="text-sm text-gray-500 mt-1">
              Les avis seront collectés automatiquement après les appels
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAvis.map((a) => {
              const ch = CHANNEL_CONFIG[a.channel] || CHANNEL_CONFIG.web;
              const Icon = ch.icon;
              const hasResponse = a.note > 0;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={`bg-gray-800/50 rounded-lg border p-4 cursor-pointer hover:bg-gray-800 transition ${
                    hasResponse ? 'border-gray-700' : 'border-dashed border-gray-600 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-medium text-white truncate">
                          {a.prenom || a.nom
                            ? `${a.prenom || ''} ${a.nom || ''}`.trim()
                            : a.email || a.telephone || 'Anonyme'}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ch.color}`}>
                          <Icon className="w-3 h-3" />
                          {ch.label}
                        </span>
                      </div>
                      {hasResponse ? (
                        <>
                          <NoteStars note={a.note} />
                          {a.commentaire && (
                            <p className="text-sm text-gray-400 mt-2 line-clamp-2">{a.commentaire}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-yellow-500 italic">En attente de réponse</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {new Date(a.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <button className="mt-2 p-1 text-gray-500 hover:text-indigo-400 transition">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal détail */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Détail de l&apos;avis</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-700 transition"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="text-center">
                  <NoteStars note={selected.note} size="md" />
                  <p className="text-sm text-gray-500 mt-1">{selected.note}/5</p>
                </div>

                {selected.commentaire && (
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-300 italic">&quot;{selected.commentaire}&quot;</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {(selected.prenom || selected.nom) && (
                    <div>
                      <p className="text-gray-500">Nom</p>
                      <p className="text-gray-200 font-medium">
                        {selected.prenom} {selected.nom}
                      </p>
                    </div>
                  )}
                  {selected.entreprise && (
                    <div>
                      <p className="text-gray-500">Entreprise</p>
                      <p className="text-gray-200">{selected.entreprise}</p>
                    </div>
                  )}
                  {selected.email && (
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="text-gray-200">{selected.email}</p>
                    </div>
                  )}
                  {selected.telephone && (
                    <div>
                      <p className="text-gray-500">Téléphone</p>
                      <p className="text-gray-200">{selected.telephone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Canal</p>
                    <p className="text-gray-200 capitalize">{selected.channel}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="text-gray-200">
                      {new Date(selected.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
