'use client';

import React, { useState, useEffect } from 'react';

interface Subscriber {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  source: 'manual' | 'lead' | 'client' | 'contact_form' | 'import_csv';
  status: 'active' | 'unsubscribed' | 'bounced';
  tags: string[];
  dateInscription: string;
}

export default function ContactsPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('tous');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', nom: '', prenom: '' });

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const tenantId = localStorage.getItem('tenantId');

      if (!token || !tenantId) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
      };

      const res = await fetch(`${baseUrl}/api/newsletters/subscribers`, { headers });
      if (!res.ok) {
        throw new Error('Failed to fetch subscribers');
      }
      const data = await res.json();
      setSubscribers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('accessToken');
      const tenantId = localStorage.getItem('tenantId');

      if (!token || !tenantId) {
        setError('Authentication required');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      };

      const res = await fetch(`${baseUrl}/api/newsletters/subscribers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to add subscriber');
      }

      setFormData({ email: '', nom: '', prenom: '' });
      setShowAddModal(false);
      fetchSubscribers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscriber?')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const tenantId = localStorage.getItem('tenantId');

      if (!token || !tenantId) {
        setError('Authentication required');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
      };

      const res = await fetch(`${baseUrl}/api/newsletters/subscribers/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        throw new Error('Failed to delete subscriber');
      }

      fetchSubscribers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'lead':
        return 'bg-blue-900 text-blue-200';
      case 'client':
        return 'bg-green-900 text-green-200';
      case 'contact_form':
        return 'bg-purple-900 text-purple-200';
      case 'manual':
        return 'bg-gray-700 text-gray-200';
      case 'import_csv':
        return 'bg-orange-900 text-orange-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      lead: 'Lead',
      client: 'Client',
      contact_form: 'Formulaire',
      manual: 'Manuel',
      import_csv: 'Import CSV',
    };
    return labels[source] || source;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900 text-green-200';
      case 'unsubscribed':
        return 'bg-red-900 text-red-200';
      case 'bounced':
        return 'bg-orange-900 text-orange-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Actif',
      unsubscribed: 'Désinscrit',
      bounced: 'Rejeté',
    };
    return labels[status] || status;
  };

  const filteredSubscribers = subscribers.filter((sub) => {
    const matchesSearch =
      sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.prenom.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource = sourceFilter === 'tous' || sub.source === sourceFilter;
    const matchesStatus = statusFilter === 'tous' || sub.status === statusFilter;

    return matchesSearch && matchesSource && matchesStatus;
  });

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
            <h1 className="text-4xl font-bold text-white">Contacts & Abonnés</h1>
            <p className="text-gray-400 mt-2">{subscribers.length} abonnés total</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            ✚ Ajouter
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-200">⚠️ {error}</p>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher par email, nom ou prénom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-xs px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="tous">Source: Tous</option>
            <option value="manual">Manual</option>
            <option value="lead">Lead</option>
            <option value="client">Client</option>
            <option value="contact_form">Formulaire</option>
            <option value="import_csv">Import CSV</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="tous">Status: Tous</option>
            <option value="active">Actif</option>
            <option value="unsubscribed">Désinscrit</option>
            <option value="bounced">Rejeté</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Nom</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Prénom</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Source</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Tags</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date Inscription</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                      Aucun abonné trouvé
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map((subscriber) => (
                    <tr
                      key={subscriber.id}
                      className="border-b border-gray-700 hover:bg-gray-750 transition"
                    >
                      <td className="px-6 py-4 text-white font-medium">{subscriber.email}</td>
                      <td className="px-6 py-4 text-gray-300">{subscriber.nom}</td>
                      <td className="px-6 py-4 text-gray-300">{subscriber.prenom}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getSourceBadgeColor(
                            subscriber.source
                          )}`}
                        >
                          {getSourceLabel(subscriber.source)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            subscriber.status
                          )}`}
                        >
                          {getStatusLabel(subscriber.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {subscriber.tags && subscriber.tags.length > 0
                            ? subscriber.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                                >
                                  {tag}
                                </span>
                              ))
                            : <span className="text-gray-500">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(subscriber.dateInscription).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteSubscriber(subscriber.id)}
                          className="px-3 py-1 text-sm bg-red-900 hover:bg-red-800 text-red-200 rounded transition"
                        >
                          ✕ Supprimer
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

      {/* Add Subscriber Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Ajouter un abonné</h2>
            <form onSubmit={handleAddSubscriber} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Nom</label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="Dupont"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Prénom</label>
                <input
                  type="text"
                  required
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="Jean"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
