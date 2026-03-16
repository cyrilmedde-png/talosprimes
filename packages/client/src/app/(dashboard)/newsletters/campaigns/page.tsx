'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface Campaign {
  id: string;
  nom: string;
  sujet: string;
  status: 'brouillon' | 'planifiee' | 'envoyee' | 'annulee';
  scheduledAt: string | null;
  sentAt: string | null;
  totalEnvoyes: number;
  totalOuverts: number;
  totalCliques: number;
  totalBounces: number;
  totalDesabonnes: number;
  createdAt: string;
}

export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('tous');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.newsletter.listCampaigns({ limit: 50, offset: 0 }) as {
        success: boolean;
        data: { campaigns: Campaign[]; total: number };
      };
      if (res.success && res.data?.campaigns) {
        setCampaigns(res.data.campaigns);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return;
    try {
      await apiClient.newsletter.deleteCampaign(id);
      fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      brouillon: { bg: 'bg-gray-700 text-gray-200', label: 'Brouillon' },
      planifiee: { bg: 'bg-blue-900 text-blue-200', label: 'Planifiee' },
      envoyee: { bg: 'bg-green-900 text-green-200', label: 'Envoyee' },
      annulee: { bg: 'bg-red-900 text-red-200', label: 'Annulee' },
    };
    const s = map[status] || { bg: 'bg-gray-700 text-gray-200', label: status };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.bg}`}>{s.label}</span>;
  };

  const filteredCampaigns = statusFilter === 'tous'
    ? campaigns
    : campaigns.filter((c) => c.status === statusFilter);

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
          <div>
            <h1 className="text-4xl font-bold text-white">Campagnes Email</h1>
            <p className="text-gray-400 mt-2">{campaigns.length} campagnes</p>
          </div>
          <Link
            href="/newsletters/campaigns/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            + Nouvelle campagne
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-4 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="tous">Status: Tous</option>
            <option value="brouillon">Brouillon</option>
            <option value="planifiee">Planifiee</option>
            <option value="envoyee">Envoyee</option>
            <option value="annulee">Annulee</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Nom</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Sujet</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Envoyes</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Ouverts</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Cliques</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                      Aucune campagne trouvee
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-gray-700 hover:bg-gray-750 transition">
                      <td className="px-6 py-4 text-white font-medium">{campaign.nom}</td>
                      <td className="px-6 py-4 text-gray-300">{campaign.sujet}</td>
                      <td className="px-6 py-4">{getStatusBadge(campaign.status)}</td>
                      <td className="px-6 py-4 text-gray-300">{campaign.totalEnvoyes}</td>
                      <td className="px-6 py-4 text-green-400">{campaign.totalOuverts}</td>
                      <td className="px-6 py-4 text-purple-400">{campaign.totalCliques}</td>
                      <td className="px-6 py-4 text-gray-300">
                        {campaign.sentAt
                          ? new Date(campaign.sentAt).toLocaleDateString('fr-FR')
                          : campaign.scheduledAt
                          ? new Date(campaign.scheduledAt).toLocaleDateString('fr-FR')
                          : new Date(campaign.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          className="px-3 py-1 text-sm bg-red-900 hover:bg-red-800 text-red-200 rounded transition"
                        >
                          Supprimer
                        </button>
                      </td>
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
