'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Absence {
  id: string;
  membre: string;
  type: string;
  dateDebut: string;
  dateFin: string;
  motif: string;
  statut: string;
}

type AbsenceType = 'Congé' | 'Maladie' | 'Autre';
type AbsenceStatut = 'Approuvé' | 'Rejeté' | 'En attente';

export default function AbsencesPage(): JSX.Element {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [filteredAbsences, setFilteredAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AbsenceType | ''>('');
  const [selectedStatut, setSelectedStatut] = useState<AbsenceStatut | ''>('');

  const absenceTypes: AbsenceType[] = ['Congé', 'Maladie', 'Autre'];
  const absenceStatuts: AbsenceStatut[] = ['Approuvé', 'Rejeté', 'En attente'];

  useEffect(() => {
    const fetchAbsences = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await apiClient.equipe.absences.list();
        const absencesData = response.data as unknown as Absence[];
        setAbsences(absencesData);
        setFilteredAbsences(absencesData);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAbsences();
  }, []);

  useEffect(() => {
    let filtered = absences;

    if (selectedType) {
      filtered = filtered.filter((a) => a.type === selectedType);
    }

    if (selectedStatut) {
      filtered = filtered.filter((a) => a.statut === selectedStatut);
    }

    setFilteredAbsences(filtered);
  }, [selectedType, selectedStatut, absences]);

  const handleApprove = async (id: string): Promise<void> => {
    try {
      await apiClient.equipe.absences.update(id, { statut: 'Approuvé' });
      setAbsences(
        absences.map((a) =>
          a.id === id ? { ...a, statut: 'Approuvé' } : a
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de l\'approbation'
      );
    }
  };

  const handleReject = async (id: string): Promise<void> => {
    try {
      await apiClient.equipe.absences.update(id, { statut: 'Rejeté' });
      setAbsences(
        absences.map((a) =>
          a.id === id ? { ...a, statut: 'Rejeté' } : a
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors du rejet'
      );
    }
  };

  const getStatutBadgeColor = (
    statut: string
  ): Record<string, string> => {
    switch (statut) {
      case 'Approuvé':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'Rejeté':
        return { bg: 'bg-red-100', text: 'text-red-800' };
      case 'En attente':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Absences</h1>
        <p className="mt-2 text-gray-600">Gestion des absences de l'équipe</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as AbsenceType | '')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tous les types</option>
            {absenceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Statut Filter */}
          <select
            value={selectedStatut}
            onChange={(e) => setSelectedStatut(e.target.value as AbsenceStatut | '')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            {absenceStatuts.map((statut) => (
              <option key={statut} value={statut}>
                {statut}
              </option>
            ))}
          </select>
        </div>
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
                Type
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Date début
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Date fin
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Motif
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAbsences.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Aucune absence trouvée
                </td>
              </tr>
            ) : (
              filteredAbsences.map((absence) => {
                const badgeColor = getStatutBadgeColor(absence.statut);
                return (
                  <tr key={absence.id} className="border-b border-gray-200">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {absence.membre}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {absence.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(absence.dateDebut).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(absence.dateFin).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {absence.motif}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeColor.bg} ${badgeColor.text}`}
                      >
                        {absence.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {absence.statut === 'En attente' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(absence.id)}
                            className="text-green-600 transition-colors hover:text-green-800"
                            title="Approuver"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReject(absence.id)}
                            className="text-red-600 transition-colors hover:text-red-800"
                            title="Rejeter"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                      {absence.statut !== 'En attente' && (
                        <span className="text-gray-400">
                          <ExclamationTriangleIcon className="h-5 w-5" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-600">
        Affichage de {filteredAbsences.length} sur {absences.length} absences
      </div>
    </div>
  );
}
