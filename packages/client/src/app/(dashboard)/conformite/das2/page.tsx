'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentTextIcon, ChevronLeftIcon, ArrowUpTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

type Exercice = {
  id: string;
  code: string;
  dateDebut: string;
  dateFin: string;
  cloture: boolean;
};

type Das2Beneficiaire = {
  id: string;
  denominationRs: string;
  siret: string | null;
  montantHonoraires: number;
  montantTva: number;
  naturePrestation: string;
  avantagesNature: number;
  indemnites: number;
};

type Das2Item = {
  id: string;
  exerciceId: string;
  annee: number;
  seuilMinimum: number;
  statut: 'brouillon' | 'valide' | 'transmis';
  dateTransmission: string | null;
};

type Das2Detail = Das2Item & {
  beneficiaires: Das2Beneficiaire[];
};

type FormData = {
  exerciceId: string;
  annee: number;
  seuilMinimum: number;
};

const statutBadgeColor = (statut: string): string => {
  switch (statut) {
    case 'brouillon':
      return 'bg-gray-700 text-gray-200';
    case 'valide':
      return 'bg-yellow-900 text-yellow-100';
    case 'transmis':
      return 'bg-green-900 text-green-100';
    default:
      return 'bg-gray-700 text-gray-200';
  }
};

const statutLabel = (statut: string): string => {
  const labels: Record<string, string> = {
    brouillon: 'Brouillon',
    valide: 'Validé',
    transmis: 'Transmis',
  };
  return labels[statut] || statut;
};

export default function Das2Page() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    exerciceId: '',
    annee: new Date().getFullYear(),
    seuilMinimum: 1200,
  });
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [items, setItems] = useState<Das2Item[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<Das2Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transmitting, setTransmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [exercicesData, itemsData] = await Promise.all([
          apiClient.comptabilite.exercices(),
          apiClient.conformite.das2.liste(),
        ]);
        setExercices(exercicesData);
        setItems(itemsData);
        if (exercicesData.length > 0) {
          setFormData((prev) => ({
            ...prev,
            exerciceId: exercicesData[0].id,
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
        setExercices([]);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'annee' || name === 'seuilMinimum' ? Number(value) : value,
    }));
  };

  const handleGenerer = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await apiClient.conformite.das2.generer(formData);
      setFormData({
        exerciceId: exercices[0]?.id || '',
        annee: new Date().getFullYear(),
        seuilMinimum: 1200,
      });
      const response = await apiClient.conformite.das2.liste();
      setItems(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpandRow = async (id: string): Promise<void> => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    try {
      const detail = await apiClient.conformite.das2.get(id);
      setExpandedId(id);
      setExpandedDetail(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du détail');
    }
  };

  const handleTransmettre = async (id: string): Promise<void> => {
    try {
      setTransmitting(id);
      await apiClient.conformite.das2.transmettre(id);
      const response = await apiClient.conformite.das2.liste();
      setItems(response);
      setExpandedId(null);
      setExpandedDetail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la transmission');
    } finally {
      setTransmitting(null);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string | null): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/conformite')}
            className="p-2 hover:bg-gray-800 rounded-lg transition"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <DocumentTextIcon className="w-8 h-8 text-amber-500" />
          <h1 className="text-3xl font-bold">DAS2 — Déclaration des Honoraires</h1>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-8">
          <p className="text-blue-100">
            Obligatoire pour tout versement d'honoraires &gt; 1 200 € / an (comptes 622x)
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 mb-8">
            <p className="text-red-100">{error}</p>
          </div>
        )}

        {/* Generate Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-xl font-semibold mb-6">Générer DAS2</h2>
          <form onSubmit={handleGenerer} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Exercice</label>
                <select
                  name="exerciceId"
                  value={formData.exerciceId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  required
                >
                  <option value="">Sélectionner un exercice</option>
                  {exercices.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Année</label>
                <input
                  type="number"
                  name="annee"
                  value={formData.annee}
                  onChange={handleInputChange}
                  min="2020"
                  max="2099"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Seuil minimum (€)</label>
                <input
                  type="number"
                  name="seuilMinimum"
                  value={formData.seuilMinimum}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || !formData.exerciceId}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              {submitting ? 'Génération...' : 'Générer DAS2'}
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="w-12 px-6 py-4"></th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Année</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Seuil</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Statut</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Transmission</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      Aucune déclaration
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tbody key={item.id}>
                      <tr
                        className="hover:bg-gray-700 transition cursor-pointer"
                        onClick={() => handleExpandRow(item.id)}
                      >
                        <td className="px-6 py-4">
                          <ChevronDownIcon
                            className={`w-5 h-5 transition ${expandedId === item.id ? 'rotate-180' : ''}`}
                          />
                        </td>
                        <td className="px-6 py-4 text-sm">{item.annee}</td>
                        <td className="px-6 py-4 text-sm">{formatCurrency(item.seuilMinimum)}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statutBadgeColor(item.statut)}`}
                          >
                            {statutLabel(item.statut)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">{formatDate(item.dateTransmission)}</td>
                        <td className="px-6 py-4 text-sm">
                          {item.statut === 'valide' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTransmettre(item.id);
                              }}
                              disabled={transmitting === item.id}
                              className="flex items-center gap-2 px-3 py-1 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm transition"
                            >
                              <ArrowUpTrayIcon className="w-4 h-4" />
                              {transmitting === item.id ? 'Transmission...' : 'Transmettre'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedId === item.id && expandedDetail && (
                        <tr className="bg-gray-700 bg-opacity-50">
                          <td colSpan={6} className="px-6 py-6">
                            <div>
                              <h3 className="text-lg font-semibold mb-4">Bénéficiaires</h3>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-600">
                                      <th className="px-4 py-2 text-left font-medium">Dénomination</th>
                                      <th className="px-4 py-2 text-left font-medium">SIRET</th>
                                      <th className="px-4 py-2 text-left font-medium">Nature</th>
                                      <th className="px-4 py-2 text-right font-medium">Honoraires</th>
                                      <th className="px-4 py-2 text-right font-medium">TVA</th>
                                      <th className="px-4 py-2 text-right font-medium">Avantages Nature</th>
                                      <th className="px-4 py-2 text-right font-medium">Indemnités</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-600">
                                    {expandedDetail.beneficiaires.map((ben) => (
                                      <tr key={ben.id} className="hover:bg-gray-600 transition">
                                        <td className="px-4 py-3">{ben.denominationRs}</td>
                                        <td className="px-4 py-3">{ben.siret || '-'}</td>
                                        <td className="px-4 py-3">{ben.naturePrestation}</td>
                                        <td className="px-4 py-3 text-right">
                                          {formatCurrency(ben.montantHonoraires)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          {formatCurrency(ben.montantTva)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          {formatCurrency(ben.avantagesNature)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          {formatCurrency(ben.indemnites)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
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
