'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import type { Lead } from '@talosprimes/shared';
import { UserPlusIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

type LeadSource = 'formulaire_inscription' | 'admin' | 'all';

export default function OnboardingPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<LeadSource>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadLeads();
  }, [router, filterSource]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filterSource !== 'all') {
        params.append('source', filterSource);
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des leads');
      }

      const data = await response.json();
      setLeads(data.data.leads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      if (err instanceof Error && err.message.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.nom.toLowerCase().includes(query) ||
      lead.prenom.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.telephone.includes(query)
    );
  });

  const leadsInscrits = filteredLeads.filter(l => l.source === 'formulaire_inscription');
  const leadsAdmin = filteredLeads.filter(l => l.source === 'admin' || l.source === null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded max-w-md backdrop-blur-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Onboarding</h1>
        <p className="mt-2 text-sm text-gray-400">
          Gestion des leads et inscriptions
        </p>
      </div>

      {/* Filtres et recherche */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterSource('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterSource === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilterSource('formulaire_inscription')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterSource === 'formulaire_inscription'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Inscrits
          </button>
          <button
            onClick={() => setFilterSource('admin')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filterSource === 'admin'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Créés par admin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Total Leads</h3>
            <UserIcon className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{filteredLeads.length}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Inscrits</h3>
            <UserPlusIcon className="h-6 w-6 text-green-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{leadsInscrits.length}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Créés par admin</h3>
            <UserIcon className="h-6 w-6 text-yellow-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{leadsAdmin.length}</p>
        </div>
      </div>

      {/* Liste des leads inscrits */}
      {filterSource === 'all' || filterSource === 'formulaire_inscription' ? (
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md mb-6">
          <div className="px-6 py-4 border-b border-gray-700/30">
            <h3 className="text-lg font-medium text-white">Leads Inscrits</h3>
            <p className="mt-1 text-sm text-gray-400">Leads provenant du formulaire d'inscription</p>
          </div>
          <div className="p-6">
            {leadsInscrits.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <UserPlusIcon className="mx-auto h-12 w-12 text-gray-600" />
                <p className="mt-4 text-gray-400">Aucun lead inscrit pour le moment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700/30">
                  <thead className="bg-gray-800/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Téléphone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                    {leadsInscrits.map((lead) => (
                      <tr key={lead.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {lead.prenom} {lead.nom}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.telephone}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            lead.statut === 'nouveau'
                              ? 'bg-blue-400/20 text-blue-300'
                              : lead.statut === 'contacte'
                              ? 'bg-yellow-400/20 text-yellow-300'
                              : lead.statut === 'converti'
                              ? 'bg-green-400/20 text-green-300'
                              : 'bg-gray-400/20 text-gray-300'
                          }`}>
                            {lead.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Liste des leads créés par admin */}
      {filterSource === 'all' || filterSource === 'admin' ? (
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md">
          <div className="px-6 py-4 border-b border-gray-700/30">
            <h3 className="text-lg font-medium text-white">Leads Créés par Admin</h3>
            <p className="mt-1 text-sm text-gray-400">Leads créés manuellement par un administrateur</p>
          </div>
          <div className="p-6">
            {leadsAdmin.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <UserIcon className="mx-auto h-12 w-12 text-gray-600" />
                <p className="mt-4 text-gray-400">Aucun lead créé par admin pour le moment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700/30">
                  <thead className="bg-gray-800/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Téléphone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                    {leadsAdmin.map((lead) => (
                      <tr key={lead.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {lead.prenom} {lead.nom}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lead.telephone}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            lead.statut === 'nouveau'
                              ? 'bg-blue-400/20 text-blue-300'
                              : lead.statut === 'contacte'
                              ? 'bg-yellow-400/20 text-yellow-300'
                              : lead.statut === 'converti'
                              ? 'bg-green-400/20 text-green-300'
                              : 'bg-gray-400/20 text-gray-300'
                          }`}>
                            {lead.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(lead.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

