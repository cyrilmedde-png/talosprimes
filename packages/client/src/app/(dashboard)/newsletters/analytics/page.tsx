'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Analytics {
  totalSent: number;
  totalEnvoyes: number;
  totalOuverts: number;
  totalCliques: number;
  avgOpenRate: number;
  avgClickRate: number;
  bestCampaigns: Array<{
    id: string;
    nom: string;
    sujet: string;
    totalEnvoyes: number;
    totalOuverts: number;
    openRate: number;
  }>;
  monthlySends: Array<{
    month: string;
    count: number;
  }>;
  totalActiveSubscribers: number;
}

interface SubscriberStats {
  total: number;
  byStatus: { active: number; unsubscribed: number; bounced: number };
  bySource: { lead: number; client: number; contact_form: number; manual: number; import_csv: number };
  newLast30Days: number;
  totalLists: number;
}

export default function NewsletterAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [subscriberStats, setSubscriberStats] = useState<SubscriberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    const tenantId = localStorage.getItem('tenantId');
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId || '',
    };

    try {
      const [analyticsRes, subsRes] = await Promise.all([
        fetch(`${baseUrl}/api/newsletters/analytics`, { headers }),
        fetch(`${baseUrl}/api/newsletters/subscribers/stats`, { headers }),
      ]);

      const analyticsData = await analyticsRes.json();
      const subsData = await subsRes.json();

      if (analyticsData.success && analyticsData.data?.analytics) {
        setAnalytics(analyticsData.data.analytics);
      } else if (analyticsData.data) {
        setAnalytics(analyticsData.data);
      }

      if (subsData.success && subsData.data?.stats) {
        setSubscriberStats(subsData.data.stats);
      } else if (subsData.data) {
        setSubscriberStats(subsData.data);
      }
    } catch (err) {
      setError('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  }

  function formatRate(rate: number | undefined): string {
    if (rate === undefined || rate === null || isNaN(rate)) return '0%';
    return `${(rate * 100).toFixed(1)}%`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Newsletter</h1>
          <p className="text-gray-400 mt-1">Vue d'ensemble de vos performances</p>
        </div>
        <Link
          href="/newsletters"
          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
        >
          Retour aux campagnes
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <p className="text-gray-400 text-sm">Campagnes envoyees</p>
          <p className="text-3xl font-bold text-white mt-1">{analytics?.totalSent || 0}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <p className="text-gray-400 text-sm">Emails envoyes</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{analytics?.totalEnvoyes || 0}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <p className="text-gray-400 text-sm">Taux d'ouverture moyen</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{formatRate(analytics?.avgOpenRate)}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
          <p className="text-gray-400 text-sm">Taux de clic moyen</p>
          <p className="text-3xl font-bold text-purple-400 mt-1">{formatRate(analytics?.avgClickRate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Engagement Stats */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Engagement global</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Ouverts</span>
              <span className="text-white font-medium">{analytics?.totalOuverts || 0}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${analytics?.totalEnvoyes ? ((analytics.totalOuverts / analytics.totalEnvoyes) * 100) : 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Cliques</span>
              <span className="text-white font-medium">{analytics?.totalCliques || 0}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${analytics?.totalEnvoyes ? ((analytics.totalCliques / analytics.totalEnvoyes) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Subscriber Stats */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Abonnes</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Total actifs</p>
              <p className="text-2xl font-bold text-green-400">{subscriberStats?.byStatus?.active || analytics?.totalActiveSubscribers || 0}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Desabonnes</p>
              <p className="text-2xl font-bold text-red-400">{subscriberStats?.byStatus?.unsubscribed || 0}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Nouveaux (30j)</p>
              <p className="text-2xl font-bold text-blue-400">{subscriberStats?.newLast30Days || 0}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Listes</p>
              <p className="text-2xl font-bold text-purple-400">{subscriberStats?.totalLists || 0}</p>
            </div>
          </div>

          {subscriberStats?.bySource && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Par source</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(subscriberStats.bySource).map(([source, count]) => (
                  <span key={source} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                    {source}: <span className="text-white font-medium">{count as number}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Best Campaigns */}
      {analytics?.bestCampaigns && analytics.bestCampaigns.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Meilleures campagnes</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Campagne</th>
                  <th className="text-left py-3 px-4 text-gray-400 text-sm font-medium">Sujet</th>
                  <th className="text-right py-3 px-4 text-gray-400 text-sm font-medium">Envoyes</th>
                  <th className="text-right py-3 px-4 text-gray-400 text-sm font-medium">Ouverts</th>
                  <th className="text-right py-3 px-4 text-gray-400 text-sm font-medium">Taux</th>
                </tr>
              </thead>
              <tbody>
                {analytics.bestCampaigns.map((campaign, idx) => (
                  <tr key={campaign.id || idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-white">{campaign.nom}</td>
                    <td className="py-3 px-4 text-gray-300">{campaign.sujet}</td>
                    <td className="py-3 px-4 text-right text-gray-300">{campaign.totalEnvoyes}</td>
                    <td className="py-3 px-4 text-right text-gray-300">{campaign.totalOuverts}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-green-400 font-medium">
                        {formatRate(campaign.openRate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Sends */}
      {analytics?.monthlySends && analytics.monthlySends.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Volume d'envois mensuels</h2>
          <div className="flex items-end gap-2 h-48">
            {analytics.monthlySends.map((month, idx) => {
              const maxCount = Math.max(...analytics.monthlySends.map(m => m.count), 1);
              const height = (month.count / maxCount) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">{month.count}</span>
                  <div
                    className="w-full bg-blue-500/70 rounded-t"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-gray-500 truncate w-full text-center">{month.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
