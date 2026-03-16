'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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

interface Stats {
  totalCampaigns: number;
  totalSubscribers: number;
  avgOpenRate: number;
  avgClickRate: number;
}

export default function NewslettersPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const tenantId = localStorage.getItem('tenantId');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        if (!token || !tenantId) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
        };

        // Fetch stats
        const statsRes = await fetch(`${baseUrl}/api/newsletters/campaigns/stats`, { headers });
        if (!statsRes.ok) {
          throw new Error('Failed to fetch stats');
        }
        const statsData = await statsRes.json();
        setStats(statsData);

        // Fetch campaigns
        const campaignsRes = await fetch(`${baseUrl}/api/newsletters/campaigns`, { headers });
        if (!campaignsRes.ok) {
          throw new Error('Failed to fetch campaigns');
        }
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'brouillon':
        return 'bg-gray-700 text-gray-200';
      case 'planifiee':
        return 'bg-blue-900 text-blue-200';
      case 'en_cours':
        return 'bg-yellow-900 text-yellow-200';
      case 'envoyee':
        return 'bg-green-900 text-green-200';
      case 'annulee':
        return 'bg-red-900 text-red-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      brouillon: 'Brouillon',
      planifiee: 'Planifiée',
      en_cours: 'En cours',
      envoyee: 'Envoyée',
      annulee: 'Annulée',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Newsletters</h1>
          <div className="flex gap-3">
            <Link href="/newsletters/templates">
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition">
                📋 Templates
              </button>
            </Link>
            <Link href="/newsletters/contacts">
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition">
                👥 Gérer les contacts
              </button>
            </Link>
            <Link href="/newsletters/campaigns/new">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">
                ✚ Nouvelle campagne
              </button>
            </Link>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-200">⚠️ {error}</p>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Total Campagnes</p>
              <p className="text-3xl font-bold text-white">{stats.totalCampaigns}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Total Abonnés</p>
              <p className="text-3xl font-bold text-white">{stats.totalSubscribers}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Taux d'Ouverture Moyen</p>
              <p className="text-3xl font-bold text-white">{stats.avgOpenRate.toFixed(1)}%</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Taux de Clic Moyen</p>
              <p className="text-3xl font-bold text-white">{stats.avgClickRate.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* Campaigns Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Nom</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Sujet</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date Envoi</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Envoyés</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Ouverts</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Cliqués</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      Aucune campagne trouvée
                    </td>
                  </tr>
                ) : (
                  campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-b border-gray-700 hover:bg-gray-750 transition"
                    >
                      <td className="px-6 py-4 text-white font-medium">{campaign.nom}</td>
                      <td className="px-6 py-4 text-gray-300 truncate max-w-xs">{campaign.sujet}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            campaign.status
                          )}`}
                        >
                          {getStatusLabel(campaign.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(campaign.dateEnvoi).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-300">{campaign.envoyees}</td>
                      <td className="px-6 py-4 text-center text-gray-300">{campaign.ouvertes}</td>
                      <td className="px-6 py-4 text-center text-gray-300">{campaign.cliquees}</td>
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
