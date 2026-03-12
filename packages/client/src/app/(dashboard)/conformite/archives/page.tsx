'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArchiveBoxIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

type ArchiveItem = {
  id: string;
  exerciceId: string;
  typeArchive: string;
  nomFichier: string;
  hashSha256: string;
  tailleFichier: number;
  horodatage: string;
  dateExpirationMin: string;
  dateExpirationMax: string;
  statut: 'actif' | 'verrouille' | 'archive';
};

type Exercice = {
  id: string;
  code: string;
  dateDebut: string;
  dateFin: string;
  cloture: boolean;
};

type IntegrityResult = {
  valid: boolean;
  message: string;
};

const statutBadgeColors: Record<ArchiveItem['statut'], string> = {
  actif: 'bg-green-900 text-green-100',
  verrouille: 'bg-amber-900 text-amber-100',
  archive: 'bg-gray-700 text-gray-300',
};

const statutLabels: Record<ArchiveItem['statut'], string> = {
  actif: 'Actif',
  verrouille: 'Verrouillé',
  archive: 'Archivé',
};

const archiveTypeLabels: Record<string, string> = {
  fec: 'FEC',
  grand_livre: 'Grand Livre',
  balance: 'Balance',
  bilan: 'Bilan',
  journal: 'Journal',
  tva: 'TVA',
};

const bytesFormatter = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

export default function ArchivesPage(): JSX.Element {
  const router = useRouter();
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState('');
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingArchive, setCreatingArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newArchive, setNewArchive] = useState({
    typeArchive: 'fec',
  });
  const [verifyingArchiveId, setVerifyingArchiveId] = useState<string | null>(
    null
  );
  const [verifyResults, setVerifyResults] = useState<
    Record<string, IntegrityResult>
  >({});

  useEffect(() => {
    const loadExercices = async (): Promise<void> => {
      try {
        const response = await apiClient.comptabilite.exercices();
        setExercices(response as Exercice[]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement'
        );
      }
    };

    loadExercices();
  }, []);

  useEffect(() => {
    if (!selectedExercice) return;

    const loadArchives = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await apiClient.conformite.archives.liste({
          exerciceId: selectedExercice,
        });
        setArchives(response as ArchiveItem[]);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement'
        );
      } finally {
        setLoading(false);
      }
    };

    loadArchives();
  }, [selectedExercice]);

  const handleCreateArchive = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (!selectedExercice) {
      setError('Veuillez sélectionner un exercice');
      return;
    }

    try {
      setCreatingArchive(true);
      await apiClient.conformite.archives.creer({
        exerciceId: selectedExercice,
        typeArchive: newArchive.typeArchive,
      });

      setNewArchive({ typeArchive: 'fec' });
      setError(null);

      const response = await apiClient.conformite.archives.liste({
        exerciceId: selectedExercice,
      });
      setArchives(response as ArchiveItem[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de la création'
      );
    } finally {
      setCreatingArchive(false);
    }
  };

  const handleVerifyIntegrity = async (archiveId: string): Promise<void> => {
    try {
      setVerifyingArchiveId(archiveId);
      const response = (await apiClient.conformite.archives.verifierIntegrite(
        archiveId
      )) as IntegrityResult;
      setVerifyResults((prev) => ({
        ...prev,
        [archiveId]: response,
      }));
    } catch (err) {
      setVerifyResults((prev) => ({
        ...prev,
        [archiveId]: {
          valid: false,
          message:
            err instanceof Error
              ? err.message
              : 'Erreur lors de la vérification',
        },
      }));
    } finally {
      setVerifyingArchiveId(null);
    }
  };

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
          <ArchiveBoxIcon className="w-8 h-8 text-amber-500" />
          <h1 className="text-3xl font-bold">Archivage Légal</h1>
        </div>

        {/* Info Banner */}
        <div className="bg-gray-800 border-l-4 border-amber-500 p-4 mb-6 rounded">
          <p className="text-sm text-gray-300">
            Conservation : 6 ans (fiscal, LPF art. L.102B) — 10 ans (commercial,
            Code de commerce art. L.123-22)
          </p>
        </div>

        {error && (
          <div className="bg-red-900 text-red-100 p-4 rounded mb-6">
            {error}
          </div>
        )}

        {/* Create Archive Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Créer une archive</h2>

          <form onSubmit={handleCreateArchive} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exercice comptable
                </label>
                <select
                  value={selectedExercice}
                  onChange={(e) => setSelectedExercice(e.target.value)}
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type d'archive
                </label>
                <select
                  value={newArchive.typeArchive}
                  onChange={(e) =>
                    setNewArchive({
                      ...newArchive,
                      typeArchive: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="fec">FEC</option>
                  <option value="grand_livre">Grand Livre</option>
                  <option value="balance">Balance</option>
                  <option value="bilan">Bilan</option>
                  <option value="journal">Journal</option>
                  <option value="tva">TVA</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedExercice || creatingArchive}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:opacity-50 rounded text-white font-medium transition"
            >
              {creatingArchive ? 'Archivage en cours...' : 'Archiver'}
            </button>
          </form>
        </div>

        {/* Archives Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ) : archives.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Aucune archive trouvée
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700 border-b border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Nom fichier
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Exercice
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Hash SHA-256
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Taille
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Horodatage
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Expiration
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {archives.map((archive) => (
                      <tr
                        key={archive.id}
                        className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                      >
                        <td className="px-6 py-4 font-mono text-amber-400">
                          {archive.nomFichier}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {archiveTypeLabels[archive.typeArchive] ||
                            archive.typeArchive}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {exercices.find((ex) => ex.id === archive.exerciceId)
                            ?.code || 'N/A'}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-400 truncate max-w-xs">
                          {archive.hashSha256}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {bytesFormatter(archive.tailleFichier)}
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {new Date(archive.horodatage).toLocaleDateString(
                            'fr-FR'
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          <div className="text-xs text-gray-400">
                            Min:{' '}
                            {new Date(
                              archive.dateExpirationMin
                            ).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="text-xs text-gray-400">
                            Max:{' '}
                            {new Date(
                              archive.dateExpirationMax
                            ).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${statutBadgeColors[archive.statut]}`}
                          >
                            {statutLabels[archive.statut]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleVerifyIntegrity(archive.id)}
                              disabled={verifyingArchiveId === archive.id}
                              className="px-3 py-1 bg-blue-900 hover:bg-blue-800 disabled:bg-gray-700 disabled:opacity-50 rounded text-xs text-blue-100 transition"
                            >
                              {verifyingArchiveId === archive.id
                                ? 'Vérification...'
                                : 'Vérifier'}
                            </button>

                            {verifyResults[archive.id] && (
                              <div className="flex items-center gap-1">
                                {verifyResults[archive.id].valid ? (
                                  <>
                                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                    <span className="text-xs text-green-300">
                                      OK
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <XCircleIcon className="w-5 h-5 text-red-500" />
                                    <span className="text-xs text-red-300">
                                      Erreur
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
