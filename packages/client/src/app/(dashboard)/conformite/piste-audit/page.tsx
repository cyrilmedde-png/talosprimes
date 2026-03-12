'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FingerPrintIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

type PisteAuditItem = {
  id: string;
  chaineFluide: string;
  etape: 'devis' | 'bon_commande' | 'bon_livraison' | 'facture' | 'ecriture_comptable' | 'paiement' | 'avoir';
  documentType: string;
  documentId: string;
  documentRef: string;
  dateDocument: string;
  montantHt: number;
  montantTtc: number;
  hashDocument: string;
  etapePrecedenteId: string | null;
  createdAt: string;
};

type ChaineFluide = {
  items: PisteAuditItem[];
};

const etapeBadgeColors: Record<PisteAuditItem['etape'], string> = {
  devis: 'bg-blue-900 text-blue-100',
  bon_commande: 'bg-purple-900 text-purple-100',
  bon_livraison: 'bg-indigo-900 text-indigo-100',
  facture: 'bg-amber-900 text-amber-100',
  ecriture_comptable: 'bg-green-900 text-green-100',
  paiement: 'bg-emerald-900 text-emerald-100',
  avoir: 'bg-red-900 text-red-100',
};

const etapeLabels: Record<PisteAuditItem['etape'], string> = {
  devis: 'Devis',
  bon_commande: 'Bon de commande',
  bon_livraison: 'Bon de livraison',
  facture: 'Facture',
  ecriture_comptable: 'Écriture comptable',
  paiement: 'Paiement',
  avoir: 'Avoir',
};

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export default function PisteAuditPage(): JSX.Element {
  const router = useRouter();
  const [items, setItems] = useState<PisteAuditItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PisteAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchChaine, setSearchChaine] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [expandedChaine, setExpandedChaine] = useState<string | null>(null);
  const [chainDetails, setChainDetails] = useState<Record<string, ChaineFluide>>({});
  const [loadingChain, setLoadingChain] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await apiClient.conformite.pisteAudit.liste({
          page,
          limit: pageSize,
        });
        const itemsList = (response?.data as Record<string, unknown>)?.items;
        setItems(Array.isArray(itemsList) ? itemsList as PisteAuditItem[] : []);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [page, pageSize]);

  useEffect(() => {
    let filtered = items;

    if (searchChaine) {
      filtered = filtered.filter((item) =>
        item.chaineFluide.toLowerCase().includes(searchChaine.toLowerCase())
      );
    }

    if (filterDocType) {
      filtered = filtered.filter((item) => item.etape === filterDocType);
    }

    setFilteredItems(filtered);
  }, [items, searchChaine, filterDocType]);

  const handleExpandChaine = async (chaineFluide: string): Promise<void> => {
    if (expandedChaine === chaineFluide) {
      setExpandedChaine(null);
      return;
    }

    if (!chainDetails[chaineFluide]) {
      try {
        setLoadingChain(chaineFluide);
        const response = await apiClient.conformite.pisteAudit.chaine(
          chaineFluide
        );
        setChainDetails((prev) => ({
          ...prev,
          [chaineFluide]: {
            items: Array.isArray((response?.data as Record<string, unknown>)?.items)
              ? (response?.data as Record<string, unknown>)?.items as PisteAuditItem[]
              : [],
          } as ChaineFluide,
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement'
        );
      } finally {
        setLoadingChain(null);
      }
    }

    setExpandedChaine(chaineFluide);
  };

  const uniqueDocTypes = Array.from(
    new Set(items.map((item) => item.etape))
  );

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
          <FingerPrintIcon className="w-8 h-8 text-amber-500" />
          <h1 className="text-3xl font-bold">Piste d'Audit Fiable (PAF)</h1>
        </div>

        {/* Info Banner */}
        <div className="bg-gray-800 border-l-4 border-amber-500 p-4 mb-6 rounded">
          <p className="text-sm text-gray-300">
            Traçabilité complète : devis → commande → livraison → facture →
            écriture → paiement
          </p>
        </div>

        {error && (
          <div className="bg-red-900 text-red-100 p-4 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rechercher par Chaîne
              </label>
              <input
                type="text"
                value={searchChaine}
                onChange={(e) => {
                  setSearchChaine(e.target.value);
                  setPage(1);
                }}
                placeholder="Identifiant de chaîne..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type de document
              </label>
              <select
                value={filterDocType}
                onChange={(e) => {
                  setFilterDocType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Tous les types</option>
                {uniqueDocTypes.map((type) => (
                  <option key={type} value={type}>
                    {etapeLabels[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Chargement...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Aucun élément trouvé
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700 border-b border-gray-600">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300"></th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Chaîne
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Étape
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Type doc
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Référence
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-300">
                        Montant HT
                      </th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-300">
                        Montant TTC
                      </th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-300">
                        Hash
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tbody key={item.chaineFluide}>
                        <tr
                          className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer transition"
                          onClick={() => handleExpandChaine(item.chaineFluide)}
                        >
                          <td className="px-6 py-4">
                            <button className="p-1 hover:bg-gray-600 rounded transition">
                              {expandedChaine === item.chaineFluide ? (
                                <ChevronUpIcon className="w-5 h-5 text-amber-500" />
                              ) : (
                                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 font-mono text-amber-400">
                            {item.chaineFluide}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${etapeBadgeColors[item.etape]}`}
                            >
                              {etapeLabels[item.etape]}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {item.documentType}
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {item.documentRef}
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {new Date(item.dateDocument).toLocaleDateString(
                              'fr-FR'
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-300">
                            {currencyFormatter.format(item.montantHt)}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-300">
                            {currencyFormatter.format(item.montantTtc)}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-gray-400 truncate max-w-xs">
                            {item.hashDocument}
                          </td>
                        </tr>
                        {expandedChaine === item.chaineFluide && (
                          <tr className="bg-gray-900 border-b border-gray-700">
                            <td colSpan={9} className="px-6 py-6">
                              {loadingChain === item.chaineFluide ? (
                                <div className="text-center text-gray-400">
                                  Chargement de la chaîne...
                                </div>
                              ) : chainDetails[item.chaineFluide] ? (
                                <TimelineView
                                  items={
                                    chainDetails[item.chaineFluide].items
                                  }
                                />
                              ) : null}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-700 px-6 py-4 flex justify-between items-center">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:opacity-50 rounded text-white transition"
                >
                  Précédent
                </button>
                <span className="text-gray-300">Page {page}</span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={filteredItems.length < pageSize}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:opacity-50 rounded text-white transition"
                >
                  Suivant
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineView({ items }: { items: PisteAuditItem[] }): JSX.Element {
  return (
    <div className="relative pl-8">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-amber-700 rounded-full"></div>

      <div className="space-y-8">
        {items.map((item, index) => (
          <div key={item.id} className="relative">
            <div className="absolute -left-5.5 top-2 w-4 h-4 bg-amber-500 rounded-full border-2 border-gray-900"></div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${etapeBadgeColors[item.etape]}`}
                >
                  {etapeLabels[item.etape]}
                </span>
                <span className="text-xs text-gray-400">
                  {index + 1} / {items.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Référence:</span>
                  <p className="font-mono text-amber-400">{item.documentRef}</p>
                </div>
                <div>
                  <span className="text-gray-400">Date:</span>
                  <p className="text-gray-200">
                    {new Date(item.dateDocument).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Montant HT:</span>
                  <p className="text-gray-200">
                    {currencyFormatter.format(item.montantHt)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Montant TTC:</span>
                  <p className="text-gray-200">
                    {currencyFormatter.format(item.montantTtc)}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700">
                <span className="text-xs text-gray-400">Hash:</span>
                <p className="font-mono text-xs text-gray-500 truncate mt-1">
                  {item.hashDocument}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
