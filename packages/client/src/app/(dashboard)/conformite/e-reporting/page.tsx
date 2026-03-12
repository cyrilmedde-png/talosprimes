'use client';

import { useState, useEffect } from 'react';
import { ChartBarSquareIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

type EReportingItem = {
  id: string;
  periodeDebut: string;
  periodeFin: string;
  typeTransaction: 'b2c_france' | 'b2b_international' | 'b2c_international';
  nbTransactions: number;
  montantHtTotal: number;
  montantTvaTotal: number;
  montantTtcTotal: number;
  statut: 'brouillon' | 'valide' | 'transmis' | 'rejete';
  dateTransmission: string | null;
};

const eurFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export default function EReportingPage(): JSX.Element {
  const [eReportingList, setEReportingList] = useState<EReportingItem[]>([]);
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [typeTransaction, setTypeTransaction] = useState<'b2c_france' | 'b2b_international' | 'b2c_international'>('b2c_france');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEReportingList();
  }, []);

  const loadEReportingList = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.conformite.eReporting.liste();
      const list = (response?.data as Record<string, unknown>)?.eReportings;
      setEReportingList(Array.isArray(list) ? list as EReportingItem[] : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerer = async (): Promise<void> => {
    if (!dateDebut || !dateFin) {
      setError('Veuillez entrer les deux dates');
      return;
    }

    if (new Date(dateDebut) > new Date(dateFin)) {
      setError('La date de début doit être antérieure à la date de fin');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      await apiClient.conformite.eReporting.generer({
        periodeDebut: dateDebut,
        periodeFin: dateFin,
        typeTransaction,
      });
      setDateDebut('');
      setDateFin('');
      await loadEReportingList();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la génération';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTransmettre = async (id: string): Promise<void> => {
    setError(null);
    try {
      await apiClient.conformite.eReporting.transmettre({ eReportingId: id, plateformeType: 'chorus_pro' });
      await loadEReportingList();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la transmission';
      setError(message);
    }
  };

  const getStatutBadgeColor = (statut: EReportingItem['statut']): string => {
    switch (statut) {
      case 'brouillon':
        return 'bg-gray-700 text-gray-100';
      case 'valide':
        return 'bg-yellow-600 text-yellow-50';
      case 'transmis':
        return 'bg-green-600 text-green-50';
      case 'rejete':
        return 'bg-red-600 text-red-50';
      default:
        return 'bg-gray-700 text-gray-100';
    }
  };

  const getStatutLabel = (statut: EReportingItem['statut']): string => {
    switch (statut) {
      case 'brouillon':
        return 'Brouillon';
      case 'valide':
        return 'Validé';
      case 'transmis':
        return 'Transmis';
      case 'rejete':
        return 'Rejeté';
      default:
        return statut;
    }
  };

  const getTypeLabel = (type: EReportingItem['typeTransaction']): string => {
    switch (type) {
      case 'b2c_france':
        return 'B2C France';
      case 'b2b_international':
        return 'B2B International';
      case 'b2c_international':
        return 'B2C International';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number): string => {
    return eurFormatter.format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <ChartBarSquareIcon className="h-8 w-8 text-amber-500" />
          <div className="flex-1">
            <h1 className="text-3xl font-bold">E-Reporting</h1>
            <Link href="/conformite" className="text-amber-500 hover:text-amber-400 text-sm mt-2">
              ← Retour à la conformité
            </Link>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-900 bg-opacity-30 border border-amber-700 rounded-lg p-4 mb-8">
          <p className="text-amber-100">
            Transmission des données de transaction B2C et international à l'administration
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 mb-8">
            <p className="text-red-100">{error}</p>
          </div>
        )}

        {/* Generate Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-amber-400">Générer une déclaration E-Reporting</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date début</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Date fin</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type transaction</label>
              <select
                value={typeTransaction}
                onChange={(e) =>
                  setTypeTransaction(e.target.value as 'b2c_france' | 'b2b_international' | 'b2c_international')
                }
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="b2c_france">B2C France</option>
                <option value="b2b_international">B2B International</option>
                <option value="b2c_international">B2C International</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerer}
                disabled={isGenerating}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition"
              >
                {isGenerating ? 'Génération...' : 'Générer'}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700 border-b border-gray-600">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-amber-400">Période</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-amber-400">Type</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-amber-400">Nb transactions</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-amber-400">Montant HT</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-amber-400">Montant TVA</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-amber-400">Montant TTC</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-amber-400">Statut</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-amber-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : eReportingList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                      Aucune déclaration E-Reporting
                    </td>
                  </tr>
                ) : (
                  eReportingList.map((item) => (
                    <tr key={item.id} className="border-t border-gray-700 hover:bg-gray-700 transition">
                      <td className="px-6 py-4 text-sm text-gray-100">
                        {formatDate(item.periodeDebut)} - {formatDate(item.periodeFin)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-100">{getTypeLabel(item.typeTransaction)}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-100">{item.nbTransactions.toLocaleString('fr-FR')}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-100">
                        {formatCurrency(item.montantHtTotal)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-100">
                        {formatCurrency(item.montantTvaTotal)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-100">
                        {formatCurrency(item.montantTtcTotal)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatutBadgeColor(item.statut)}`}
                        >
                          {getStatutLabel(item.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {item.statut === 'valide' && (
                          <button
                            onClick={() => handleTransmettre(item.id)}
                            className="text-amber-500 hover:text-amber-400 font-medium text-xs"
                          >
                            Transmettre
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
