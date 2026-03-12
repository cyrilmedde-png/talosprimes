'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDaysIcon,
  ArrowLeftIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

type PeriodeItem = {
  id: string;
  exerciceId: string;
  code: string;
  mois: number;
  annee: number;
  dateDebut: string;
  dateFin: string;
  cloture: boolean;
  dateCloture: string | null;
};

type Exercice = {
  id: string;
  code: string;
  dateDebut: string;
  dateFin: string;
  cloture: boolean;
};

const monthNames = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export default function PeriodesPeriode(): JSX.Element {
  const router = useRouter();
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState('');
  const [periodes, setPeriodes] = useState<PeriodeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingPeriodes, setGeneratingPeriodes] = useState(false);
  const [closingPeriodeId, setClosingPeriodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClosing, setConfirmClosing] = useState<string | null>(null);

  useEffect(() => {
    const loadExercices = async (): Promise<void> => {
      try {
        const response = await apiClient.comptabilite.exercices();
        const exercicesList = response?.data?.exercices ?? [];
        setExercices(exercicesList.map((ex) => ({
          id: ex.id,
          code: ex.code,
          dateDebut: ex.dateDebut,
          dateFin: ex.dateFin,
          cloture: ex.cloture,
        })));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement'
        );
      }
    };

    loadExercices();
  }, []);

  useEffect(() => {
    if (!selectedExercice) {
      setPeriodes([]);
      return;
    }

    const loadPeriodes = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await apiClient.conformite.periodes.liste(
          selectedExercice
        );
        const periodesList = (response?.data as Record<string, unknown>)?.periodes;
        setPeriodes(Array.isArray(periodesList) ? periodesList as PeriodeItem[] : []);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPeriodes();
  }, [selectedExercice]);

  const handleGeneratePeriodes = async (): Promise<void> => {
    if (!selectedExercice) {
      setError('Veuillez sélectionner un exercice');
      return;
    }

    try {
      setGeneratingPeriodes(true);
      await apiClient.conformite.periodes.generer(selectedExercice);
      setError(null);

      const response = await apiClient.conformite.periodes.liste(
        selectedExercice
      );
      const periodesList = (response?.data as Record<string, unknown>)?.periodes;
      setPeriodes(Array.isArray(periodesList) ? periodesList as PeriodeItem[] : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de la génération'
      );
    } finally {
      setGeneratingPeriodes(false);
    }
  };

  const handleClosePeriode = async (periodeId: string): Promise<void> => {
    try {
      setClosingPeriodeId(periodeId);
      await apiClient.conformite.periodes.cloturer(periodeId);
      setError(null);
      setConfirmClosing(null);

      const response = await apiClient.conformite.periodes.liste(
        selectedExercice
      );
      const updatedList = (response?.data as Record<string, unknown>)?.periodes;
      setPeriodes(Array.isArray(updatedList) ? updatedList as PeriodeItem[] : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de la clôture'
      );
    } finally {
      setClosingPeriodeId(null);
    }
  };

  const sortedPeriodes = [...periodes].sort((a, b) => a.mois - b.mois);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
            aria-label="Retour"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <CalendarDaysIcon className="w-8 h-8 text-amber-500" />
          <h1 className="text-3xl font-bold">Périodes Comptables</h1>
        </div>

        {/* Info Banner */}
        <div className="bg-gray-800 border-l-4 border-amber-500 p-4 mb-6 rounded">
          <p className="text-sm text-gray-300">
            Gestion des périodes mensuelles pour bloquer les écritures
            rétroactives
          </p>
        </div>

        {error && (
          <div className="bg-red-900 text-red-100 p-4 rounded mb-6">
            {error}
          </div>
        )}

        {/* Generate Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Générer les périodes</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Exercice comptable
              </label>
              <select
                value={selectedExercice}
                onChange={(e) => {
                  setSelectedExercice(e.target.value);
                  setConfirmClosing(null);
                }}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Sélectionner --</option>
                {exercices.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.code} ({new Date(ex.dateDebut).getFullYear()})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGeneratePeriodes}
              disabled={!selectedExercice || generatingPeriodes || periodes.length > 0}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:opacity-50 rounded text-white font-medium transition"
            >
              {generatingPeriodes
                ? 'Génération en cours...'
                : 'Générer les 12 périodes'}
            </button>
          </div>
        </div>

        {/* Périodes Grid */}
        {selectedExercice && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-full text-center text-gray-400 py-8">
                Chargement...
              </div>
            ) : sortedPeriodes.length === 0 ? (
              <div className="col-span-full text-center text-gray-400 py-8">
                Aucune période générée
              </div>
            ) : (
              sortedPeriodes.map((periode) => (
                <div
                  key={periode.id}
                  className={`rounded-lg p-6 border ${
                    periode.cloture
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-gray-800 border-gray-700 hover:border-amber-500 transition'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      {monthNames[periode.mois - 1]}
                    </h3>
                    {periode.cloture ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-600 rounded-full">
                        <LockClosedIcon className="w-4 h-4 text-gray-300" />
                        <span className="text-xs text-gray-300 font-medium">
                          Clôturé
                        </span>
                      </div>
                    ) : (
                      <span className="px-2 py-1 bg-green-900 rounded-full text-xs text-green-100 font-medium">
                        Ouvert
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Dates</p>
                      <p className="text-sm text-gray-300">
                        {new Date(periode.dateDebut).toLocaleDateString(
                          'fr-FR'
                        )}{' '}
                        -{' '}
                        {new Date(periode.dateFin).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {periode.cloture && periode.dateCloture && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">
                          Date de clôture
                        </p>
                        <p className="text-sm text-gray-300">
                          {new Date(periode.dateCloture).toLocaleDateString(
                            'fr-FR'
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {!periode.cloture && (
                    <div className="flex gap-2">
                      {confirmClosing === periode.id ? (
                        <>
                          <button
                            onClick={() =>
                              handleClosePeriode(periode.id)
                            }
                            disabled={closingPeriodeId === periode.id}
                            className="flex-1 px-3 py-1 bg-red-900 hover:bg-red-800 disabled:bg-gray-700 disabled:opacity-50 rounded text-xs text-red-100 font-medium transition"
                          >
                            {closingPeriodeId === periode.id
                              ? 'Clôture...'
                              : 'Confirmer'}
                          </button>
                          <button
                            onClick={() => setConfirmClosing(null)}
                            className="flex-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 font-medium transition"
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmClosing(periode.id)}
                          className="w-full px-3 py-1 bg-amber-900 hover:bg-amber-800 rounded text-xs text-amber-100 font-medium transition"
                        >
                          Clôturer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
