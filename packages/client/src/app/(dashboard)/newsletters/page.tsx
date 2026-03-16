'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface Dashboard {
  campaigns: {
    total: number;
    brouillon: number;
    planifiee: number;
    envoyee: number;
    total_envoyes: number;
    total_ouverts: number;
    total_cliques: number;
    total_bounces: number;
    total_desabonnes: number;
  };
  subscribers: {
    total: number;
    active: number;
    unsubscribed: number;
    bounced: number;
    new_last_30_days: number;
    total_lists: number;
  };
  sms: {
    total: number;
    total_envoyes: number;
    total_delivered: number;
    total_failed: number;
  };
  templates: {
    total: number;
  };
  recent_campaigns: Array<{
    id: string;
    nom: string;
    sujet: string;
    status: string;
    scheduled_at: string | null;
    sent_at: string | null;
    total_envoyes: number;
    total_ouverts: number;
    total_cliques: number;
  }>;
  avg_open_rate: number;
  avg_click_rate: number;
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
      const res = await apiClient.newsletter.getDashboard() as { success: boolean; data: { dashboard: Dashboard } };
      if (res.success && res.data?.dashboard) {
        setData(res.data.dashboard);
      } else {
        setError('Impossible de charger le dashboard');
      }
    } catch (err) {
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
  const sms = d?.sms;

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
            <p className="text-3xl font-bold text-blue-400 mt-2">{(c?.total_envoyes || 0).toLocaleString('fr-FR')}</p>
            <p className="text-gray-500 text-xs mt-1">{c?.total_bounces || 0} bounces</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Abonnés actifs</p>
            <p className="text-3xl font-bold text-green-400 mt-2">{(s?.active || 0).toLocaleString('fr-FR')}</p>
            <p className="text-gray-500 text-xs mt-1">{s?.new_last_30_days ? `+${s.new_last_30_days} ce mois` : `${s?.total_lists || 0} listes`}</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Taux d'ouverture</p>
            <p className="text-3xl font-bold text-emerald-400 mt-2">{d?.avg_open_rate || 0}%</p>
            <p className="text-gray-500 text-xs mt-1">moyenne globale</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl p-5 border border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Taux de clic</p>
            <p className="text-3xl font-bold text-purple-400 mt-2">{d?.avg_click_rate || 0}%</p>
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
              <p className="text-gray-500 text-xs">{s?.total || 0} abonnés</p>
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
              <p className="text-gray-500 text-xs">{sms?.total || 0} campagnes</p>
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
                  <span className="text-white font-medium text-sm">{(c?.total_ouverts || 0).toLocaleString('fr-FR')}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(c?.total_envoyes || 0) > 0 ? ((c?.total_ouverts || 0) / (c?.total_envoyes || 1) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-gray-400 text-sm">Cliqués</span>
                  <span className="text-white font-medium text-sm">{(c?.total_cliques || 0).toLocaleString('fr-FR')}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(c?.total_envoyes || 0) > 0 ? ((c?.total_cliques || 0) / (c?.total_envoyes || 1) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-gray-400 text-sm">Désabonnés</span>
                  <span className="text-white font-medium text-sm">{c?.total_desabonnes || 0}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-red-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(c?.total_envoyes || 0) > 0 ? ((c?.total_desabonnes || 0) / (c?.total_envoyes || 1) * 100) : 0}%` }}
                  />
                </div>
              </div>
              {(sms?.total || 0) > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-gray-400 text-sm">SMS délivrés</span>
                    <span className="text-white font-medium text-sm">{(sms?.total_delivered || 0).toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${(sms?.total_envoyes || 0) > 0 ? ((sms?.total_delivered || 0) / (sms?.total_envoyes || 1) * 100) : 0}%` }}
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
                <p className="text-2xl font-bold text-green-400">{(s?.active || 0).toLocaleString('fr-FR')}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Désabonnés</p>
                <p className="text-2xl font-bold text-red-400">{s?.unsubscribed || 0}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Bounced</p>
                <p className="text-2xl font-bold text-orange-400">{s?.bounced || 0}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Nouveaux (30j)</p>
                <p className="text-2xl font-bold text-blue-400">{s?.new_last_30_days || 0}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Listes</p>
                <p className="text-2xl font-bold text-purple-400">{s?.total_lists || 0}</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">Total</p>
                <p className="text-2xl font-bold text-white">{(s?.total || 0).toLocaleString('fr-FR')}</p>
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
                {(!d?.recent_campaigns || d.recent_campaigns.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      <p className="text-lg mb-2">Aucune campagne</p>
                      <p className="text-sm">Créez votre première campagne pour commencer.</p>
                    </td>
                  </tr>
                ) : (
                  d.recent_campaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-6 py-3.5 text-white text-sm font-medium">{camp.nom}</td>
                      <td className="px-6 py-3.5 text-gray-400 text-sm truncate max-w-[200px]">{camp.sujet}</td>
                      <td className="px-6 py-3.5">{getStatusBadge(camp.status)}</td>
                      <td className="px-6 py-3.5 text-gray-400 text-sm">{formatDate(camp.sent_at || camp.scheduled_at)}</td>
                      <td className="px-6 py-3.5 text-center text-gray-300 text-sm">{camp.total_envoyes}</td>
                      <td className="px-6 py-3.5 text-center text-gray-300 text-sm">{camp.total_ouverts}</td>
                      <td className="px-6 py-3.5 text-center text-gray-300 text-sm">{camp.total_cliques}</td>
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
