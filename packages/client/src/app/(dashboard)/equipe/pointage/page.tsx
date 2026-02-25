'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { PlusIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Pointage {
  id: string;
  membre: string;
  date: string;
  arrivee: string;
  depart: string;
  pause: number;
  heuresTravaillees: number;
}

export default function PointagePage(): JSX.Element {
  const [pointages, setPointages] = useState<Pointage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    const fetchPointages = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await apiClient.equipe.pointages.list({ dateFrom: selectedDate });
        setPointages(response.data as unknown as Pointage[]);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPointages();
  }, [selectedDate]);

  const formatTime = (time: string): string => {
    if (!time) return '--:--';
    return time.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pointage</h1>
          <p className="mt-2 text-gray-600">Gestion des heures de travail</p>
        </div>
        <button className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
          <PlusIcon className="h-5 w-5" />
          <span>Ajouter pointage</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Date Selector */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">
          Sélectionner une date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="mt-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Membre
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Arrivée
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Départ
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Pause (min)
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Heures travaillées
              </th>
            </tr>
          </thead>
          <tbody>
            {pointages.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Aucun pointage pour cette date
                </td>
              </tr>
            ) : (
              pointages.map((pointage) => (
                <tr key={pointage.id} className="border-b border-gray-200">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {pointage.membre}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(pointage.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                      <span>{formatTime(pointage.arrivee)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                      <span>{formatTime(pointage.depart)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {pointage.pause}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center space-x-1 rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                      <ClockIcon className="h-4 w-4" />
                      <span>{pointage.heuresTravaillees}h</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">Total pointages</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {pointages.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">Heures totales</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {pointages
              .reduce((acc, p) => acc + p.heuresTravaillees, 0)
              .toFixed(1)}
            h
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">Pause totale</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {pointages.reduce((acc, p) => acc + p.pause, 0)} min
          </p>
        </div>
      </div>
    </div>
  );
}
