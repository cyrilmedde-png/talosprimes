'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface Campaign {
  id: string;
  nom: string;
  contenu: string;
  listId: string;
  status: 'brouillon' | 'planifiee' | 'envoyee' | 'annulee';
  scheduledAt: string | null;
  sentAt: string | null;
  totalEnvoyes: number;
  totalDelivered: number;
  totalFailed: number;
  createdAt: string;
}

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  totalEnvoyes: number;
  totalDelivered: number;
  totalFailed: number;
}

interface SubscriberList {
  id: string;
  nom: string;
}

export default function SMSCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lists, setLists] = useState<SubscriberList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    contenu: '',
    listId: '',
    scheduledAt: '',
  });
  const [charCount, setCharCount] = useState(0);

  const maxChars = 160;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [campaignsRes, statsRes, listsRes] = await Promise.all([
        apiClient.newsletter.listSmsCampaigns({ limit: 50, offset: 0 }) as Promise<{ success: boolean; data: { campaigns: Campaign[]; total: number } }>,
        apiClient.newsletter.getSmsCampaignStats() as Promise<{ success: boolean; data: { stats: Stats } }>,
        apiClient.newsletter.listSubscriberLists() as Promise<{ success: boolean; data: { lists: SubscriberList[] } }>,
      ]);

      if (campaignsRes.success && campaignsRes.data?.campaigns) {
        setCampaigns(campaignsRes.data.campaigns);
      }

      if (statsRes.success && statsRes.data?.stats) {
        setStats(statsRes.data.stats);
      }

      if (listsRes.success && listsRes.data?.lists) {
        setLists(listsRes.data.lists);
      } else {
        setLists([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nom.trim()) {
      setError('Le nom de la campagne est requis');
      return;
    }

    if (!formData.contenu.trim()) {
      setError('Le contenu est requis');
      return;
    }

    if (formData.contenu.length > maxChars) {
      setError(`Le contenu doit faire ${maxChars} caractères maximum`);
      return;
    }

    if (!formData.listId) {
      setError('La liste d\'abonnés est requise');
      return;
    }

    try {
      await apiClient.newsletter.createSmsCampaign({
        nom: formData.nom,
        contenu: formData.contenu,
        listId: formData.listId,
        scheduledAt: formData.scheduledAt || undefined,
      });

      setFormData({
        nom: '',
        contenu: '',
        listId: '',
        scheduledAt: '',
      });
      setCharCount(0);
      setShowCreateModal(false);
      setError(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const handleContentChange = (value: string) => {
    setFormData({ ...formData, contenu: value });
    setCharCount(value.length);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'brouillon':
        return 'bg-gray-700 text-gray-200';
      case 'planifiee':
        return 'bg-blue-900 text-blue-200';
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
      brouillon: 'Draft',
      planifiee: 'Scheduled',
      envoyee: 'Sent',
      annulee: 'Cancelled',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
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
            <h1 className="text-4xl font-bold text-white">SMS Campaigns</h1>
            <p className="text-gray-400 mt-2">{stats?.total || 0} total campaigns</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            + Create Campaign
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm font-medium">Total Campaigns</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm font-medium">Total Sent</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalEnvoyes}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm font-medium">Delivered</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{stats.totalDelivered}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm font-medium">Failed</p>
              <p className="text-3xl font-bold text-red-400 mt-2">{stats.totalFailed}</p>
            </div>
          </div>
        )}

        {/* Campaigns Table */}
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Content</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Sent Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Sent / Delivered / Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      No campaigns yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-700/30 transition">
                      <td className="px-6 py-4 text-sm text-white font-medium">{campaign.nom}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        <span className="line-clamp-1">
                          {campaign.contenu.length > 50
                            ? `${campaign.contenu.substring(0, 50)}...`
                            : campaign.contenu}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(campaign.status)}`}>
                          {getStatusLabel(campaign.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {campaign.sentAt
                          ? new Date(campaign.sentAt).toLocaleDateString('fr-FR')
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <span className="text-white font-medium">{campaign.totalEnvoyes}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-green-400 font-medium">{campaign.totalDelivered}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-red-400 font-medium">{campaign.totalFailed}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Create SMS Campaign</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    nom: '',
                    contenu: '',
                    listId: '',
                    scheduledAt: '',
                  });
                  setCharCount(0);
                }}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="flex-1 flex flex-col gap-4 overflow-auto">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="e.g., New Year Promotion"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-300 text-sm font-medium">Message Content</label>
                  <span className={`text-sm font-medium ${charCount > maxChars ? 'text-red-400' : 'text-gray-400'}`}>
                    {charCount}/{maxChars}
                  </span>
                </div>
                <textarea
                  required
                  value={formData.contenu}
                  onChange={(e) => handleContentChange(e.target.value)}
                  maxLength={maxChars}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Your SMS message here..."
                />
                <p className="text-xs text-gray-400 mt-2">
                  SMS messages are limited to {maxChars} characters.
                </p>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Subscriber List</label>
                <select
                  required
                  value={formData.listId}
                  onChange={(e) => setFormData({ ...formData, listId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select a list...</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Schedule (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Leave empty to send immediately.
                </p>
              </div>

              <div className="flex gap-3 pt-4 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      nom: '',
                      contenu: '',
                      listId: '',
                      scheduledAt: '',
                    });
                    setCharCount(0);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
