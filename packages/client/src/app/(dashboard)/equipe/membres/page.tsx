'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Membre {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  poste: string;
  departement: string;
  contrat: string;
  statut: string;
}

export default function MembresPage(): JSX.Element {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [filteredMembres, setFilteredMembres] = useState<Membre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartement, setSelectedDepartement] = useState('');
  const [departements, setDepartements] = useState<string[]>([]);

  useEffect(() => {
    const fetchMembres = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await apiClient.equipe.membres.list();
        const raw = response.data as unknown as { success?: boolean; data?: { items?: Membre[] } };
        const membresData = raw?.data?.items ?? [];
        setMembres(membresData);
        setFilteredMembres(membresData);

        const uniqueDepts = Array.from(
          new Set(membresData.map((m) => m.departement))
        ).sort();
        setDepartements(uniqueDepts);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMembres();
  }, []);

  useEffect(() => {
    let filtered = membres;

    if (searchTerm) {
      filtered = filtered.filter(
        (m) =>
          m.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartement) {
      filtered = filtered.filter(
        (m) => m.departement === selectedDepartement
      );
    }

    setFilteredMembres(filtered);
  }, [searchTerm, selectedDepartement, membres]);

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
          <h1 className="text-3xl font-bold text-white">Membres</h1>
          <p className="mt-2 text-sm text-gray-400">
            Gestion des membres de l'équipe
          </p>
        </div>
        <Link
          href="/equipe/membres/new"
          className="flex items-center space-x-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Ajouter un membre</span>
        </Link>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartement}
            onChange={(e) => setSelectedDepartement(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les départements</option>
            {departements.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
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
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Prénom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Poste
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Département
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                Contrat
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
            {filteredMembres.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  Aucun membre trouvé
                </td>
              </tr>
            ) : (
              filteredMembres.map((membre) => (
                <tr key={membre.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-white">
                    {membre.nom}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {membre.prenom}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {membre.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {membre.poste}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {membre.departement}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {membre.contrat}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        membre.statut === 'Actif'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-300'
                      }`}
                    >
                      {membre.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button className="text-indigo-400 transition-colors hover:text-indigo-300">
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button className="text-red-400 transition-colors hover:text-red-300">
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

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-400">
        Affichage de {filteredMembres.length} sur {membres.length} membres
      </div>
    </div>
  );
}
