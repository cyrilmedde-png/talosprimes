'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Article {
  code: string;
  designation: string;
  prixUnitaireHt?: number | null;
  unite?: string | null;
}

interface Site {
  code: string;
  designation: string;
}

interface StockLevel {
  id: string;
  tenantId: string;
  articleId: string;
  siteId: string;
  quantite: number;
  quantiteReservee: number;
  seuilMinimum?: number | null;
  seuilMaximum?: number | null;
  article: Article;
  site: Site;
}

interface StockSite {
  id: string;
  code: string;
  designation: string;
  statut?: string;
}

export default function NiveauxPage() {
  const router = useRouter();
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [sites, setSites] = useState<StockSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  // Fetch data when filters change
  useEffect(() => {
    if (!loading) {
      const params: { siteId?: string; articleId?: string } = {};
      if (selectedSiteId) {
        params.siteId = selectedSiteId;
      }
      fetchLevels(params);
    }
  }, [selectedSiteId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchLevels(), fetchSites()]);
    } catch (err) {
      setError('An error occurred while fetching data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLevels = async (params?: { siteId?: string; articleId?: string }) => {
    try {
      const response = await apiClient.stockLevels.list(params);
      if (response.success && response.data?.levels) {
        setLevels(response.data.levels);
      } else {
        setError('Failed to load stock levels');
      }
    } catch (err) {
      setError('An error occurred while fetching stock levels');
      console.error(err);
    }
  };

  const fetchSites = async () => {
    try {
      const response = await apiClient.stockSites.list();
      if (response.success && response.data?.sites) {
        setSites(response.data.sites);
      }
    } catch (err) {
      console.error('Failed to fetch sites:', err);
    }
  };

  const filteredLevels = levels.filter((level) => {
    const query = searchQuery.toLowerCase();
    return (
      level.article.code.toLowerCase().includes(query) ||
      level.article.designation.toLowerCase().includes(query)
    );
  });

  const getDisponible = (level: StockLevel): number => {
    return Math.max(0, level.quantite - level.quantiteReservee);
  };

  const getStatusBadge = (level: StockLevel) => {
    const disponible = getDisponible(level);
    const seuilMin = level.seuilMinimum || 0;

    if (disponible <= seuilMin) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-400 border border-red-500/30">
          Critique
        </span>
      );
    }

    const seuilMax = level.seuilMaximum || 0;
    if (disponible >= seuilMax && seuilMax > 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-3 py-1 text-sm font-medium text-yellow-400 border border-yellow-500/30">
          Au-dessus max
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-400 border border-green-500/30">
        Normal
      </span>
    );
  };

  const getRowClassName = (level: StockLevel): string => {
    const disponible = getDisponible(level);
    const seuilMin = level.seuilMinimum || 0;

    if (disponible <= seuilMin) {
      return 'bg-red-500/5 hover:bg-red-500/10 transition-colors';
    }

    return 'hover:bg-gray-700/30 transition-colors';
  };

  const handleExportCSV = async () => {
    try {
      setExportLoading(true);

      // Prepare CSV data
      const headers = [
        'Code Article',
        'Désignation Article',
        'Site',
        'Quantité',
        'Réservée',
        'Disponible',
        'Seuil Min',
        'Seuil Max',
        'Statut',
      ];

      const rows = filteredLevels.map((level) => [
        level.article.code,
        level.article.designation,
        level.site.designation,
        level.quantite,
        level.quantiteReservee,
        getDisponible(level),
        level.seuilMinimum ?? '-',
        level.seuilMaximum ?? '-',
        getStatusLabel(level),
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `niveaux-stock-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('An error occurred while exporting the file');
      console.error(err);
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusLabel = (level: StockLevel): string => {
    const disponible = getDisponible(level);
    const seuilMin = level.seuilMinimum || 0;

    if (disponible <= seuilMin) {
      return 'Critique';
    }

    const seuilMax = level.seuilMaximum || 0;
    if (disponible >= seuilMax && seuilMax > 0) {
      return 'Au-dessus max';
    }

    return 'Normal';
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CubeIcon className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Niveaux de Stock</h1>
                <p className="mt-1 text-sm text-gray-400">Vue d'ensemble du stock par article et par site</p>
              </div>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={exportLoading || filteredLevels.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              {exportLoading ? 'Export...' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-500/10 p-4 border border-red-500/30">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Site Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-4 w-4" />
                Filtrer par site
              </div>
            </label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-white border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value="">Tous les sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.designation}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rechercher par article
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Code ou désignation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-gray-800 pl-10 pr-4 py-2.5 text-white placeholder-gray-500 border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-400">Chargement des niveaux de stock...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
              {filteredLevels.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-gray-400">
                    {searchQuery || selectedSiteId
                      ? 'Aucun niveau de stock trouvé'
                      : 'Aucun niveau de stock disponible'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-700 bg-gray-800/80">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                          Article
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                          Site
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                          Quantité
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                          Réservée
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                          Disponible
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                          Seuil Min
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                          Seuil Max
                        </th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                          Statut
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredLevels.map((level) => (
                        <tr key={level.id} className={getRowClassName(level)}>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-white">
                                {level.article.code}
                              </p>
                              <p className="text-sm text-gray-400">
                                {level.article.designation}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-white">
                                {level.site.designation}
                              </p>
                              <p className="text-sm text-gray-400">
                                {level.site.code}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-sm font-medium text-white">
                              {level.quantite}{level.article.unite ? ` ${level.article.unite}` : ''}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-sm text-gray-400">
                              {level.quantiteReservee}{level.article.unite ? ` ${level.article.unite}` : ''}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-sm font-medium text-blue-400">
                              {getDisponible(level)}{level.article.unite ? ` ${level.article.unite}` : ''}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-sm text-gray-400">
                              {level.seuilMinimum ?? '-'}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-sm text-gray-400">
                              {level.seuilMaximum ?? '-'}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {getStatusBadge(level)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Results Count */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {filteredLevels.length} niveau{filteredLevels.length !== 1 ? 'x' : ''} de stock affichés
              </p>

              {/* Warning Badge for Critical Levels */}
              {filteredLevels.some((level) =>
                (level.seuilMinimum || 0) >= (level.quantite - level.quantiteReservee)
              ) && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 border border-red-500/30">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <p className="text-sm text-red-400">
                    {filteredLevels.filter(
                      (level) => (level.seuilMinimum || 0) >= (level.quantite - level.quantiteReservee)
                    ).length}{' '}
                    article(s) en niveau critique
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
