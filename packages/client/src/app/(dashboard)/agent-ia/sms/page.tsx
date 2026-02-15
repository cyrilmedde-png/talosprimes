'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface SMS {
  id: string;
  date: string;
  de: string;
  a: string;
  message: string;
  statut: 'envoye' | 'recu' | 'echec';
  direction: 'entrant' | 'sortant';
}

interface SMSStats {
  totalEnvoyes: number;
  totalRecus: number;
  aujourdhui: number;
}

export default function SMSPage() {
  const router = useRouter();
  const [smsList, setSmsList] = useState<SMS[]>([]);
  const [stats, setStats] = useState<SMSStats>({
    totalEnvoyes: 0,
    totalRecus: 0,
    aujourdhui: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Form states
  const [toNumber, setToNumber] = useState('');
  const [message, setMessage] = useState('');

  // Filter states
  const [filterDirection, setFilterDirection] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load stats
      const statsResponse = await apiClient.sms.stats();
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data.stats as SMSStats);
      }

      // Load SMS
      const filters: Record<string, any> = {};
      if (filterDirection) filters.direction = filterDirection;
      if (filterDateFrom) filters.dateFrom = filterDateFrom;
      if (filterDateTo) filters.dateTo = filterDateTo;

      const response = await apiClient.sms.list(filters);
      if (response.success && response.data) {
        setSmsList((response.data.smsList || []) as SMS[]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(errorMessage);
      if (errorMessage.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadData();
  };

  const handleClearFilters = () => {
    setFilterDirection('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toNumber.trim() || !message.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const response = await apiClient.sms.send({
        toNumber,
        message,
      });

      if (response.success) {
        setToNumber('');
        setMessage('');
        // Reload SMS list and stats
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const truncateMessage = (msg: string, length: number = 50) => {
    return msg.length > length ? msg.substring(0, length) + '...' : msg;
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'envoye':
        return 'bg-green-900/30 text-green-300 border-green-700/30';
      case 'recu':
        return 'bg-blue-900/30 text-blue-300 border-blue-700/30';
      case 'echec':
        return 'bg-red-900/30 text-red-300 border-red-700/30';
      default:
        return 'bg-gray-900/30 text-gray-300 border-gray-700/30';
    }
  };

  if (loading && smsList.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement des SMS...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Journaux SMS</h1>
        <p className="mt-2 text-sm text-gray-400">
          Historique et gestion des messages SMS
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-400 hover:text-red-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Total envoyés</h3>
            <PaperAirplaneIcon className="h-6 w-6 text-green-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.totalEnvoyes}</p>
        </div>

        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Total reçus</h3>
            <PaperAirplaneIcon className="h-6 w-6 text-blue-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.totalRecus}</p>
        </div>

        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Aujourd'hui</h3>
            <PaperAirplaneIcon className="h-6 w-6 text-orange-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats.aujourdhui}</p>
        </div>
      </div>

      {/* Send SMS Form */}
      <div className="mb-8 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
        <h2 className="text-xl font-bold text-white mb-4">Envoyer un SMS</h2>
        <form onSubmit={handleSendSMS} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Numéro de téléphone
              </label>
              <input
                type="tel"
                value={toNumber}
                onChange={(e) => setToNumber(e.target.value)}
                placeholder="+33 6 XX XX XX XX"
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez votre message ici..."
              rows={4}
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
            <div className="mt-2 text-xs text-gray-400">
              {message.length} caractères
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
            {sending ? 'Envoi en cours...' : 'Envoyer le SMS'}
          </button>
        </form>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
        <h3 className="text-lg font-semibold text-white mb-4">Filtrer</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Direction
            </label>
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Tous</option>
              <option value="entrant">Entrant</option>
              <option value="sortant">Sortant</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Du
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Au
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Appliquer les filtres
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* SMS List Table */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md overflow-hidden">
        <div className="p-6 border-b border-gray-700/30">
          <h2 className="text-xl font-bold text-white">
            Historique SMS ({smsList.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700/30">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  De
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  À
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {smsList.length > 0 ? (
                smsList.map((sms) => (
                  <tr
                    key={sms.id}
                    className="hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(sms.date).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {sms.de}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {sms.a}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate"
                      title={sms.message}
                    >
                      {truncateMessage(sms.message)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusBadgeColor(
                          sms.statut
                        )}`}
                      >
                        {sms.statut === 'envoye'
                          ? 'Envoyé'
                          : sms.statut === 'recu'
                          ? 'Reçu'
                          : 'Échec'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                    Aucun SMS trouvé
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
