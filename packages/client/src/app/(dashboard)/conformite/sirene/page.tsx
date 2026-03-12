'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

type SireneResult = {
  id: string;
  siret: string;
  siren: string;
  denominationRs: string | null;
  adresseSiege: string | null;
  codePostal: string | null;
  ville: string | null;
  codeAPE: string | null;
  formeJuridique: string | null;
  tvaIntracom: string | null;
  effectif: string | null;
  dateCreation: string | null;
  estActif: boolean;
  dateVerification: string;
};

const validateSiret = (siret: string): boolean => {
  const cleaned = siret.replace(/\s/g, '');
  return /^\d{14}$/.test(cleaned);
};

export default function SirenePage() {
  const router = useRouter();
  const [singleSiret, setSingleSiret] = useState('');
  const [bulkSirets, setBulkSirets] = useState('');
  const [singleResult, setSingleResult] = useState<SireneResult | null>(null);
  const [historique, setHistorique] = useState<SireneResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifySingleLoading, setVerifySingleLoading] = useState(false);
  const [verifyBulkLoading, setVerifyBulkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistorique = async () => {
      try {
        setLoading(true);
        const response = await apiClient.conformite.sirene.historique();
        const list = (response?.data as Record<string, unknown>)?.historique;
        setHistorique(Array.isArray(list) ? list as SireneResult[] : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
        setHistorique([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistorique();
  }, []);

  const handleVerifySingle = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const cleaned = singleSiret.replace(/\s/g, '');

    if (!validateSiret(cleaned)) {
      setError('SIRET invalide (doit contenir 14 chiffres)');
      return;
    }

    try {
      setVerifySingleLoading(true);
      setError(null);
      const resultResp = await apiClient.conformite.sirene.verifier(cleaned);
      const resultData = (resultResp?.data as Record<string, unknown>)?.result;
      setSingleResult(resultData ? resultData as SireneResult : null);
      const updated = await apiClient.conformite.sirene.historique();
      const updatedList = (updated?.data as Record<string, unknown>)?.historique;
      setHistorique(Array.isArray(updatedList) ? updatedList as SireneResult[] : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification');
      setSingleResult(null);
    } finally {
      setVerifySingleLoading(false);
    }
  };

  const handleVerifyBulk = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const sirets = bulkSirets
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.replace(/\s/g, ''));

    const invalid = sirets.filter((s) => !validateSiret(s));
    if (invalid.length > 0) {
      setError(
        `SIRET invalides détectés: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '...' : ''}`
      );
      return;
    }

    if (sirets.length === 0) {
      setError('Veuillez entrer au moins un SIRET');
      return;
    }

    try {
      setVerifyBulkLoading(true);
      setError(null);
      await apiClient.conformite.sirene.verifierLot(sirets);
      setBulkSirets('');
      const updated = await apiClient.conformite.sirene.historique();
      const bulkList = (updated?.data as Record<string, unknown>)?.historique;
      setHistorique(Array.isArray(bulkList) ? bulkList as SireneResult[] : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification par lot');
    } finally {
      setVerifyBulkLoading(false);
    }
  };

  const formatDate = (date: string): string => {
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
          <MagnifyingGlassIcon className="w-8 h-8 text-amber-500" />
          <h1 className="text-3xl font-bold">Vérification SIRET — API Sirene</h1>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-8">
          <p className="text-blue-100">
            Vérifiez les informations légales de vos clients/fournisseurs via l'API INSEE
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 mb-8">
            <p className="text-red-100">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Single Verification Form */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-6">Vérifier un SIRET</h2>
            <form onSubmit={handleVerifySingle} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">SIRET (14 chiffres)</label>
                <input
                  type="text"
                  value={singleSiret}
                  onChange={(e) => setSingleSiret(e.target.value)}
                  placeholder="12345678901234"
                  maxLength={18}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Format: 14 chiffres (espaces acceptés)
                </p>
              </div>
              <button
                type="submit"
                disabled={verifySingleLoading || singleSiret.length === 0}
                className="w-full px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition"
              >
                {verifySingleLoading ? 'Vérification...' : 'Vérifier'}
              </button>
            </form>

            {/* Single Result Card */}
            {singleResult && (
              <div className="mt-8 pt-8 border-t border-gray-700">
                <h3 className="text-lg font-semibold mb-6">Résultat</h3>
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-gray-400">Dénomination</p>
                        <p className="text-lg font-semibold">{singleResult.denominationRs || '-'}</p>
                      </div>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          singleResult.estActif
                            ? 'bg-green-900 text-green-100'
                            : 'bg-red-900 text-red-100'
                        }`}
                      >
                        {singleResult.estActif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">SIRET</p>
                        <p className="font-mono">{singleResult.siret}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">SIREN</p>
                        <p className="font-mono">{singleResult.siren}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Code APE</p>
                        <p className="font-mono">{singleResult.codeAPE || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Forme Juridique</p>
                        <p className="text-sm">{singleResult.formeJuridique || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">TVA Intracom</p>
                        <p className="font-mono">{singleResult.tvaIntracom || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Effectif</p>
                        <p className="text-sm">{singleResult.effectif || '-'}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <p className="text-xs text-gray-400">Adresse</p>
                      <p className="text-sm">
                        {singleResult.adresseSiege}
                        {singleResult.codePostal && ` ${singleResult.codePostal}`}
                        {singleResult.ville && ` ${singleResult.ville}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Verification Form */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-6">Vérifier par lot</h2>
            <form onSubmit={handleVerifyBulk} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">SIRETs (un par ligne)</label>
                <textarea
                  value={bulkSirets}
                  onChange={(e) => setBulkSirets(e.target.value)}
                  placeholder="12345678901234&#10;98765432109876"
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Un SIRET par ligne (14 chiffres, espaces acceptés)
                </p>
              </div>
              <button
                type="submit"
                disabled={verifyBulkLoading || bulkSirets.length === 0}
                className="w-full px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition"
              >
                {verifyBulkLoading ? 'Vérification en cours...' : 'Vérifier par lot'}
              </button>
            </form>
          </div>
        </div>

        {/* Historique Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold">Historique des vérifications</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">SIRET</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">SIREN</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Raison Sociale</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Ville</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Code APE</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">TVA Intracom</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Actif</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date vérif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : historique.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                      Aucune vérification
                    </td>
                  </tr>
                ) : (
                  historique.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-700 transition">
                      <td className="px-6 py-4 text-sm font-mono">{result.siret}</td>
                      <td className="px-6 py-4 text-sm font-mono">{result.siren}</td>
                      <td className="px-6 py-4 text-sm">{result.denominationRs || '-'}</td>
                      <td className="px-6 py-4 text-sm">{result.ville || '-'}</td>
                      <td className="px-6 py-4 text-sm font-mono">{result.codeAPE || '-'}</td>
                      <td className="px-6 py-4 text-sm font-mono">{result.tvaIntracom || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            result.estActif
                              ? 'bg-green-900 text-green-100'
                              : 'bg-red-900 text-red-100'
                          }`}
                        >
                          {result.estActif ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{formatDate(result.dateVerification)}</td>
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
