'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

type LigneGrandLivre = {
  date: string;
  journalCode: string;
  numeroEcriture?: string;
  libelle: string;
  debit: number;
  credit: number;
  soldeCumule?: number;
};

type CompteGrandLivre = {
  numeroCompte: string;
  libelleCompte: string;
  totalDebit: number;
  totalCredit: number;
  solde: number;
  lignes: LigneGrandLivre[];
};

type GrandLivreData = {
  comptes?: CompteGrandLivre[];
  totaux?: { totalDebit: number; totalCredit: number };
  periode?: { dateFrom: string; dateTo: string };
};

export default function GrandLivrePage() {
  const [data, setData] = useState<GrandLivreData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: `${new Date().getFullYear()}-01-01`,
    dateTo: new Date().toISOString().split('T')[0],
    compteFrom: '',
    compteTo: '',
  });
  const [expandedComptes, setExpandedComptes] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.comptabilite.grandLivre({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        compteFrom: filters.compteFrom || undefined,
        compteTo: filters.compteTo || undefined,
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
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

  const toggleCompte = (numero: string) => {
    setExpandedComptes(prev => {
      const next = new Set(prev);
      if (next.has(numero)) next.delete(numero);
      else next.add(numero);
      return next;
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardDocumentListIcon className="h-8 w-8 text-green-400" />
        <h1 className="text-2xl font-bold text-white">Grand Livre</h1>
      </div>

      {error && <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">{error}</div>}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Du</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Au</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Compte de</label>
          <input
            type="text"
            value={filters.compteFrom}
            onChange={e => setFilters(f => ({ ...f, compteFrom: e.target.value }))}
            placeholder="Ex: 101"
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm w-24"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">à</label>
          <input
            type="text"
            value={filters.compteTo}
            onChange={e => setFilters(f => ({ ...f, compteTo: e.target.value }))}
            placeholder="Ex: 799"
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm w-24"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto" />
        </div>
      ) : !data.comptes?.length ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center text-gray-400">
          Aucune donnée pour cette période
        </div>
      ) : (
        <div className="space-y-3">
          {data.comptes.map((compte) => (
            <div key={compte.numeroCompte} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <button
                onClick={() => toggleCompte(compte.numeroCompte)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-amber-400 text-sm bg-gray-900 px-2 py-0.5 rounded">{compte.numeroCompte}</span>
                  <span className="text-white font-medium">{compte.libelleCompte}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-green-400">D: {fmt(compte.totalDebit)}</span>
                  <span className="text-red-400">C: {fmt(compte.totalCredit)}</span>
                  <span className={`font-semibold ${compte.solde >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    Solde: {fmt(compte.solde)}
                  </span>
                </div>
              </button>

              {expandedComptes.has(compte.numeroCompte) && compte.lignes?.length > 0 && (
                <div className="border-t border-gray-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 bg-gray-900/50">
                        <th className="text-left py-2 px-4">Date</th>
                        <th className="text-left py-2 px-4">Journal</th>
                        <th className="text-left py-2 px-4">Libellé</th>
                        <th className="text-right py-2 px-4">Débit</th>
                        <th className="text-right py-2 px-4">Crédit</th>
                        <th className="text-right py-2 px-4">Solde cumulé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compte.lignes.map((l, i) => (
                        <tr key={i} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                          <td className="py-2 px-4 text-gray-300">{fmtDate(l.date)}</td>
                          <td className="py-2 px-4"><span className="font-mono text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">{l.journalCode}</span></td>
                          <td className="py-2 px-4 text-white">{l.libelle}</td>
                          <td className="py-2 px-4 text-right text-green-400">{l.debit ? fmt(l.debit) : ''}</td>
                          <td className="py-2 px-4 text-right text-red-400">{l.credit ? fmt(l.credit) : ''}</td>
                          <td className="py-2 px-4 text-right text-gray-300">{l.soldeCumule != null ? fmt(l.soldeCumule) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {/* Totaux */}
          {data.totaux && (
            <div className="bg-gray-800 rounded-xl border border-amber-500/30 p-4 flex items-center justify-between">
              <span className="text-amber-400 font-semibold">Totaux généraux</span>
              <div className="flex gap-6 text-sm">
                <span className="text-green-400 font-semibold">Débit: {fmt(data.totaux.totalDebit)}</span>
                <span className="text-red-400 font-semibold">Crédit: {fmt(data.totaux.totalCredit)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
