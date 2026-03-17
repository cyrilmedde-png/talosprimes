'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

// Les clés arrivent en camelCase grâce au transformKeys de callWorkflowReturn
// Mais on accepte aussi snake_case (accès direct n8n) via des getters
interface Dashboard {
  campaigns: {
    total: number;
    brouillon: number;
    planifiee: number;
    envoyee: number;
    totalEnvoyes?: number; total_envoyes?: number;
    totalOuverts?: number; total_ouverts?: number;
    totalCliques?: number; total_cliques?: number;
    totalBounces?: number; total_bounces?: number;
    totalDesabonnes?: number; total_desabonnes?: number;
  };
  subscribers: {
    total: number;
    active: number;
    unsubscribed: number;
    bounced: number;
    newLast30Days?: number; new_last_30_days?: number;
    totalLists?: number; total_lists?: number;
  };
  sms: {
    total: number;
    totalEnvoyes?: number; total_envoyes?: number;
    totalDelivered?: number; total_delivered?: number;
    totalFailed?: number; total_failed?: number;
  };
  templates: {
    total: number;
  };
  recentCampaigns?: Array<{
    id: string;
    nom: string;
    sujet: string;
    status: string;
    scheduledAt?: string | null; scheduled_at?: string | null;
    sentAt?: string | null; sent_at?: string | null;
    totalEnvoyes?: number; total_envoyes?: number;
    totalOuverts?: number; total_ouverts?: number;
    totalCliques?: number; total_cliques?: number;
  }>;
  recent_campaigns?: Array<{
    id: string;
    nom: string;
    sujet: string;
    status: string;
    scheduledAt?: string | null; scheduled_at?: string | null;
    sentAt?: string | null; sent_at?: string | null;
    totalEnvoyes?: number; total_envoyes?: number;
    totalOuverts?: number; total_ouverts?: number;
    totalCliques?: number; total_cliques?: number;
  }>;
  avgOpenRate?: number; avg_open_rate?: number;
  avgClickRate?: number; avg_click_rate?: number;
}

export default function NewsletterDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.newsletter.getDashboard() as Record<string, unknown>;
      console.log('[Newsletter Dashboard] API response:', JSON.stringify(res));

      // callWorkflowReturn peut renvoyer { success, data } ou le workflow peut échouer
      if (!res.success) {
        setError((res.error as string) || 'Erreur lors du chargement du dashboard');
        return;
      }

      // La data peut être à plusieurs niveaux selon le wrapping de callWorkflowReturn
      const apiData = res.data as Record<string, unknown> | undefined;

      // Chercher le dashboard dans la réponse (peut être à data.dashboard ou directement data)
      let dashboard: Dashboard | null = null;
      if (apiData?.dashboard) {
        dashboard = apiData.dashboard as Dashboard;
      } else if (apiData && ('campaigns' in apiData || 'subscribers' in apiData)) {
        // Le dashboard est directement dans data (pas de wrapper dashboard)
        dashboard = apiData as unknown as Dashboard;
      }

      if (dashboard) {
        setData(dashboard);
      } else {
        console.error('[Newsletter Dashboard] Structure inattendue:', JSON.stringify(res));
        setError('Structure de réponse inattendue du dashboard');
      }
    } catch (err) {
      console.error('[Newsletter Dashboard] Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
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

  const formatDate = (d: string | null) => {
    if (!d) return '—';
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

  const d = data;
  const c = d?.campaigns;
  const s = d?.subscribers;
  const smsData = d?.sms;

  // Helpers pour accéder aux données en camelCase ou snake_case
  const cEnvoyes = c?.totalEnvoyes ?? c?.total_envoyes ?? 0;
  const cOuverts = c?.totalOuverts ?? c?.total_ouverts ?? 0;
  const cCliques = c?.totalCliques ?? c?.total_cliques ?? 0;
  const cBounces = c?.totalBounces ?? c?.total_bounces ?? 0;
  const cDesabonnes = c?.totalDesabonnes ?? c?.total_desabonnes ?? 0;
  const sActive = s?.active ?? 0;
  const sTotal = s?.total ?? 0;
  const sNew30d = s?.newLast30Days ?? s?.new_last_30_days ?? 0;
  const sLists = s?.totalLists ?? s?.total_lists ?? 0;
  const sUnsubscribed = s?.unsubscribed ?? 0;
  const sBounced = s?.bounced ?? 0;
  const smsTotal = smsData?.total ?? 0;
  const smsEnvoyes = smsData?.totalEnvoyes ?? smsData?.total_envoyes ?? 0;
  const smsDelivered = smsData?.totalDelivered ?? smsData?.total_delivered ?? 0;
  const avgOpen = d?.avgOpenRate ?? d?.avg_open_rate ?? 0;
  const avgClick = d?.avgClickRate ?? d?.avg_click_rate ?? 0;
  const recentCamps = d?.recentCampaigns ?? d?.recent_campaigns ?? [];

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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Campagnes</p>
            <p className="text-3xl font-bold text-white mt-2">{c?.total || 0}</p>
            <p className="text-gray-500 text-xs mt-1">{c?.envoyee || 0} envoyées</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Emails envoyés</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">{cEnvoyes.toLocaleString('fr-FR')}</p>
            <p className="text-gray-500 text-xs mt-1">{cBounces} bounces</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Abonnés actifs</p>
            <p className="text-3xl font-bold text-green-400 mt-2">{sActive.toLocaleString('fr-FR')}</p>
            <p className="text-gray-500 text-xs mt-1">{sNew30d ? `+${sNew30d} ce mois` : `${sLists} listes`}</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Taux d&#39;ouverture</p>
            <p className="text-3xl font-bold text-emerald-400 mt-2">{avgOpen}%</p>
            <p className="text-gray-500 text-xs mt-1">moyenne globale</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Taux de clic</p>
            <p className="text-3xl font-bold text-purple-400 mt-2">{avgClick}%</p>
            <p className="text-gray-500 text-xs mt-1">moyenne globale</p>
          </div>
        </div>

        {/* Accès rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          <Link href="/newsletters/campaigns/new" className="flex items-center gap-3 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3.5 transition group">
            <span className="text-2xl">+</span>
            <div>
              <p className="text-white text-sm font-medium group-hover:text-blue-400 transition">Campagne</p>
              <p className="text-gray-500 text-xs">{c?.brouillon || 0} brouillons</p>
            </div>
          </Link>
          <Link href="/newsletters/contacts" className="flex items-center gap-3 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3.5 transition group">
            <span className="text-2xl">👥</span>
            <div>
              <p className="text-white text-sm font-medium group-hover:text-blue-400 transition">Contacts</p>
              <p className="text-gray-500 text-xs">{sTotal} abonnés</p>
            </div>
          </Link>
          <Link href="/newsletters/templates" className="flex items-center gap-3 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3.5 transition group">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-white text-sm font-medium group-hover:text-blue-400 transition">Templates</p>
              <p className="text-gray-500 text-xs">{d?.templates?.total || 0} modèles</p>
            </div>
          </Link>
          <Link href="/newsletters/sms" className="flex items-center gap-3 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700 rounded-lg px-4 py-3.5 transition group">
            <span className="text-2xl">💬</span>
            <div>
              <p className="text-white text-sm font-medium group-hover:text-blue-400 transition">SMS</p>
              <p className="text-gray-500 text-xs">{smsTotal} campagnes</p>
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
                  <span className="text-white font-medium text-sm">{cOuverts.toLocaleString('fr-FR')}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${cEnvoyes > 0 ? (cOuverts / cEnvoyes * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-gray-400 text-sm">Cliqués</span>
                  <span className="text-white font-medium text-sm">{cCliques.toLocaleString('fr-FR')}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${cEnvoyes > 0 ? (cCliques / cEnvoyes * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-gray-400 text-sm">Désabonnés</span>
                  <span className="text-white font-medium text-sm">{cDesabonnes}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-red-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${cEnvoyes > 0 ? (cDesabonnes / cEnvoyes * 100) : 0}%` }}
                  />
                </div>
              </div>
              {smsTotal > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-gray-400 text-sm">SMS délivrés</span>
                    <span className="text-white font-medium text-sm">{smsDelivered.toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${smsEnvoyes > 0 ? (smsDelivered / smsEnvoyes * 100) : 0}%` }}
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
              <Link href="/newsletters/contacts" className="text-blue-400 text-xs hover:underline">Voir tout</Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Actifs</p>
                <p className="text-2xl font-bold text-green-400">{sActive.toLocaleString('fr-FR')}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Désabonnés</p>
                <p className="text-2xl font-bold text-red-400">{sUnsubscribed}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Bounced</p>
                <p className="text-2xl font-bold text-orange-400">{sBounced}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Nouveaux (30j)</p>
                <p className="text-2xl font-bold text-blue-400">{sNew30d}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Listes</p>
                <p className="text-2xl font-bold text-purple-400">{sLists}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Total</p>
                <p className="text-2xl font-bold text-white">{sTotal.toLocaleString('fr-FR')}</p>
              </div>
            </div>
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
                {recentCamps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      <p className="text-lg mb-2">Aucune campagne</p>
                      <p className="text-sm">Créez votre première campagne pour commencer.</p>
                    </td>
                  </tr>
                ) : (
                  recentCamps.map((camp) => (
                    <tr key={camp.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-6 py-3.5 text-white text-sm font-medium">{camp.nom}</td>
                      <td className="px-6 py-3.5 text-gray-400 text-sm truncate max-w-[200px]">{camp.sujet}</td>
                      <td className="px-6 py-3.5">{getStatusBadge(camp.status)}</td>
                      <td className="px-6 py-3.5 text-gray-400 text-sm">{formatDate(camp.sentAt || camp.sent_at || camp.scheduledAt || camp.scheduled_at)}</td>
                      <td className="px-6 py-3.5 text-center text-gray-300 text-sm">{camp.totalEnvoyes ?? camp.total_envoyes ?? 0}</td>
                      <td className="px-6 py-3.5 text-center text-gray-300 text-sm">{camp.totalOuverts ?? camp.total_ouverts ?? 0}</td>
                      <td className="px-6 py-3.5 text-center text-gray-300 text-sm">{camp.totalCliques ?? camp.total_cliques ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
