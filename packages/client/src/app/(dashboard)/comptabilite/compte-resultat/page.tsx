'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

type PosteCR = {
  numero?: string;
  libelle: string;
  montant: number;
};

type CompteResultatData = {
  produits?: {
    produitsExploitation?: PosteCR[];
    produitsFinanciers?: PosteCR[];
    produitsExceptionnels?: PosteCR[];
    totalProduits?: number;
  };
  charges?: {
    chargesExploitation?: PosteCR[];
    chargesFinancieres?: PosteCR[];
    chargesExceptionnelles?: PosteCR[];
    totalCharges?: number;
  };
  resultatExploitation?: number;
  resultatFinancier?: number;
  resultatExceptionnel?: number;
  resultatNet?: number;
  periode?: { dateFrom: string; dateTo: string };
};

export default function CompteResultatPage() {
  const [data, setData] = useState<CompteResultatData>({});
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
      const res = await apiClient.comptabilite.compteResultat({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  const renderSection = (title: string, postes: PosteCR[] | undefined, colorClass: string) => (
    <div className="mb-2">
      <h4 className="text-gray-400 text-xs font-semibold uppercase px-4 py-2">{title}</h4>
      {postes?.length ? (
        <table className="w-full text-sm">
          <tbody>
            {postes.map((p, i) => (
              <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                <td className="py-1.5 px-4 text-white">
                  {p.numero && <span className="font-mono text-xs text-gray-500 mr-2">{p.numero}</span>}
                  {p.libelle}
                </td>
                <td className={`py-1.5 px-4 text-right font-mono ${colorClass}`}>{fmt(p.montant)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-500 text-sm px-4">—</p>
      )}
    </div>
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-6">
        <ArrowTrendingUpIcon className="h-8 w-8 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Compte de Résultat</h1>
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
          {/* PRODUITS */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="bg-green-500/10 px-4 py-3 border-b border-gray-700">
              <h2 className="text-green-400 font-bold text-lg">PRODUITS</h2>
            </div>
            <div className="p-2">
              {renderSection("Produits d'exploitation", data.produits?.produitsExploitation, 'text-green-400')}
              {renderSection("Produits financiers", data.produits?.produitsFinanciers, 'text-green-400')}
              {renderSection("Produits exceptionnels", data.produits?.produitsExceptionnels, 'text-green-400')}
            </div>
            <div className="bg-green-500/10 px-4 py-3 border-t border-gray-700 flex justify-between">
              <span className="text-green-400 font-bold">TOTAL PRODUITS</span>
              <span className="text-green-400 font-bold font-mono">{fmt(data.produits?.totalProduits || 0)}</span>
            </div>
          </div>

          {/* CHARGES */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="bg-red-500/10 px-4 py-3 border-b border-gray-700">
              <h2 className="text-red-400 font-bold text-lg">CHARGES</h2>
            </div>
            <div className="p-2">
              {renderSection("Charges d'exploitation", data.charges?.chargesExploitation, 'text-red-400')}
              {renderSection("Charges financières", data.charges?.chargesFinancieres, 'text-red-400')}
              {renderSection("Charges exceptionnelles", data.charges?.chargesExceptionnelles, 'text-red-400')}
            </div>
            <div className="bg-red-500/10 px-4 py-3 border-t border-gray-700 flex justify-between">
              <span className="text-red-400 font-bold">TOTAL CHARGES</span>
              <span className="text-red-400 font-bold font-mono">{fmt(data.charges?.totalCharges || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Résultats intermédiaires + net */}
      {!loading && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
              <span className="text-gray-400 text-xs block mb-1">Résultat d&apos;exploitation</span>
              <span className={`text-lg font-bold ${(data.resultatExploitation ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmt(data.resultatExploitation || 0)}
              </span>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
              <span className="text-gray-400 text-xs block mb-1">Résultat financier</span>
              <span className={`text-lg font-bold ${(data.resultatFinancier ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmt(data.resultatFinancier || 0)}
              </span>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
              <span className="text-gray-400 text-xs block mb-1">Résultat exceptionnel</span>
              <span className={`text-lg font-bold ${(data.resultatExceptionnel ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmt(data.resultatExceptionnel || 0)}
              </span>
            </div>
          </div>

          <div className={`rounded-xl p-5 border text-center ${
            (data.resultatNet ?? 0) >= 0
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <span className="text-gray-400 text-sm block mb-1">RÉSULTAT NET</span>
            <span className={`text-3xl font-bold ${(data.resultatNet ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmt(data.resultatNet || 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
