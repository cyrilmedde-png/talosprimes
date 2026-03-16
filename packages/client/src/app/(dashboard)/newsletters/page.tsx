'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CampaignStats {
  totalCampaigns: number;
  totalSubscribers: number;
  avgOpenRate: number;
  avgClickRate: number;
}

interface Campaign {
  id: string;
  nom: string;
  sujet: string;
  status: 'brouillon' | 'planifiee' | 'en_cours' | 'envoyee' | 'annulee';
  dateEnvoi: string;
  envoyees: number;
  ouvertes: number;
  cliquees: number;
}

interface Analytics {
  totalSent: number;
  totalEnvoyes: number;
  totalOuverts: number;
  totalCliques: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalActiveSubscribers: number;
  monthlySends?: Array<{ month: string; count: number }>;
}

interface SubscriberStats {
  total: number;
  byStatus: { active: number; unsubscribed: number; bounced: number };
  bySource: Record<string, number>;
  newLast30Days: number;
  totalLists: number;
}

interface SMSStats {
  total: number;
  byStatus: Record<string, number>;
  totalEnvoyes: number;
  totalDelivered: number;
  totalFailed: number;
}

export default function NewsletterDashboardPage() {
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [subscriberStats, setSubscriberStats] = useState<SubscriberStats | null>(null);
  const [smsStats, setSmsStats] = useState<SMSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchAllData();
  }, []);

  const getHeaders = () => {
    const token = localStorage.getItem('accessToken');
    const tenantId = localStorage.getItem('tenantId');
    if (!token) throw new Error('Non authentifié');
    const h: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    if (tenantId) h['x-tenant-id'] = tenantId;
    return h;
  };

  const safeFetch = async (url: string) => {
    try {
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.success !== false ? json : json;
    } catch {
      return null;
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      getHeaders(); // Vérifie l'auth avant de lancer les requêtes

      // Lancer tout en parallèle — chaque appel est indépendant
      const [statsRes, campaignsRes, analyticsRes, subsRes, smsRes] = await Promise.allSettled([
        safeFetch(`${baseUrl}/api/newsletters/campaigns/stats`),
        safeFetch(`${baseUrl}/api/newsletters/campaigns?limit=5`),
        safeFetch(`${baseUrl}/api/newsletters/analytics`),
        safeFetch(`${baseUrl}/api/newsletters/subscribers/stats`),
        safeFetch(`${baseUrl}/api/newsletters/sms-campaigns/stats`),
      ]);

      // Campaign stats
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        const d = statsRes.value.data || statsRes.value;
        if (d.totalCampaigns !== undefined) setCampaignStats(d);
        else if (d.stats) setCampaignStats(d.stats);
      }

      // Recent campaigns
      if (campaignsRes.status === 'fulfilled' && campaignsRes.value) {
        const d = campaignsRes.value.data || campaignsRes.value;
        if (Array.isArray(d)) setCampaigns(d.slice(0, 5));
        else if (d.campaigns) setCampaigns(d.campaigns.slice(0, 5));
      }

      // Analytics
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        const d = analyticsRes.value.data || analyticsRes.value;
        if (d.analytics) setAnalytics(d.analytics);
        else if (d.totalEnvoyes !== undefined) setAnalytics(d);
      }

      // Subscriber stats
      if (subsRes.status === 'fulfilled' && subsRes.value) {
        const d = subsRes.value.data || subsRes.value;
        if (d.stats) setSubscriberStats(d.stats);
        else if (d.total !== undefined) setSubscriberStats(d);
      }

      // SMS stats
      if (smsRes.status === 'fulfilled' && smsRes.value) {
        const d = smsRes.value.data || smsRes.value;
        if (d.stats) setSmsStats(d.stats);
        else if (d.total !== undefined) setSmsStats(d);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      brouillon: { bg: 'bg-gray-700 text-gray-200', label: 'Brouillon' },
      planifiee: { bg: 'bg-blue-900/60 text-blue-300', label: 'Planifiée' },
      en_cours: { bg: 'bg-yellow-900/60 text-yellow-300', label: 'En cours' },
      envoyee: { bg: 'bg-green-900/60 text-green-300', label: 'Envoyée' },
      annulee: { bg: 'bg-red-900/60 text-red-300', label: 'Annulée' },
    };
    const s = map[status] || { bg: 'bg-gray-700 text-gray-300', label: status };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.bg}`}>{s.label}</span>;
  };

  const formatRate = (rate: number | undefined): string => {
    if (rate === undefined || rate === null || isNaN(rate)) return '0%';
    // Si < 1, c'est un ratio (0.45 = 45%), sinon c'est déjà un pourcentage
    const pct = rate < 1 ? rate * 100 : rate;
    return `${pct.toFixed(1)}%`;
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  // Valeurs pour les KPIs
  const totalCampaigns = campaignStats?.totalCampaigns || analytics?.totalSent || 0;
  const totalSubscribers = campaignStats?.totalSubscribers || subscriberStats?.total || analytics?.totalActiveSubscribers || 0;
  const totalEmails = analytics?.totalEnvoyes || 0;
  const openRate = campaignStats?.avgOpenRate || analytics?.avgOpenRate || 0;
  const clickRate = campaignStats?.avgClickRate || analytics?.avgClickRate || 0;
  const activeSubscribers = subscriberStats?.byStatus?.active || analytics?.totalActiveSubscribers || 0;
  const unsubscribed = subscriberStats?.byStatus?.unsubscribed || 0;
  const newSubs30d = subscriberStats?.newLast30Days || 0;
  const totalLists = subscriberStats?.totalLists || 0;
  const totalSMS = smsStats?.total || 0;
  const smsDelivered = smsStats?.totalDelivered || 0;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Newsletter</h1>
            <p className="text-gray-400 mt-1">Tableau de bord de vos campagnes email et SMS</p>
          </div>
          <Link href="/newsletters/campaigns/new">
            <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium text-sm">
              + Nouvelle campagne
            </button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* KPI Cards - ligne principale */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Campagnes</p>
            <p className="text-3xl font-bold text-white mt-2">{totalCampaigns}</p>
            <p className="text-gray-500 text-xs mt-1">total envoyées</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Emails envoyés</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">{totalEmails.toLocaleString('fr-FR')}</p>
            <p className="text-gray-500 text-xs mt-1">tous canaux</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Abonnés actifs</p>
            <p className="text-3xl font-bold text-green-400 mt-2">{activeSubscribers.toLocaleString('fr-FR')}</p>
            <p className="text-gray-500 text-xs mt-1">{newSubs30d > 0 ? `+${newSubs30d} ce mois` : `${totalLists} listes`}</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Taux d'ouverture</p>
            <p className="text-3xl font-bold text-emerald-400 mt-2">{formatRate(openRate)}</p>
            <p className="text-gray-500 text-xs mt-1">moyenne globale</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Taux de clic</p>
            <p className="text-3xl font-bold text-purple-400 mt-2">{formatRate(clickRate)}</p>
            <p className="text-gray-500 text-xs mt-1">moyenne globale</p>
          </div>
        </div>

        {/* Accès rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Link href="/newsletters/contacts" className="flex items-center gap-3 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3.5 transition group">
            <span className="text-2xl">👥</span>
            <div>
              <p className="text-white text-sm font-medium group-hover:text-blue-400 transition">Contacts</p>
              <p className="text-gray-500 text-xs">{totalSubscribers} abonnés</p>
            </div>
          </Link>
          <Link href="/newsletters/templates" className="flex items-center gap-3 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3.5 transition group">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-white text-sm font-medium group-hover:text-blue-400 transition">Templates</p>
              <p className="text-gray-500 text-xs">Modèles email</p>
            </div>
          </Link>
          <Link href="/newsletters/sms" className="flex items-center gap-3 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3.5 transition group">
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-white text-sm font-medium group-hover:text-blue-400 transition">SMS</p>
              <p className="text-gray-500 text-xs">{totalSMS} campagnes</p>
            </div>
          </Link>
          <Link href="/newsletters/analytics" className="flex items-center gap-3 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3.5 transition group">
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-white text-sm font-medium group-hover:text-blue-400 transition">Analytics</p>
              <p className="text-gray-500 text-xs">Performances</p>
            </div>
          </Link>
        </div>

        {/* Grille 2 colonnes : Engagement + Abonnés */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Engagement Email */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-5">Engagement Email</h2>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-gray-400 text-sm">Ouverts</span>
                  <span className="text-white font-medium text-sm">{(analytics?.totalOuverts || 0).toLocaleString('fr-FR')}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalEmails > 0 ? ((analytics?.totalOuverts || 0) / totalEmails * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-gray-400 text-sm">Cliqués</span>
                  <span className="text-white font-medium text-sm">{(analytics?.totalCliques || 0).toLocaleString('fr-FR')}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${totalEmails > 0 ? ((analytics?.totalCliques || 0) / totalEmails * 100) : 0}%` }}
                  />
                </div>
              </div>
              {/* SMS delivery si disponible */}
              {totalSMS > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-gray-400 text-sm">SMS Délivrés</span>
                    <span className="text-white font-medium text-sm">{smsDelivered.toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${(smsStats?.totalEnvoyes || 0) > 0 ? (smsDelivered / (smsStats?.totalEnvoyes || 1) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Synthèse Abonnés */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold text-white">Abonnés</h2>
              <Link href="/newsletters/contacts" className="text-blue-400 text-xs hover:underline">Voir tout →</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Actifs</p>
                <p className="text-2xl font-bold text-green-400">{activeSubscribers.toLocaleString('fr-FR')}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Désabonnés</p>
                <p className="text-2xl font-bold text-red-400">{unsubscribed}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Nouveaux (30j)</p>
                <p className="text-2xl font-bold text-blue-400">{newSubs30d}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Listes</p>
                <p className="text-2xl font-bold text-purple-400">{totalLists}</p>
              </div>
            </div>
            {subscriberStats?.bySource && Object.keys(subscriberStats.bySource).length > 0 && (
              <div className="pt-3 border-t border-gray-700">
                <p className="text-gray-500 text-xs mb-2">Sources d'acquisition</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(subscriberStats.bySource).map(([source, count]) => (
                    <span key={source} className="px-2 py-1 bg-gray-700/60 rounded text-xs text-gray-400">
                      {source.replace('_', ' ')}: <span className="text-white">{count as number}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dernières campagnes */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Dernières campagnes</h2>
            <Link href="/newsletters/campaigns/new" className="text-blue-400 text-xs hover:underline">+ Créer</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800/40">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Sujet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">Envoyés</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">Ouverts</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">Cliqués</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      <p className="text-lg mb-2">Aucune campagne</p>
                      <p className="text-sm">Créez votre première campagne pour commencer à envoyer des newsletters.</p>
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-6 py-3.5 text-white text-sm font-medium">{c.nom}</td>
                      <td className="px-6 py-3.5 text-gray-400 text-sm truncate max-w-[200px]">{c.sujet}</td>
                      <td className="px-6 py-3.5">{getStatusBadge(c.status)}</td>
                      <td className="px-6 py-3.5 text-gray-400 text-sm">{formatDate(c.dateEnvoi)}</td>
                      <td className="px-6 py-3.5 text-center text-gray-300 text-sm">{c.envoyees}</td>
                      <td className="px-6 py-3.5 text-center text-gray-300 text-sm">{c.ouvertes}</td>
                      <td className="px-6 py-3.5 text-center text-gray-300 text-sm">{c.cliquees}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Volume envois mensuels si dispo */}
        {analytics?.monthlySends && analytics.monthlySends.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 mt-6">
            <h2 className="text-lg font-semibold text-white mb-4">Volume d'envois mensuels</h2>
            <div className="flex items-end gap-2 h-40">
              {analytics.monthlySends.map((month, idx) => {
                const maxCount = Math.max(...analytics.monthlySends!.map(m => m.count), 1);
                const height = (month.count / maxCount) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400">{month.count}</span>
                    <div
                      className="w-full bg-blue-500/60 rounded-t transition-all duration-300"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-[10px] text-gray-500 truncate w-full text-center">{month.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
