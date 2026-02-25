'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { DocumentCheckIcon } from '@heroicons/react/24/outline';

type PosteBilan = {
  numero?: string;
  libelle: string;
  montant: number;
  sousPostes?: PosteBilan[];
};

type BilanData = {
  actif?: {
    actifImmobilise?: PosteBilan[];
    actifCirculant?: PosteBilan[];
    totalActif?: number;
  };
  passif?: {
    capitauxPropres?: PosteBilan[];
    dettes?: PosteBilan[];
    totalPassif?: number;
  };
  equilibre?: boolean;
  periode?: { dateFrom: string; dateTo: string };
};

export default function BilanPage() {
  const [data, setData] = useState<BilanData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: `${new Date().getFullYear()}-01-01`,
    dateTo: new Date().toISOString().split('T')[0],
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.comptabilite.bilan({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Erreur de chargement';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  const renderPostes = (postes: PosteBilan[] | undefined) => {
    if (!postes?.length) return <tr><td colSpan={2} className="py-2 px-4 text-gray-500 text-center">—</td></tr>;
    return postes.map((p, i) => (
      <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/20">
        <td className="py-2 px-4 text-white">
          {p.numero && <span className="font-mono text-xs text-gray-500 mr-2">{p.numero}</span>}
          {p.libelle}
        </td>
        <td className="py-2 px-4 text-right text-white font-mono">{fmt(p.montant)}</td>
      </tr>
    ));
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-6">
        <DocumentCheckIcon className="h-8 w-8 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Bilan</h1>
      </div>

      {error && <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Du</label>
          <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Au</label>
          <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ACTIF */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="bg-green-500/10 px-4 py-3 border-b border-gray-700">
              <h2 className="text-green-400 font-bold text-lg">ACTIF</h2>
            </div>

            <div className="p-2">
              <h3 className="text-gray-400 text-xs font-semibold uppercase px-4 py-2">Actif immobilisé</h3>
              <table className="w-full text-sm">
                <tbody>{renderPostes(data.actif?.actifImmobilise)}</tbody>
              </table>

              <h3 className="text-gray-400 text-xs font-semibold uppercase px-4 py-2 mt-2">Actif circulant</h3>
              <table className="w-full text-sm">
                <tbody>{renderPostes(data.actif?.actifCirculant)}</tbody>
              </table>
            </div>

            <div className="bg-green-500/10 px-4 py-3 border-t border-gray-700 flex justify-between">
              <span className="text-green-400 font-bold">TOTAL ACTIF</span>
              <span className="text-green-400 font-bold font-mono">{fmt(data.actif?.totalActif || 0)}</span>
            </div>
          </div>

          {/* PASSIF */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="bg-red-500/10 px-4 py-3 border-b border-gray-700">
              <h2 className="text-red-400 font-bold text-lg">PASSIF</h2>
            </div>

            <div className="p-2">
              <h3 className="text-gray-400 text-xs font-semibold uppercase px-4 py-2">Capitaux propres</h3>
              <table className="w-full text-sm">
                <tbody>{renderPostes(data.passif?.capitauxPropres)}</tbody>
              </table>

              <h3 className="text-gray-400 text-xs font-semibold uppercase px-4 py-2 mt-2">Dettes</h3>
              <table className="w-full text-sm">
                <tbody>{renderPostes(data.passif?.dettes)}</tbody>
              </table>
            </div>

            <div className="bg-red-500/10 px-4 py-3 border-t border-gray-700 flex justify-between">
              <span className="text-red-400 font-bold">TOTAL PASSIF</span>
              <span className="text-red-400 font-bold font-mono">{fmt(data.passif?.totalPassif || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Équilibre */}
      {!loading && data.actif && data.passif && (
        <div className={`mt-4 rounded-xl p-4 border text-center font-semibold ${
          data.equilibre
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {data.equilibre
            ? `✓ Bilan équilibré — Actif = Passif = ${fmt(data.actif.totalActif || 0)}`
            : `✗ Bilan déséquilibré — Actif: ${fmt(data.actif.totalActif || 0)} ≠ Passif: ${fmt(data.passif.totalPassif || 0)}`
          }
        </div>
      )}
    </div>
  );
}
