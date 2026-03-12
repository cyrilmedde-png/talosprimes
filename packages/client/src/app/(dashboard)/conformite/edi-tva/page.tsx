'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BanknotesIcon, ChevronLeftIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

type EdiTvaItem = {
  id: string;
  declarationTvaId: string;
  periodeDebut: string;
  periodeFin: string;
  regimeTva: string;
  formulaireCerfa: string;
  ligneTvaDue: number;
  ligneCreditTva: number;
  statutTransmission: string;
  dateTransmission: string | null;
};

type FormData = {
  declarationTvaId: string;
  regimeTva: 'reel_normal' | 'reel_simplifie' | 'mini_reel';
  formulaireCerfa: 'CA3' | 'CA12';
};

const regimeTvaLabels: Record<string, string> = {
  reel_normal: 'Régime réel normal',
  reel_simplifie: 'Régime réel simplifié',
  mini_reel: 'Mini-réel',
};

const cerfarLabels: Record<string, string> = {
  CA3: 'CA3 - Professionnel',
  CA12: 'CA12 - Micro-entreprise',
};

const statutBadgeColor = (statut: string): string => {
  switch (statut) {
    case 'brouillon':
      return 'bg-gray-700 text-gray-200';
    case 'genere':
      return 'bg-yellow-900 text-yellow-100';
    case 'transmis':
      return 'bg-blue-900 text-blue-100';
    case 'accepte':
      return 'bg-green-900 text-green-100';
    case 'rejete':
      return 'bg-red-900 text-red-100';
    default:
      return 'bg-gray-700 text-gray-200';
  }
};

const statutLabel = (statut: string): string => {
  const labels: Record<string, string> = {
    brouillon: 'Brouillon',
    genere: 'Généré',
    transmis: 'Transmis',
    accepte: 'Accepté',
    rejete: 'Rejeté',
  };
  return labels[statut] || statut;
};

export default function EdiTvaPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    declarationTvaId: '',
    regimeTva: 'reel_normal',
    formulaireCerfa: 'CA3',
  });
  const [items, setItems] = useState<EdiTvaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transmitting, setTransmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const response = await apiClient.conformite.ediTva.liste();
        setItems(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenerer = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await apiClient.conformite.ediTva.generer(formData);
      setFormData({
        declarationTvaId: '',
        regimeTva: 'reel_normal',
        formulaireCerfa: 'CA3',
      });
      const response = await apiClient.conformite.ediTva.liste();
      setItems(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransmettre = async (id: string): Promise<void> => {
    try {
      setTransmitting(id);
      await apiClient.conformite.ediTva.transmettre(id);
      const response = await apiClient.conformite.ediTva.liste();
      setItems(response);
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
          <BanknotesIcon className="w-8 h-8 text-amber-500" />
          <h1 className="text-3xl font-bold">EDI-TVA — Télédéclaration</h1>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-8">
          <p className="text-blue-100">
            Télédéclaration obligatoire pour toutes les entreprises (EDIFACT)
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
          <h2 className="text-xl font-semibold mb-6">Générer EDI-TVA</h2>
          <form onSubmit={handleGenerer} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">ID Déclaration TVA</label>
                <input
                  type="text"
                  name="declarationTvaId"
                  value={formData.declarationTvaId}
                  onChange={handleInputChange}
                  placeholder="UUID"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Régime TVA</label>
                <select
                  name="regimeTva"
                  value={formData.regimeTva}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="reel_normal">Régime réel normal</option>
                  <option value="reel_simplifie">Régime réel simplifié</option>
                  <option value="mini_reel">Mini-réel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Formulaire CERFA</label>
                <select
                  name="formulaireCerfa"
                  value={formData.formulaireCerfa}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="CA3">CA3 - Professionnel</option>
                  <option value="CA12">CA12 - Micro-entreprise</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || !formData.declarationTvaId}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              {submitting ? 'Génération...' : 'Générer EDI-TVA'}
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Période</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Régime</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Cerfa</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">TVA Due</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">Crédit TVA</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Statut</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Transmission</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                      Aucune déclaration
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-700 transition">
                      <td className="px-6 py-4 text-sm">
                        {new Date(item.periodeDebut).toLocaleDateString('fr-FR')} -{' '}
                        {new Date(item.periodeFin).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {regimeTvaLabels[item.regimeTva] || item.regimeTva}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {cerfarLabels[item.formulaireCerfa] || item.formulaireCerfa}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">{formatCurrency(item.ligneTvaDue)}</td>
                      <td className="px-6 py-4 text-sm text-right">
                        {formatCurrency(item.ligneCreditTva)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statutBadgeColor(item.statutTransmission)}`}
                        >
                          {statutLabel(item.statutTransmission)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{formatDate(item.dateTransmission)}</td>
                      <td className="px-6 py-4 text-sm">
                        {item.statutTransmission === 'genere' && (
                          <button
                            onClick={() => handleTransmettre(item.id)}
                            disabled={transmitting === item.id}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm transition"
                          >
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            {transmitting === item.id ? 'Transmission...' : 'Transmettre'}
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
