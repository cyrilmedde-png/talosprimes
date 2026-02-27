'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  EyeIcon,
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface Lead {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  statut: 'nouveau' | 'contacte' | 'converti' | 'abandonne';
  source: string;
  notes?: string;
  createdAt: string;
}

const statutColors: Record<string, string> = {
  nouveau: 'bg-blue-100 text-blue-800',
  contacte: 'bg-yellow-100 text-yellow-800',
  converti: 'bg-green-100 text-green-800',
  abandonne: 'bg-red-100 text-red-800',
};

const sourceLabels: Record<string, string> = {
  telephone: 'Appel entrant',
  telephone_ia: 'Agent IA',
  formulaire_inscription: 'Formulaire',
  site_web: 'Site web',
  manuel: 'Manuel',
};

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatut, setFilterStatut] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadLeads();
  }, [router]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (filterStatut) params.statut = filterStatut;
      if (filterSource) params.source = filterSource;
      const response = await apiClient.leads.list(params);
      if (response.success && response.data) {
        setLeads((response.data.leads || response.data || []) as Lead[]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(errorMessage);
      if (errorMessage.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) loadLeads();
  }, [filterStatut, filterSource]);

  const updateStatut = async (id: string, statut: string) => {
    try {
      await apiClient.leads.updateStatus(id, statut as Lead['statut']);
      loadLeads();
      if (showModal && selectedLead?.id === id) {
        setSelectedLead({ ...selectedLead, statut: statut as Lead['statut'] });
      }
    } catch (err) {
      console.error('Erreur mise a jour statut:', err);
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Supprimer ce lead ?')) return;
    try {
      await apiClient.leads.delete(id);
      loadLeads();
      setShowModal(false);
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = {
    total: leads.length,
    nouveau: leads.filter((l) => l.statut === 'nouveau').length,
    contacte: leads.filter((l) => l.statut === 'contacte').length,
    converti: leads.filter((l) => l.statut === 'converti').length,
    telephone: leads.filter((l) => l.source === 'telephone' || l.source === 'telephone_ia').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <PhoneIcon className="h-4 w-4" />
          <span>{stats.telephone} via agent IA</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total leads</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Nouveaux</p>
          <p className="text-2xl font-bold text-blue-600">{stats.nouveau}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Contactes</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.contacte}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Convertis</p>
          <p className="text-2xl font-bold text-green-600">{stats.converti}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="rounded-md border-gray-300 text-sm focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="">Tous les statuts</option>
            <option value="nouveau">Nouveau</option>
            <option value="contacte">Contacte</option>
            <option value="converti">Converti</option>
            <option value="abandonne">Abandonne</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="rounded-md border-gray-300 text-sm focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="">Toutes les sources</option>
            <option value="telephone">Appel entrant</option>
            <option value="telephone_ia">Agent IA</option>
            <option value="formulaire_inscription">Formulaire</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun lead trouve</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {lead.prenom} {lead.nom}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col gap-1">
                      {lead.telephone && (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="h-3.5 w-3.5" />
                          {lead.telephone}
                        </span>
                      )}
                      {lead.email && !lead.email.includes('@placeholder') && (
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="h-3.5 w-3.5" />
                          {lead.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {lead.source === 'telephone' || lead.source === 'telephone_ia' ? (
                        <PhoneIcon className="h-3 w-3 mr-1" />
                      ) : null}
                      {sourceLabels[lead.source] || lead.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[lead.statut] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {lead.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(lead.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowModal(true);
                      }}
                      className="text-amber-600 hover:text-amber-900 mr-3"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Detail */}
      {showModal && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Detail du lead</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Nom</p>
                  <p className="text-sm font-medium">{selectedLead.prenom} {selectedLead.nom}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Telephone</p>
                  <p className="text-sm font-medium">{selectedLead.telephone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium">
                    {selectedLead.email?.includes('@placeholder') ? '-' : selectedLead.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Source</p>
                  <p className="text-sm font-medium">
                    {sourceLabels[selectedLead.source] || selectedLead.source}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium">{formatDate(selectedLead.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[selectedLead.statut]}`}
                  >
                    {selectedLead.statut}
                  </span>
                </div>
              </div>
              {selectedLead.notes && (
                <div>
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="text-sm bg-gray-50 rounded p-2 mt-1">{selectedLead.notes}</p>
                </div>
              )}
              {/* Actions */}
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 mb-2">Changer le statut</p>
                <div className="flex flex-wrap gap-2">
                  {['nouveau', 'contacte', 'converti', 'abandonne'].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatut(selectedLead.id, s)}
                      disabled={selectedLead.statut === s}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition
                        ${selectedLead.statut === s
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => deleteLead(selectedLead.id)}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
