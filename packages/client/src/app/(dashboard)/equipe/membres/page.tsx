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
        const membresData = response.data as unknown as Membre[];
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
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Membres</h1>
          <p className="mt-2 text-gray-600">
            Gestion des membres de l'équipe
          </p>
        </div>
        <Link
          href="/equipe/membres/new"
          className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Ajouter un membre</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartement}
            onChange={(e) => setSelectedDepartement(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Prénom
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Email
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Poste
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Département
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Contrat
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
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
                <tr key={membre.id} className="border-b border-gray-200">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {membre.nom}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {membre.prenom}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {membre.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {membre.poste}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {membre.departement}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {membre.contrat}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        membre.statut === 'Actif'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {membre.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 transition-colors hover:text-blue-800">
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button className="text-red-600 transition-colors hover:text-red-800">
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
      <div className="text-sm text-gray-600">
        Affichage de {filteredMembres.length} sur {membres.length} membres
      </div>
    </div>
  );
}
