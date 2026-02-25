'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ChartBarIcon,
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
        setSituations(situationsRes.data as unknown as Situation[]);
        setFilteredSituations(situationsRes.data as unknown as Situation[]);
        setChantiers(chantiersRes.data as unknown as Chantier[]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load data';
        setLoading({ isLoading: false, error: errorMessage });
      } finally {
        setLoading({ isLoading: false, error: null });
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
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
        </div>
      </div>
    );
  }

  if (loading.error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{loading.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Situations</h1>
        <p className="mt-2 text-gray-600">
          Suivi des situations de travaux et de facturation
        </p>
      </div>

      {/* Filter Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Filtrer par chantier
          </span>
        </div>
        <select
          value={selectedChantier}
          onChange={(e) => setSelectedChantier(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none md:w-64"
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
      <p className="text-sm text-gray-600">
        {filteredSituations.length} situation(s) trouvée(s)
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        {filteredSituations.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Chantier
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  N°
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Montant HT
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Montant TTC
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Taux
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSituations.map((situation) => (
                <tr
                  key={situation.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {situation.chantierReference}
                      </p>
                      <p className="text-sm text-gray-600">
                        {situation.chantierNom}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {situation.numero}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {typeLabels[situation.type] || situation.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
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
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {(situation.montantHT / 100).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {(situation.montantTTC / 100).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                    {situation.tauxAvancement}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        situation.valide
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
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
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <p className="text-gray-600">Aucune situation trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}
