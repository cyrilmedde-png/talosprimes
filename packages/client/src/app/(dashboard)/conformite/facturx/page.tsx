'use client';

import { useState, useEffect } from 'react';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

type FacturXItem = {
  id: string;
  invoiceId: string;
  profil: 'minimum' | 'basic' | 'en16931';
  formatXml: 'CII' | 'UBL';
  plateformeType: string | null;
  statutTransmission: 'non_transmis' | 'en_cours' | 'transmis' | 'accepte' | 'refuse';
  dateTransmission: string | null;
  identifiantFlux: string | null;
};

export default function FacturXPage(): JSX.Element {
  const [facturXList, setFacturXList] = useState<FacturXItem[]>([]);
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [profil, setProfil] = useState<'minimum' | 'basic' | 'en16931'>('basic');
  const [formatXml, setFormatXml] = useState<'CII' | 'UBL'>('UBL');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFacturXList();
  }, []);

  const loadFacturXList = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.conformite.facturx.liste();
      setFacturXList(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerer = async (): Promise<void> => {
    if (!invoiceId.trim()) {
      setError('Veuillez entrer un ID de facture');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      await apiClient.conformite.facturx.generer({
        invoiceId: invoiceId.trim(),
        profil,
        formatXml,
      });
      setInvoiceId('');
      await loadFacturXList();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la génération';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTransmettre = async (id: string): Promise<void> => {
    setError(null);
    try {
      await apiClient.conformite.facturx.transmettre(id);
      await loadFacturXList();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la transmission';
      setError(message);
    }
  };

  const handleVerifierStatut = async (id: string): Promise<void> => {
    setError(null);
    try {
      await apiClient.conformite.facturx.verifierStatut(id);
      await loadFacturXList();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la vérification';
      setError(message);
    }
  };

  const getStatutBadgeColor = (statut: FacturXItem['statutTransmission']): string => {
    switch (statut) {
      case 'non_transmis':
        return 'bg-gray-700 text-gray-100';
      case 'en_cours':
        return 'bg-yellow-600 text-yellow-50';
      case 'transmis':
        return 'bg-blue-600 text-blue-50';
      case 'accepte':
        return 'bg-green-600 text-green-50';
      case 'refuse':
        return 'bg-red-600 text-red-50';
      default:
        return 'bg-gray-700 text-gray-100';
    }
  };

  const getStatutLabel = (statut: FacturXItem['statutTransmission']): string => {
    switch (statut) {
      case 'non_transmis':
        return 'Non transmise';
      case 'en_cours':
        return 'En cours';
      case 'transmis':
        return 'Transmise';
      case 'accepte':
        return 'Acceptée';
      case 'refuse':
        return 'Refusée';
      default:
        return statut;
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <DocumentArrowUpIcon className="h-8 w-8 text-amber-500" />
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Facturation Électronique Factur-X</h1>
            <Link href="/conformite" className="text-amber-500 hover:text-amber-400 text-sm mt-2">
              ← Retour à la conformité
            </Link>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-900 bg-opacity-30 border border-amber-700 rounded-lg p-4 mb-8">
          <p className="text-amber-100">
            <span className="font-semibold">Obligation sept. 2026:</span> réception.{' '}
            <span className="font-semibold">Sept. 2027:</span> émission pour PME/TPE
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 mb-8">
            <p className="text-red-100">{error}</p>
          </div>
        )}

        {/* Generate Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-amber-400">Générer une facture Factur-X</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">ID Facture (UUID)</label>
              <input
                type="text"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                placeholder="ex: 123e4567-e89b-12d3-a456-426614174000"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Profil</label>
              <select
                value={profil}
                onChange={(e) => setProfil(e.target.value as 'minimum' | 'basic' | 'en16931')}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="minimum">Minimum</option>
                <option value="basic">Basic</option>
                <option value="en16931">EN16931</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Format XML</label>
              <select
                value={formatXml}
                onChange={(e) => setFormatXml(e.target.value as 'CII' | 'UBL')}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="CII">CII</option>
                <option value="UBL">UBL</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerer}
                disabled={isGenerating}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded transition"
              >
                {isGenerating ? 'Génération...' : 'Générer Factur-X'}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700 border-b border-gray-600">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-amber-400">Facture</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-amber-400">Profil</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-amber-400">Format</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-amber-400">Plateforme</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-amber-400">
                    Statut transmission
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-amber-400">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-amber-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : facturXList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      Aucune facture Factur-X
                    </td>
                  </tr>
                ) : (
                  facturXList.map((item) => (
                    <tr key={item.id} className="border-t border-gray-700 hover:bg-gray-700 transition">
                      <td className="px-6 py-4 text-sm text-gray-100">{item.invoiceId.slice(0, 8)}...</td>
                      <td className="px-6 py-4 text-sm text-gray-100 uppercase">{item.profil}</td>
                      <td className="px-6 py-4 text-sm text-gray-100">{item.formatXml}</td>
                      <td className="px-6 py-4 text-sm text-gray-100">
                        {item.plateformeType || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatutBadgeColor(item.statutTransmission)}`}
                        >
                          {getStatutLabel(item.statutTransmission)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-100">{formatDate(item.dateTransmission)}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          {item.statutTransmission === 'non_transmis' && (
                            <button
                              onClick={() => handleTransmettre(item.id)}
                              className="text-amber-500 hover:text-amber-400 font-medium text-xs"
                            >
                              Transmettre
                            </button>
                          )}
                          {(item.statutTransmission === 'en_cours' ||
                            item.statutTransmission === 'transmis') && (
                            <button
                              onClick={() => handleVerifierStatut(item.id)}
                              className="text-blue-500 hover:text-blue-400 font-medium text-xs"
                            >
                              Vérifier statut
                            </button>
                          )}
                        </div>
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
