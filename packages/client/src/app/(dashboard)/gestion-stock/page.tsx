'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  CubeIcon,
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

interface DashboardData {
  totalSites: number;
  totalArticles: number;
  totalAlertesActives: number;
  transfertsEnCours: number;
  inventairesEnCours: number;
  valeurTotale: number;
  recentMovements: Array<{
    id: string;
    typeOperation: string;
    quantite: number;
    quantiteAvant: number;
    quantiteApres: number;
    dateOperation: string;
    utilisateurNom?: string | null;
    article: { code: string; designation: string };
    site: { code: string };
  }>;
}

export default function GestionStockDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await apiClient.stockDashboard.get();
      if (res.success && res.data?.dashboard) {
        setDashboard(res.data.dashboard);
      }
    } catch (err) {
      setError('Erreur chargement dashboard');
    } finally {
      setLoading(false);
    }
  }

  const typeLabels: Record<string, { label: string; color: string }> = {
    entree: { label: 'Entrée', color: 'text-green-400' },
    sortie: { label: 'Sortie', color: 'text-red-400' },
    ajustement: { label: 'Ajustement', color: 'text-yellow-400' },
    transfer_in: { label: 'Transfert ↓', color: 'text-blue-400' },
    transfer_out: { label: 'Transfert ↑', color: 'text-orange-400' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CubeIcon className="h-7 w-7 text-blue-400" />
            Gestion de Stock
          </h1>
          <p className="text-gray-400 mt-1">Vue d&apos;ensemble de vos stocks multi-sites</p>
        </div>
        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg">{error}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={<BuildingOffice2Icon className="h-6 w-6" />} label="Sites actifs" value={dashboard?.totalSites ?? 0} color="blue" href="/gestion-stock/sites" />
        <KpiCard icon={<CubeIcon className="h-6 w-6" />} label="Références" value={dashboard?.totalArticles ?? 0} color="indigo" href="/gestion-stock/niveaux" />
        <KpiCard icon={<ExclamationTriangleIcon className="h-6 w-6" />} label="Alertes" value={dashboard?.totalAlertesActives ?? 0} color="red" href="/gestion-stock/alertes" />
        <KpiCard icon={<TruckIcon className="h-6 w-6" />} label="Transferts" value={dashboard?.transfertsEnCours ?? 0} color="orange" href="/gestion-stock/transferts" />
        <KpiCard icon={<ClipboardDocumentListIcon className="h-6 w-6" />} label="Inventaires" value={dashboard?.inventairesEnCours ?? 0} color="purple" href="/gestion-stock/inventaires" />
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Valeur totale</p>
          <p className="text-xl font-bold text-green-400 mt-1">
            {(dashboard?.valeurTotale ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Derniers mouvements</h2>
          <button
            onClick={() => router.push('/gestion-stock/mouvements')}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Voir tout →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Date</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Type</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Article</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Site</th>
                <th className="px-4 py-2 text-right text-gray-400 font-medium">Qté</th>
                <th className="px-4 py-2 text-right text-gray-400 font-medium">Avant → Après</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {(dashboard?.recentMovements ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucun mouvement récent</td></tr>
              ) : (
                dashboard?.recentMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-2 text-gray-300">{new Date(m.dateOperation).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2">
                      <span className={typeLabels[m.typeOperation]?.color ?? 'text-gray-300'}>
                        {typeLabels[m.typeOperation]?.label ?? m.typeOperation}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-white">{m.article.code} — {m.article.designation}</td>
                    <td className="px-4 py-2 text-gray-300">{m.site.code}</td>
                    <td className="px-4 py-2 text-right text-white">{Number(m.quantite)}</td>
                    <td className="px-4 py-2 text-right text-gray-400">{Number(m.quantiteAvant)} → {Number(m.quantiteApres)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color, href }: { icon: React.ReactNode; label: string; value: number; color: string; href: string }) {
  const router = useRouter();
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10',
    indigo: 'text-indigo-400 bg-indigo-500/10',
    red: 'text-red-400 bg-red-500/10',
    orange: 'text-orange-400 bg-orange-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    green: 'text-green-400 bg-green-500/10',
  };
  return (
    <button
      onClick={() => router.push(href)}
      className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition text-left w-full"
    >
      <div className={`inline-flex p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-white mt-2">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </button>
  );
}
