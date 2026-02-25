'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { BanknotesIcon } from '@heroicons/react/24/outline';

type CompteBalance = {
  numeroCompte: string;
  libelleCompte: string;
  totalDebit: number;
  totalCredit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
};

type ClasseBalance = {
  classe: number;
  libelleClasse: string;
  comptes: CompteBalance[];
  totalDebit: number;
  totalCredit: number;
  totalSoldeDebiteur: number;
  totalSoldeCrediteur: number;
};

type BalanceData = {
  classes?: ClasseBalance[];
  totauxGeneraux?: {
    totalDebit: number;
    totalCredit: number;
    totalSoldeDebiteur: number;
    totalSoldeCrediteur: number;
  };
};

export default function BalancePage() {
  const [data, setData] = useState<BalanceData>({});
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
      const res = await apiClient.comptabilite.balance({
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

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-6">
        <BanknotesIcon className="h-8 w-8 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Balance des comptes</h1>
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
      ) : !data.classes?.length ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center text-gray-400">Aucune donnée pour cette période</div>
      ) : (
        <div className="space-y-4">
          {data.classes.map((classe) => (
            <div key={classe.classe} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="bg-gray-900/50 px-4 py-3 flex items-center justify-between">
                <span className="text-amber-400 font-semibold">Classe {classe.classe} — {classe.libelleClasse}</span>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>D: {fmt(classe.totalDebit)}</span>
                  <span>C: {fmt(classe.totalCredit)}</span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 px-4">Compte</th>
                    <th className="text-left py-2 px-4">Libellé</th>
                    <th className="text-right py-2 px-4">Mouvement Débit</th>
                    <th className="text-right py-2 px-4">Mouvement Crédit</th>
                    <th className="text-right py-2 px-4">Solde Débiteur</th>
                    <th className="text-right py-2 px-4">Solde Créditeur</th>
                  </tr>
                </thead>
                <tbody>
                  {classe.comptes.map((c) => (
                    <tr key={c.numeroCompte} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                      <td className="py-2 px-4 font-mono text-amber-300 text-xs">{c.numeroCompte}</td>
                      <td className="py-2 px-4 text-white">{c.libelleCompte}</td>
                      <td className="py-2 px-4 text-right text-green-400">{c.totalDebit ? fmt(c.totalDebit) : ''}</td>
                      <td className="py-2 px-4 text-right text-red-400">{c.totalCredit ? fmt(c.totalCredit) : ''}</td>
                      <td className="py-2 px-4 text-right text-green-300">{c.soldeDebiteur ? fmt(c.soldeDebiteur) : ''}</td>
                      <td className="py-2 px-4 text-right text-red-300">{c.soldeCrediteur ? fmt(c.soldeCrediteur) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-600 font-semibold bg-gray-900/30">
                    <td colSpan={2} className="py-2 px-4 text-gray-400">Total Classe {classe.classe}</td>
                    <td className="py-2 px-4 text-right text-green-400">{fmt(classe.totalDebit)}</td>
                    <td className="py-2 px-4 text-right text-red-400">{fmt(classe.totalCredit)}</td>
                    <td className="py-2 px-4 text-right text-green-300">{fmt(classe.totalSoldeDebiteur)}</td>
                    <td className="py-2 px-4 text-right text-red-300">{fmt(classe.totalSoldeCrediteur)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}

          {data.totauxGeneraux && (
            <div className="bg-gray-800 rounded-xl border border-amber-500/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold">Totaux Généraux</span>
                <div className="grid grid-cols-4 gap-6 text-sm">
                  <div className="text-center"><span className="text-gray-400 text-xs block">Mvt Débit</span><span className="text-green-400 font-semibold">{fmt(data.totauxGeneraux.totalDebit)}</span></div>
                  <div className="text-center"><span className="text-gray-400 text-xs block">Mvt Crédit</span><span className="text-red-400 font-semibold">{fmt(data.totauxGeneraux.totalCredit)}</span></div>
                  <div className="text-center"><span className="text-gray-400 text-xs block">Solde Débit</span><span className="text-green-300 font-semibold">{fmt(data.totauxGeneraux.totalSoldeDebiteur)}</span></div>
                  <div className="text-center"><span className="text-gray-400 text-xs block">Solde Crédit</span><span className="text-red-300 font-semibold">{fmt(data.totauxGeneraux.totalSoldeCrediteur)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
