'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';

interface MarketingStats {
  totalPosts: number;
  parPlateforme: Array<{ plateforme: string; count: number }>;
  parStatus: Array<{ status: string; count: number }>;
  parType: Array<{ type: string; count: number }>;
  recentPosts: Array<{
    id: string;
    plateforme: string;
    type: string;
    sujet: string;
    status: string;
    datePublication: string;
    contenuTexte?: string | null;
  }>;
}

const PLATEFORME_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

const PLATEFORME_COLORS: Record<string, string> = {
  facebook: 'bg-blue-600',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  tiktok: 'bg-gray-900',
};

const STATUS_LABELS: Record<string, string> = {
  planifie: 'Planifié',
  publie: 'Publié',
  erreur: 'Erreur',
};

const STATUS_COLORS: Record<string, string> = {
  planifie: 'text-yellow-400 bg-yellow-900/30',
  publie: 'text-green-400 bg-green-900/30',
  erreur: 'text-red-400 bg-red-900/30',
};

const TYPE_LABELS: Record<string, string> = {
  module_presentation: 'Présentation',
  astuce: 'Astuce',
  temoignage: 'Témoignage',
  promo: 'Promo',
};

export default function MarketingDashboardPage() {
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.marketing.getStats();
      if (response.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Erreur chargement stats marketing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const triggerPublish = async () => {
    setPublishing(true);
    setPublishMessage(null);
    try {
      const response = await apiClient.marketing.triggerPublish();
      setPublishMessage(response.message || 'Publication déclenchée avec succès');
      // Recharger les stats après publication
      setTimeout(() => loadStats(), 3000);
    } catch (error) {
      setPublishMessage('Erreur lors de la publication');
      console.error('Erreur publication:', error);
    } finally {
      setPublishing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketing Digital</h1>
          <p className="text-gray-400 mt-1">Gestion des publications Facebook, Instagram et TikTok</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/marketing/publications"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            Voir les publications
          </Link>
          <button
            onClick={triggerPublish}
            disabled={publishing}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            {publishing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Publication en cours...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Publier maintenant
              </>
            )}
          </button>
        </div>
      </div>

      {publishMessage && (
        <div className={`p-3 rounded-lg text-sm ${publishMessage.includes('Erreur') ? 'bg-red-900/30 text-red-300' : 'bg-green-900/30 text-green-300'}`}>
          {publishMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Publications</p>
          <p className="text-3xl font-bold text-white mt-1">{stats?.totalPosts ?? 0}</p>
        </div>
        {['facebook', 'instagram', 'tiktok'].map(p => {
          const count = stats?.parPlateforme.find(x => x.plateforme === p)?.count ?? 0;
          return (
            <div key={p} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <p className="text-gray-400 text-sm">{PLATEFORME_LABELS[p]}</p>
              <p className="text-3xl font-bold text-white mt-1">{count}</p>
              <div className={`w-8 h-1 rounded mt-2 ${PLATEFORME_COLORS[p]}`}></div>
            </div>
          );
        })}
      </div>

      {/* Status & Type Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Par statut */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Par statut</h3>
          <div className="space-y-3">
            {stats?.parStatus.map(s => (
              <div key={s.status} className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[s.status] || 'text-gray-400'}`}>
                  {STATUS_LABELS[s.status] || s.status}
                </span>
                <span className="text-white font-mono">{s.count}</span>
              </div>
            ))}
            {(!stats?.parStatus || stats.parStatus.length === 0) && (
              <p className="text-gray-500 text-sm">Aucune donnée</p>
            )}
          </div>
        </div>

        {/* Par type */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h3 className="text-white font-semibold mb-4">Par type de contenu</h3>
          <div className="space-y-3">
            {stats?.parType.map(t => (
              <div key={t.type} className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">{TYPE_LABELS[t.type] || t.type}</span>
                <span className="text-white font-mono">{t.count}</span>
              </div>
            ))}
            {(!stats?.parType || stats.parType.length === 0) && (
              <p className="text-gray-500 text-sm">Aucune donnée</p>
            )}
          </div>
        </div>
      </div>

      {/* Publications récentes */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-white font-semibold">Publications récentes</h3>
          <Link href="/marketing/publications" className="text-cyan-400 hover:text-cyan-300 text-sm">
            Voir tout →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="px-5 py-3">Plateforme</th>
                <th className="px-5 py-3">Sujet</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentPosts.map(post => (
                <tr key={post.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded text-xs text-white ${PLATEFORME_COLORS[post.plateforme] || 'bg-gray-600'}`}>
                      {PLATEFORME_LABELS[post.plateforme] || post.plateforme}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white text-sm max-w-xs truncate">{post.sujet}</td>
                  <td className="px-5 py-3 text-gray-300 text-sm">{TYPE_LABELS[post.type] || post.type}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[post.status] || 'text-gray-400'}`}>
                      {STATUS_LABELS[post.status] || post.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-sm">{formatDate(post.datePublication)}</td>
                </tr>
              ))}
              {(!stats?.recentPosts || stats.recentPosts.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    Aucune publication pour le moment. Cliquez sur &quot;Publier maintenant&quot; pour déclencher la première publication automatique.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
