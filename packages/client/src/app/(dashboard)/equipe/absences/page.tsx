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
        return { bg: 'bg-green-500/20', text: 'text-green-400' };
      case 'Rejeté':
        return { bg: 'bg-red-500/20', text: 'text-red-400' };
      case 'En attente':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400' };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-300' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Absences</h1>
        <p className="mt-2 text-sm text-gray-400">Gestion des absences de l'équipe</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as AbsenceType | '')}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
      <div className="overflow-x-auto bg-gray-800 rounded-xl border border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Membre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Date début
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Date fin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Motif
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
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
                  <tr key={absence.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-sm text-white">
                      {absence.membre}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {absence.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {new Date(absence.dateDebut).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      {new Date(absence.dateFin).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
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
                            className="text-green-400 transition-colors hover:text-green-300"
                            title="Approuver"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReject(absence.id)}
                            className="text-red-400 transition-colors hover:text-red-300"
                            title="Rejeter"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                      {absence.statut !== 'En attente' && (
                        <span className="text-gray-500">
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
      <div className="mt-4 text-sm text-gray-400">
        Affichage de {filteredAbsences.length} sur {absences.length} absences
      </div>
    </div>
  );
}
