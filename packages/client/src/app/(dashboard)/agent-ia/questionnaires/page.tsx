'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  EyeIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useDemoGuard } from '@/hooks/useDemoGuard';

interface Questionnaire {
  id: string;
  date: string;
  nom: string;
  prenom: string;
  channel: 'telephone' | 'sms' | 'web';
  status: 'en_cours' | 'complete' | 'abandonne';
  nbQuestions: number;
  responses?: Array<{
    question: string;
    answer: string;
  }>;
}

export default function QuestionnairesPage() {
  const router = useRouter();
  const { isDemo, demoAlert } = useDemoGuard();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionnaire, setSelectedQuestionnaire] =
    useState<Questionnaire | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterChannel, setFilterChannel] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadQuestionnaires();
  }, [router]);

  const loadQuestionnaires = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: Record<string, any> = {};
      if (filterStatus) filters.status = filterStatus;
      if (filterChannel) filters.channel = filterChannel;

      const response = await apiClient.questionnaires.list(filters);
      if (response.success && response.data) {
        setQuestionnaires(
          (response.data.questionnaires || []) as Questionnaire[]
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(errorMessage);
      if (errorMessage.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadQuestionnaires();
  };

  const handleClearFilters = () => {
    setFilterStatus('');
    setFilterChannel('');
  };

  const handleViewQuestionnaire = async (questionnaire: Questionnaire) => {
    try {
      const response = await apiClient.questionnaires.get(questionnaire.id);
      if (response.success && response.data) {
        setSelectedQuestionnaire(response.data as unknown as Questionnaire);
        setShowModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    }
  };

  const handleDeleteQuestionnaire = async (id: string) => {
    // demo-guard: handleDeleteQuestionnaire
    if (isDemo) { demoAlert(); return; }
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce questionnaire ?')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await apiClient.questionnaires.delete(id);

      if (response.success) {
        setQuestionnaires(
          questionnaires.filter((q) => q.id !== id)
        );
        setShowModal(false);
        setSelectedQuestionnaire(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'en_cours':
        return 'bg-blue-900/30 text-blue-300 border-blue-700/30';
      case 'complete':
        return 'bg-green-900/30 text-green-300 border-green-700/30';
      case 'abandonne':
        return 'bg-red-900/30 text-red-300 border-red-700/30';
      default:
        return 'bg-gray-900/30 text-gray-300 border-gray-700/30';
    }
  };

  const getChannelLabel = (channel: string): string => {
    switch (channel) {
      case 'telephone':
        return 'Téléphone';
      case 'sms':
        return 'SMS';
      case 'web':
        return 'Web';
      default:
        return channel;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'en_cours':
        return 'En cours';
      case 'complete':
        return 'Complété';
      case 'abandonne':
        return 'Abandonné';
      default:
        return status;
    }
  };

  if (loading && questionnaires.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement des questionnaires...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Questionnaires</h1>
        <p className="mt-2 text-sm text-gray-400">
          Gestion des questionnaires remplis via différents canaux
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-400 hover:text-red-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="mb-6 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
        <h3 className="text-lg font-semibold text-white mb-4">Filtrer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Statut
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Tous les statuts</option>
              <option value="en_cours">En cours</option>
              <option value="complete">Complété</option>
              <option value="abandonne">Abandonné</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Canal
            </label>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">Tous les canaux</option>
              <option value="telephone">Téléphone</option>
              <option value="sms">SMS</option>
              <option value="web">Web</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Appliquer les filtres
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Questionnaires Table */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md overflow-hidden">
        <div className="p-6 border-b border-gray-700/30">
          <h2 className="text-xl font-bold text-white">
            Tous les questionnaires ({questionnaires.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-700/30">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Canal
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {questionnaires.length > 0 ? (
                questionnaires.map((questionnaire) => (
                  <tr
                    key={questionnaire.id}
                    className="hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(questionnaire.date).toLocaleDateString(
                        'fr-FR',
                        {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {questionnaire.nom} {questionnaire.prenom}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {getChannelLabel(questionnaire.channel)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusBadgeColor(
                          questionnaire.status
                        )}`}
                      >
                        {getStatusLabel(questionnaire.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {questionnaire.nbQuestions}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleViewQuestionnaire(questionnaire)}
                          className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                        >
                          <EyeIcon className="h-4 w-4" />
                          Voir
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteQuestionnaire(questionnaire.id)
                          }
                          className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    Aucun questionnaire trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedQuestionnaire && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700/50 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700/30 flex justify-between items-center sticky top-0 bg-gray-800">
              <h3 className="text-xl font-bold text-white">
                Détails du questionnaire
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Nom complet</p>
                  <p className="text-white font-medium">
                    {selectedQuestionnaire.nom}{' '}
                    {selectedQuestionnaire.prenom}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Date</p>
                  <p className="text-white font-medium">
                    {new Date(selectedQuestionnaire.date).toLocaleDateString(
                      'fr-FR',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Canal</p>
                  <p className="text-white font-medium">
                    {getChannelLabel(selectedQuestionnaire.channel)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Statut</p>
                  <span
                    className={`px-3 py-1 rounded-full border text-xs font-medium inline-block ${getStatusBadgeColor(
                      selectedQuestionnaire.status
                    )}`}
                  >
                    {getStatusLabel(selectedQuestionnaire.status)}
                  </span>
                </div>
              </div>

              {/* Q&A List */}
              {selectedQuestionnaire.responses &&
                selectedQuestionnaire.responses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-4">
                      Réponses ({selectedQuestionnaire.nbQuestions})
                    </h4>
                    <div className="space-y-4">
                      {selectedQuestionnaire.responses.map(
                        (response, index) => (
                          <div
                            key={index}
                            className="bg-gray-900/30 border border-gray-700/30 rounded p-4"
                          >
                            <p className="text-sm font-medium text-indigo-400 mb-2">
                              {response.question}
                            </p>
                            <p className="text-sm text-gray-300">
                              {response.answer}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Delete Button */}
              <button
                onClick={() =>
                  handleDeleteQuestionnaire(selectedQuestionnaire.id)
                }
                disabled={deleting}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
              >
                <TrashIcon className="h-5 w-5" />
                {deleting ? 'Suppression...' : 'Supprimer le questionnaire'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
