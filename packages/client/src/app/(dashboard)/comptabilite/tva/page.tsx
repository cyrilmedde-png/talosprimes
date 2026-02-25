'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { CurrencyEuroIcon } from '@heroicons/react/24/outline';

type LigneTVA = {
  taux: number;
  baseHT: number;
  montantTVA: number;
  compteCollecte?: string;
  compteDeductible?: string;
};

type TVAData = {
  tvaCollectee?: LigneTVA[];
  tvaDeductible?: LigneTVA[];
  totalCollectee?: number;
  totalDeductible?: number;
  tvaAPayer?: number;
  creditTVA?: number;
  periode?: { dateFrom: string; dateTo: string };
  typeDeclaration?: string;
};

export default function TVAPage() {
  const [data, setData] = useState<TVAData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: `${new Date().getFullYear()}-01-01`,
    dateTo: new Date().toISOString().split('T')[0],
    typeDeclaration: 'mensuelle',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.comptabilite.tva({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        typeDeclaration: filters.typeDeclaration,
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
  const fmtPct = (n: number) => `${n}%`;

  const renderLignesTVA = (lignes: LigneTVA[] | undefined, type: 'collectee' | 'deductible') => {
    if (!lignes?.length) return <tr><td colSpan={3} className="py-3 px-4 text-gray-500 text-center">Aucune TVA</td></tr>;
    return lignes.map((l, i) => (
      <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/20">
        <td className="py-2 px-4 text-white">{fmtPct(l.taux)}</td>
        <td className="py-2 px-4 text-right text-gray-300">{fmt(l.baseHT)}</td>
        <td className={`py-2 px-4 text-right font-semibold ${type === 'collectee' ? 'text-red-400' : 'text-green-400'}`}>
          {fmt(l.montantTVA)}
        </td>
      </tr>
    ));
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-6">
        <CurrencyEuroIcon className="h-8 w-8 text-red-400" />
        <h1 className="text-2xl font-bold text-white">Déclaration TVA</h1>
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
        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <select
            value={filters.typeDeclaration}
            onChange={e => setFilters(f => ({ ...f, typeDeclaration: e.target.value }))}
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="mensuelle">Mensuelle</option>
            <option value="trimestrielle">Trimestrielle</option>
            <option value="annuelle">Annuelle</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center"><div className="animate-spin h-8 w-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto" /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* TVA Collectée */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="bg-red-500/10 px-4 py-3 border-b border-gray-700">
                <h2 className="text-red-400 font-bold">TVA Collectée (sur ventes)</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 px-4">Taux</th>
                    <th className="text-right py-2 px-4">Base HT</th>
                    <th className="text-right py-2 px-4">TVA</th>
                  </tr>
                </thead>
                <tbody>{renderLignesTVA(data.tvaCollectee, 'collectee')}</tbody>
                <tfoot>
                  <tr className="border-t border-gray-600 font-semibold bg-gray-900/30">
                    <td colSpan={2} className="py-2 px-4 text-gray-400">Total collectée</td>
                    <td className="py-2 px-4 text-right text-red-400">{fmt(data.totalCollectee || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* TVA Déductible */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="bg-green-500/10 px-4 py-3 border-b border-gray-700">
                <h2 className="text-green-400 font-bold">TVA Déductible (sur achats)</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 px-4">Taux</th>
                    <th className="text-right py-2 px-4">Base HT</th>
                    <th className="text-right py-2 px-4">TVA</th>
                  </tr>
                </thead>
                <tbody>{renderLignesTVA(data.tvaDeductible, 'deductible')}</tbody>
                <tfoot>
                  <tr className="border-t border-gray-600 font-semibold bg-gray-900/30">
                    <td colSpan={2} className="py-2 px-4 text-gray-400">Total déductible</td>
                    <td className="py-2 px-4 text-right text-green-400">{fmt(data.totalDeductible || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Résultat TVA */}
          <div className={`rounded-xl p-5 border text-center ${
            (data.tvaAPayer ?? 0) > 0
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-green-500/10 border-green-500/30'
          }`}>
            {(data.tvaAPayer ?? 0) > 0 ? (
              <>
                <span className="text-gray-400 text-sm block mb-1">TVA À PAYER</span>
                <span className="text-3xl font-bold text-red-400">{fmt(data.tvaAPayer || 0)}</span>
              </>
            ) : (
              <>
                <span className="text-gray-400 text-sm block mb-1">CRÉDIT DE TVA</span>
                <span className="text-3xl font-bold text-green-400">{fmt(data.creditTVA || 0)}</span>
              </>
            )}
            <p className="text-gray-500 text-xs mt-2">
              Collectée ({fmt(data.totalCollectee || 0)}) − Déductible ({fmt(data.totalDeductible || 0)})
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
