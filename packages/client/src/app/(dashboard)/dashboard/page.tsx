'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { ClientFinal } from '@talosprimes/shared';
import {
  PhoneIcon,
  UserPlusIcon,
  UsersIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface CallLog {
  id: string;
  caller_phone?: string;
  callerName?: string;
  direction?: string;
  status?: string;
  duration?: number;
  action_taken?: string;
  sentiment?: string;
  urgency_level?: string;
  notes?: string;
  created_at?: string;
  createdAt?: string;
}

interface Lead {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  statut: string;
  source: string;
  createdAt: string;
}

const actionLabels: Record<string, string> = {
  INFO: 'Information',
  DEVIS: 'Devis',
  RDV: 'Rendez-vous',
  TRANSFERT: 'Transfert',
  DISPATCH: 'Dispatch',
};

const sentimentColors: Record<string, string> = {
  POSITIF: 'text-green-400',
  NEUTRE: 'text-gray-400',
  FRUSTRE: 'text-yellow-400',
  EN_DETRESSE: 'text-red-400',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, setUser, modulesActifs } = useAuthStore();
  const [clients, setClients] = useState<ClientFinal[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasAgentIA = modulesActifs.includes('agent_telephonique');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);

      const userData = await getCurrentUser();
      setUser(userData);

      // Charger clients
      const clientsData = await apiClient.clients.list();
      setClients(clientsData.data.clients as ClientFinal[]);

      // Charger appels et leads si module agent IA actif
      if (modulesActifs.includes('agent_telephonique')) {
        try {
          const callsData = await apiClient.callLogs.list();
          const rawCalls = (callsData.data?.callLogs || callsData.data?.calls || callsData.data || []) as CallLog[];
          setCallLogs(rawCalls.slice(0, 10));
        } catch {
          // callLogs pas encore dispo — pas grave
        }

        try {
          const leadsData = await apiClient.leads.list({ limit: '5' });
          const rawLeads = (leadsData.data?.leads || leadsData.data || []) as Lead[];
          setLeads(rawLeads.slice(0, 5));
        } catch {
          // leads pas encore dispo — pas grave
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      if (err instanceof Error && err.message.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m${s.toString().padStart(2, '0')}s` : `${s}s`;
  };

  // Stats calculés
  const todayCalls = callLogs.filter((c) => {
    const d = new Date(c.created_at || c.createdAt || '');
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const newLeads = leads.filter((l) => l.statut === 'nouveau').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded max-w-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-400">
          Vue d&apos;ensemble de votre activité
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800/20 backdrop-blur-md overflow-hidden shadow-lg rounded-lg border border-gray-700/30 p-5">
          <div className="flex items-center">
            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-indigo-500 text-white">
              <UsersIcon className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-400">Clients</p>
              <p className="text-2xl font-semibold text-white">{clients.length}</p>
            </div>
          </div>
        </div>

        {hasAgentIA && (
          <>
            <div className="bg-gray-800/20 backdrop-blur-md overflow-hidden shadow-lg rounded-lg border border-gray-700/30 p-5">
              <div className="flex items-center">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-amber-500 text-white">
                  <PhoneIcon className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Appels aujourd&apos;hui</p>
                  <p className="text-2xl font-semibold text-white">{todayCalls}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/20 backdrop-blur-md overflow-hidden shadow-lg rounded-lg border border-gray-700/30 p-5">
              <div className="flex items-center">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-green-500 text-white">
                  <UserPlusIcon className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Nouveaux leads</p>
                  <p className="text-2xl font-semibold text-white">{newLeads}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/20 backdrop-blur-md overflow-hidden shadow-lg rounded-lg border border-gray-700/30 p-5">
              <div className="flex items-center">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-purple-500 text-white">
                  <ArrowTrendingUpIcon className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Total appels</p>
                  <p className="text-2xl font-semibold text-white">{callLogs.length}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {!hasAgentIA && (
          <>
            <div className="bg-gray-800/20 backdrop-blur-md overflow-hidden shadow-lg rounded-lg border border-gray-700/30 p-5">
              <div className="flex items-center">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-green-500 text-white">
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-400">Rôle</p>
                  <p className="text-xl font-semibold text-white capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Appels récents — uniquement si module agent IA actif */}
      {hasAgentIA && callLogs.length > 0 && (
        <div className="bg-gray-800/20 backdrop-blur-md shadow-lg rounded-lg border border-gray-700/30 mb-8">
          <div className="px-4 py-4 sm:px-6 border-b border-gray-700/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhoneIcon className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-medium text-white">Appels récents</h3>
            </div>
            <Link
              href="/agent-ia/appels"
              className="text-sm text-amber-400 hover:text-amber-300"
            >
              Voir tout →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700/30">
              <thead className="bg-gray-800/20">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Appelant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Durée</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Sentiment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {callLogs.slice(0, 5).map((call) => (
                  <tr key={call.id} className="hover:bg-gray-800/20">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {call.callerName || call.caller_phone || '-'}
                      </div>
                      {call.callerName && call.caller_phone && (
                        <div className="text-xs text-gray-400">{call.caller_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300">
                        {actionLabels[call.action_taken || ''] || call.action_taken || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5 text-gray-500" />
                        {formatDuration(call.duration)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-sm font-medium ${sentimentColors[call.sentiment || ''] || 'text-gray-400'}`}>
                        {call.sentiment || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(call.created_at || call.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leads récents — uniquement si module agent IA actif */}
      {hasAgentIA && leads.length > 0 && (
        <div className="bg-gray-800/20 backdrop-blur-md shadow-lg rounded-lg border border-gray-700/30 mb-8">
          <div className="px-4 py-4 sm:px-6 border-b border-gray-700/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlusIcon className="h-5 w-5 text-green-400" />
              <h3 className="text-lg font-medium text-white">Derniers leads</h3>
            </div>
            <Link
              href="/agent-ia/leads"
              className="text-sm text-amber-400 hover:text-amber-300"
            >
              Voir tout →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700/30">
              <thead className="bg-gray-800/20">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Téléphone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-800/20">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                      {lead.prenom} {lead.nom}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {lead.telephone || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                        {lead.source === 'telephone' || lead.source === 'telephone_ia' ? (
                          <PhoneIcon className="h-3 w-3 mr-1" />
                        ) : null}
                        {lead.source === 'telephone' ? 'Appel' : lead.source === 'telephone_ia' ? 'Agent IA' : lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        lead.statut === 'nouveau' ? 'bg-blue-500/20 text-blue-300' :
                        lead.statut === 'contacte' ? 'bg-yellow-500/20 text-yellow-300' :
                        lead.statut === 'converti' ? 'bg-green-500/20 text-green-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {lead.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                      {formatDate(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clients List */}
      <div className="bg-gray-800/20 backdrop-blur-md shadow-lg rounded-lg border border-gray-700/30">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-700/30">
          <h3 className="text-lg leading-6 font-medium text-white">Clients Finaux</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-400">
            Liste de tous vos clients
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-white">Aucun client</h3>
              <p className="mt-1 text-sm text-gray-400">
                Commencez par créer votre premier client.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700/30">
                <thead className="bg-gray-800/20">
                  <tr>
                    <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-gray-700/30">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-800/20">
                      <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{client.email}</div>
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {client.type === 'b2b' ? 'B2B' : 'B2C'}
                        </div>
                        {client.type === 'b2b' && client.raisonSociale && (
                          <div className="text-sm text-gray-400">{client.raisonSociale}</div>
                        )}
                        {client.type === 'b2c' && client.nom && client.prenom && (
                          <div className="text-sm text-gray-400">{client.prenom} {client.nom}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          client.statut === 'actif'
                            ? 'bg-green-100 text-green-800'
                            : client.statut === 'suspendu'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {client.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
