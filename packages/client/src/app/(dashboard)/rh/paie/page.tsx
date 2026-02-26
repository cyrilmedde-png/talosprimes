'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface BulletinPaie {
  id: string;
  tenantId: string;
  membreId: string;
  membreNom: string;
  mois: number;
  annee: number;
  salaireBase: number;
  primes: number;
  deductions: number;
  netAPayer: number;
  statut: 'brouillon' | 'valide' | 'paye';
  createdAt: string;
}

interface PaieFormData {
  membreId: string;
  mois: number;
  annee: number;
  salaireBase: number;
  primes: number;
  deductions: number;
  netAPayer: number;
  [key: string]: string | number | boolean | null;
}

const moisFrancais = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export default function PaiePage(): JSX.Element {
  const [bulletins, setBulletins] = useState<BulletinPaie[]>([]);
  const [filteredBulletins, setFilteredBulletins] = useState<BulletinPaie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMois, setSelectedMois] = useState<number | string>('');
  const [selectedAnnee, setSelectedAnnee] = useState<number | string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingBulletin, setEditingBulletin] = useState<BulletinPaie | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PaieFormData>({
    membreId: '',
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    salaireBase: 0,
    primes: 0,
    deductions: 0,
    netAPayer: 0,
  });

  const fetchBulletins = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiClient.rh.paie.list();
      const raw = response.data as unknown as { success: boolean; data: BulletinPaie[] };
      setBulletins(raw.data);
      setFilteredBulletins(raw.data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors du chargement'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBulletins();
  }, []);

  useEffect(() => {
    let filtered = bulletins;

    if (searchTerm) {
      filtered = filtered.filter((b) =>
        b.membreNom.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedMois) {
      filtered = filtered.filter((b) => b.mois === Number(selectedMois));
    }

    if (selectedAnnee) {
      filtered = filtered.filter((b) => b.annee === Number(selectedAnnee));
    }

    setFilteredBulletins(filtered);
  }, [searchTerm, selectedMois, selectedAnnee, bulletins]);

  const handleCreate = (): void => {
    setEditingBulletin(null);
    setFormData({
      membreId: '',
      mois: new Date().getMonth() + 1,
      annee: new Date().getFullYear(),
      salaireBase: 0,
      primes: 0,
      deductions: 0,
      netAPayer: 0,
    });
    setShowModal(true);
  };

  const handleEdit = (bulletin: BulletinPaie): void => {
    setEditingBulletin(bulletin);
    setFormData({
      membreId: bulletin.membreId,
      mois: bulletin.mois,
      annee: bulletin.annee,
      salaireBase: bulletin.salaireBase,
      primes: bulletin.primes,
      deductions: bulletin.deductions,
      netAPayer: bulletin.netAPayer,
    });
    setShowModal(true);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        netAPayer: formData.salaireBase + formData.primes - formData.deductions,
      };
      if (editingBulletin) {
        await apiClient.rh.paie.update(editingBulletin.id, dataToSave);
      } else {
        await apiClient.rh.paie.create(dataToSave);
      }
      setShowModal(false);
      await fetchBulletins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bulletin ?')) return;
    setDeletingId(id);
    try {
      await apiClient.rh.paie.delete(id);
      await fetchBulletins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatutBadgeColor = (statut: string): string => {
    switch (statut) {
      case 'brouillon':
        return 'bg-gray-500/20 text-gray-400';
      case 'valide':
        return 'bg-blue-500/20 text-blue-400';
      case 'paye':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const calculateTotals = (): { totalNet: number; totalPrimes: number; totalDeductions: number } => {
    return {
      totalNet: filteredBulletins.reduce((sum, b) => sum + b.netAPayer, 0),
      totalPrimes: filteredBulletins.reduce((sum, b) => sum + b.primes, 0),
      totalDeductions: filteredBulletins.reduce((sum, b) => sum + b.deductions, 0),
    };
  };

  const totals = calculateTotals();
  const currentYear = new Date().getFullYear();
  const yearsRange = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Bulletins de Paie</h1>
          <p className="mt-2 text-sm text-gray-400">
            Gestion des bulletins de paie
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nouveau bulletin</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Mois Filter */}
          <select
            value={selectedMois}
            onChange={(e) => setSelectedMois(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les mois</option>
            {moisFrancais.map((mois, index) => (
              <option key={index + 1} value={index + 1}>
                {mois}
              </option>
            ))}
          </select>

          {/* Année Filter */}
          <select
            value={selectedAnnee}
            onChange={(e) => setSelectedAnnee(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Toutes les années</option>
            {yearsRange.map((year) => (
              <option key={year} value={year}>
                {year}
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
                Mois/Année
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Salaire Base
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Primes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Déductions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Net à Payer
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
            {filteredBulletins.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Aucun bulletin trouvé
                </td>
              </tr>
            ) : (
              filteredBulletins.map((bulletin) => (
                <tr key={bulletin.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-white">
                    {bulletin.membreNom}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {moisFrancais[bulletin.mois - 1]} {bulletin.annee}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {bulletin.salaireBase.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {bulletin.primes.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {bulletin.deductions.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-green-400">
                    {bulletin.netAPayer.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatutBadgeColor(bulletin.statut)}`}>
                      {bulletin.statut.charAt(0).toUpperCase() + bulletin.statut.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(bulletin)}
                        className="text-indigo-400 transition-colors hover:text-indigo-300"
                        title="Modifier"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(bulletin.id)}
                        disabled={deletingId === bulletin.id}
                        className="text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                        title="Supprimer"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-4 backdrop-blur-md">
          <p className="text-gray-400 text-sm mb-1">Total Net à Payer</p>
          <p className="text-2xl font-bold text-green-400">
            {totals.totalNet.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            })}
          </p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-4 backdrop-blur-md">
          <p className="text-gray-400 text-sm mb-1">Total Primes</p>
          <p className="text-2xl font-bold text-blue-400">
            {totals.totalPrimes.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            })}
          </p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-4 backdrop-blur-md">
          <p className="text-gray-400 text-sm mb-1">Total Déductions</p>
          <p className="text-2xl font-bold text-red-400">
            {totals.totalDeductions.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            })}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-400">
        Affichage de {filteredBulletins.length} sur {bulletins.length} bulletins
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingBulletin ? 'Modifier le bulletin' : 'Nouveau bulletin'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Membre
                  </label>
                  <input
                    type="text"
                    value={formData.membreId}
                    onChange={(e) =>
                      setFormData({ ...formData, membreId: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ID du membre"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Mois
                    </label>
                    <select
                      value={formData.mois}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mois: parseInt(e.target.value),
                        })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {moisFrancais.map((mois, index) => (
                        <option key={index + 1} value={index + 1}>
                          {mois}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Année
                    </label>
                    <select
                      value={formData.annee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          annee: parseInt(e.target.value),
                        })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {yearsRange.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Salaire de base (€)
                  </label>
                  <input
                    type="number"
                    value={formData.salaireBase}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salaireBase: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Primes (€)
                  </label>
                  <input
                    type="number"
                    value={formData.primes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        primes: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Déductions (€)
                  </label>
                  <input
                    type="number"
                    value={formData.deductions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deductions: parseFloat(e.target.value),
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
