'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  FunnelIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Situation {
  id: string;
  chantierReference: string;
  chantierNom: string;
  numero: number;
  type: 'situation_travaux' | 'dg_demarrage' | 'retenue_garantie' | 'avenant';
  dateEmission: string;
  dateValidation: string | null;
  montantHT: number;
  montantTTC: number;
  tauxAvancement: number;
  valide: boolean;
}

interface Chantier {
  id: string;
  reference: string;
  nom: string;
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

const typeLabels: Record<string, string> = {
  situation_travaux: 'Situation travaux',
  dg_demarrage: 'DG Démarrage',
  retenue_garantie: 'Retenue de garantie',
  avenant: 'Avenant',
};

export default function SituationsPage() {
  const [situations, setSituations] = useState<Situation[]>([]);
  const [filteredSituations, setFilteredSituations] = useState<Situation[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [selectedChantier, setSelectedChantier] = useState<string>('all');
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading({ isLoading: true, error: null });
        const [situationsRes, chantiersRes] = await Promise.all([
          apiClient.btp.situations.list(''),
          apiClient.btp.chantiers.list(),
        ]);
        const rawSit = situationsRes.data as unknown as { success: boolean; data: Situation[] };
        const sitData = rawSit.data;
        setSituations(sitData);
        setFilteredSituations(sitData);
        const rawCh = chantiersRes.data as unknown as { success: boolean; data: Chantier[] };
        setChantiers(rawCh.data);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load data';
        setLoading((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
        return;
      } finally {
        setLoading((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = situations;

    if (selectedChantier !== 'all') {
      filtered = filtered.filter((s) => s.chantierReference === selectedChantier);
    }

    setFilteredSituations(filtered);
  }, [selectedChantier, situations]);

  const handleValidate = async (situationId: string) => {
    try {
      setValidatingId(situationId);
      await apiClient.btp.situations.valider(situationId);

      // Update local state
      setSituations((prev) =>
        prev.map((s) =>
          s.id === situationId
            ? { ...s, valide: true, dateValidation: new Date().toISOString() }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to validate situation:', error);
    } finally {
      setValidatingId(null);
    }
  };

  if (loading.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  if (loading.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          <p>{loading.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Situations</h1>
        <p className="mt-2 text-sm text-gray-400">
          Suivi des situations de travaux et de facturation
        </p>
      </div>

      {/* Filter Section */}
      <div className="mb-8 rounded-lg bg-gray-800/20 border border-gray-700/30 p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            Filtrer par chantier
          </span>
        </div>
        <select
          value={selectedChantier}
          onChange={(e) => setSelectedChantier(e.target.value)}
          className="w-full md:w-64 bg-gray-800 border border-gray-700 text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Tous les chantiers</option>
          {chantiers.map((c) => (
            <option key={c.id} value={c.reference}>
              {c.reference} - {c.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <p className="mb-4 text-sm text-gray-400">
        {filteredSituations.length} situation(s) trouvée(s)
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg bg-gray-800 border border-gray-700 shadow-lg">
        {filteredSituations.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Chantier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  N°
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                  Dates
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">
                  Montant HT
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">
                  Montant TTC
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">
                  Taux
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSituations.map((situation) => (
                <tr
                  key={situation.id}
                  className="border-b border-gray-700 hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-white">
                        {situation.chantierReference}
                      </p>
                      <p className="text-sm text-gray-300">
                        {situation.chantierNom}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {situation.numero}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {typeLabels[situation.type] || situation.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {situation.dateEmission}
                    {situation.dateValidation && (
                      <>
                        <br />
                        <span className="text-xs text-gray-500">
                          Validé: {situation.dateValidation}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-white">
                    {(situation.montantHT / 100).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-white">
                    {(situation.montantTTC / 100).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-white">
                    {situation.tauxAvancement}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        situation.valide
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {situation.valide ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4" />
                          Validé
                        </>
                      ) : (
                        'En attente'
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {!situation.valide && (
                      <button
                        onClick={() => handleValidate(situation.id)}
                        disabled={validatingId === situation.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {validatingId === situation.id && (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        )}
                        Valider
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center">
            <p className="text-gray-500">Aucune situation trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}
