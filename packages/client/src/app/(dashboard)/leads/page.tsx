'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import type { Lead } from '@talosprimes/shared';
import {
  UserPlusIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XMarkIcon,
  CalendarDaysIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

type LeadStatut = 'nouveau' | 'contacte' | 'qualifie' | 'converti' | 'abandonne';

const STATUT_ORDER: LeadStatut[] = ['nouveau', 'contacte', 'qualifie', 'converti'];

const statutConfig: Record<LeadStatut, { label: string; color: string; bgCard: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  nouveau: { label: 'Nouveau', color: 'text-blue-300', bgCard: 'border-blue-500/30 bg-blue-500/5', icon: UserPlusIcon },
  contacte: { label: 'Contacté', color: 'text-yellow-300', bgCard: 'border-yellow-500/30 bg-yellow-500/5', icon: PhoneIcon },
  qualifie: { label: 'Qualifié', color: 'text-purple-300', bgCard: 'border-purple-500/30 bg-purple-500/5', icon: ClipboardDocumentListIcon },
  converti: { label: 'Converti', color: 'text-green-300', bgCard: 'border-green-500/30 bg-green-500/5', icon: CheckCircleIcon },
  abandonne: { label: 'Abandonné', color: 'text-red-300', bgCard: 'border-red-500/30 bg-red-500/5', icon: TrashIcon },
};

const DEFAULT_QUESTIONS = [
  { question: 'Quelle est votre activité principale ?', answer: '', order: 1 },
  { question: 'Combien d\'employés avez-vous ?', answer: '', order: 2 },
  { question: 'Quel est votre besoin principal ?', answer: '', order: 3 },
  { question: 'Quel est votre budget estimé ?', answer: '', order: 4 },
  { question: 'Quand souhaitez-vous démarrer ?', answer: '', order: 5 },
];

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal questionnaire
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS.map(q => ({ ...q })));
  const [savingQuestionnaire, setSavingQuestionnaire] = useState(false);

  // Modal entretien (planifier)
  const [showEntretien, setShowEntretien] = useState(false);
  const [entretienData, setEntretienData] = useState({
    dateEntretien: '',
    heureEntretien: '',
    typeEntretien: 'téléphonique',
  });
  const [savingEntretien, setSavingEntretien] = useState(false);

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
      const response = await apiClient.leads.list();
      setLeads(response.data.leads as Lead[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      if (err instanceof Error && err.message.includes('Session expirée')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // — Actions lead —

  const handleSendQuestionnaire = async (lead: Lead) => {
    try {
      await apiClient.leads.sendQuestionnaire(lead.id);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi questionnaire');
    }
  };

  const handleOpenEntretien = (lead: Lead) => {
    setSelectedLead(lead);
    setEntretienData({
      dateEntretien: '',
      heureEntretien: '',
      typeEntretien: 'téléphonique',
    });
    setShowEntretien(true);
  };

  const handlePlanEntretien = async () => {
    if (!selectedLead) return;
    setSavingEntretien(true);
    try {
      await apiClient.leads.sendEntretien(selectedLead.id, entretienData);
      setShowEntretien(false);
      setSelectedLead(null);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur planification entretien');
    } finally {
      setSavingEntretien(false);
    }
  };

  const handleOpenQuestionnaire = (lead: Lead) => {
    setSelectedLead(lead);
    setQuestions(DEFAULT_QUESTIONS.map(q => ({ ...q })));
    setShowQuestionnaire(true);
  };

  const handleSaveQuestionnaire = async () => {
    if (!selectedLead) return;
    setSavingQuestionnaire(true);
    try {
      // Sauvegarder le questionnaire via l'API CRUD
      await apiClient.questionnaires.create({
        leadId: selectedLead.id,
        questions: questions as unknown as Record<string, unknown>[],
        channel: 'telephone',
      });

      // Passer le lead en qualifié
      await apiClient.leads.updateStatus(selectedLead.id, 'qualifie');

      setShowQuestionnaire(false);
      setSelectedLead(null);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde questionnaire');
    } finally {
      setSavingQuestionnaire(false);
    }
  };

  const handleAbandon = async (lead: Lead) => {
    if (!confirm(`Abandonner le lead "${lead.prenom} ${lead.nom}" ?`)) return;
    try {
      await apiClient.leads.updateStatus(lead.id, 'abandonne');
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur abandon lead');
    }
  };

  const handleConvert = async (lead: Lead) => {
    try {
      await apiClient.leads.confirmConversion(lead.id);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur conversion lead');
    }
  };

  // — Filtrage —

  const filteredLeads = leads.filter(lead => {
    if (lead.statut === 'abandonne') return false;
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      lead.nom.toLowerCase().includes(q) ||
      lead.prenom.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.telephone.includes(q)
    );
  });

  const abandonnes = leads.filter(l => l.statut === 'abandonne');

  const leadsByStatut = (statut: LeadStatut) =>
    filteredLeads.filter(l => l.statut === statut);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement des leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Tunnel Leads</h1>
          <p className="mt-1 text-sm text-gray-400">
            {filteredLeads.length} lead{filteredLeads.length > 1 ? 's' : ''} actif{filteredLeads.length > 1 ? 's' : ''}
            {abandonnes.length > 0 && ` · ${abandonnes.length} abandonné${abandonnes.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
          <button onClick={() => setError(null)} className="float-right text-red-400 hover:text-red-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Recherche */}
      <div className="mb-6">
        <div className="relative">
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
      </div>

      {/* Tunnel Kanban horizontal */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {STATUT_ORDER.map((statut) => {
          const config = statutConfig[statut];
          const leadsCol = leadsByStatut(statut);
          return (
            <div key={statut} className={`border rounded-lg ${config.bgCard} min-h-[200px]`}>
              {/* Header colonne */}
              <div className="px-4 py-3 border-b border-gray-700/30">
                <div className="flex items-center gap-2">
                  <config.icon className={`h-5 w-5 ${config.color}`} />
                  <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
                  <span className="ml-auto text-xs bg-gray-700/50 text-gray-300 rounded-full px-2 py-0.5">
                    {leadsCol.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-2">
                {leadsCol.length === 0 && (
                  <p className="text-gray-500 text-xs text-center py-4">Aucun lead</p>
                )}
                {leadsCol.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-gray-800/60 border border-gray-700/30 rounded-lg p-3 hover:bg-gray-800/80 transition-colors"
                  >
                    <p className="text-sm font-medium text-white truncate">
                      {lead.prenom} {lead.nom}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{lead.email}</p>
                    <p className="text-xs text-gray-500">{lead.telephone}</p>

                    {lead.dateEntretien && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-purple-300">
                        <CalendarDaysIcon className="h-3 w-3" />
                        {new Date(lead.dateEntretien).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    {/* Actions selon statut */}
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {statut === 'nouveau' && (
                        <button
                          onClick={() => handleSendQuestionnaire(lead)}
                          className="text-xs px-2 py-1 rounded bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30 transition-colors"
                          title="Envoyer le questionnaire"
                        >
                          Envoyer questionnaire
                        </button>
                      )}

                      {statut === 'contacte' && (
                        <>
                          <button
                            onClick={() => handleOpenEntretien(lead)}
                            className="text-xs px-2 py-1 rounded bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
                            title="Planifier un entretien"
                          >
                            <CalendarDaysIcon className="h-3 w-3 inline mr-1" />
                            Planifier
                          </button>
                          <button
                            onClick={() => handleOpenQuestionnaire(lead)}
                            className="text-xs px-2 py-1 rounded bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition-colors"
                            title="Lancer l'entretien téléphonique"
                          >
                            <PhoneIcon className="h-3 w-3 inline mr-1" />
                            Entretien
                          </button>
                        </>
                      )}

                      {statut === 'qualifie' && (
                        <button
                          onClick={() => handleConvert(lead)}
                          className="text-xs px-2 py-1 rounded bg-green-600/20 text-green-300 hover:bg-green-600/30 transition-colors"
                          title="Convertir en client"
                        >
                          <CheckCircleIcon className="h-3 w-3 inline mr-1" />
                          Convertir
                        </button>
                      )}

                      {statut !== 'converti' && (
                        <button
                          onClick={() => handleAbandon(lead)}
                          className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-300 hover:bg-red-600/30 transition-colors"
                          title="Abandonner"
                        >
                          <TrashIcon className="h-3 w-3 inline" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Section abandonnés (collapsible) */}
      {abandonnes.length > 0 && (
        <details className="mb-8">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 mb-2">
            {abandonnes.length} lead{abandonnes.length > 1 ? 's' : ''} abandonné{abandonnes.length > 1 ? 's' : ''}
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {abandonnes.map((lead) => (
              <div key={lead.id} className="bg-gray-800/30 border border-red-500/10 rounded p-3 opacity-60">
                <p className="text-sm text-gray-400">{lead.prenom} {lead.nom}</p>
                <p className="text-xs text-gray-500">{lead.email}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Modal Questionnaire entretien téléphonique */}
      {showQuestionnaire && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <PhoneIcon className="h-6 w-6 text-purple-400" />
                  Entretien téléphonique
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedLead.prenom} {selectedLead.nom} — {selectedLead.telephone}
                </p>
              </div>
              <button
                onClick={() => { setShowQuestionnaire(false); setSelectedLead(null); }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-purple-300">
                Remplissez les réponses pendant l'appel téléphonique. À la soumission, le lead passera automatiquement en statut <strong>Qualifié</strong>.
              </p>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={idx}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {q.order}. {q.question}
                  </label>
                  <textarea
                    value={q.answer}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[idx] = { ...updated[idx], answer: e.target.value };
                      setQuestions(updated);
                    }}
                    placeholder="Réponse du lead..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    rows={2}
                  />
                </div>
              ))}
            </div>

            <div className="border-t border-gray-700 mt-6 pt-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Notes libres</label>
              <textarea
                placeholder="Observations, remarques complémentaires..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                rows={3}
                onChange={(e) => {
                  // Stocker dans une question "notes" supplémentaire
                  const hasNotes = questions.find(q => q.question === 'Notes complémentaires');
                  if (hasNotes) {
                    setQuestions(questions.map(q =>
                      q.question === 'Notes complémentaires' ? { ...q, answer: e.target.value } : q
                    ));
                  } else {
                    setQuestions([...questions, { question: 'Notes complémentaires', answer: e.target.value, order: questions.length + 1 }]);
                  }
                }}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowQuestionnaire(false); setSelectedLead(null); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveQuestionnaire}
                disabled={savingQuestionnaire}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md flex items-center gap-2"
              >
                <CheckCircleIcon className="h-5 w-5" />
                {savingQuestionnaire ? 'Enregistrement...' : 'Valider → Qualifié'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Planifier entretien */}
      {showEntretien && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarDaysIcon className="h-6 w-6 text-purple-400" />
                Planifier entretien
              </h2>
              <button
                onClick={() => { setShowEntretien(false); setSelectedLead(null); }}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-gray-700/30 rounded p-3 mb-4">
              <p className="text-sm text-white">{selectedLead.prenom} {selectedLead.nom}</p>
              <p className="text-xs text-gray-400">{selectedLead.telephone}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={entretienData.dateEntretien}
                  onChange={(e) => setEntretienData({ ...entretienData, dateEntretien: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Heure</label>
                <input
                  type="time"
                  value={entretienData.heureEntretien}
                  onChange={(e) => setEntretienData({ ...entretienData, heureEntretien: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select
                  value={entretienData.typeEntretien}
                  onChange={(e) => setEntretienData({ ...entretienData, typeEntretien: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="téléphonique">Téléphonique</option>
                  <option value="visioconférence">Visioconférence</option>
                  <option value="physique">Physique</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowEntretien(false); setSelectedLead(null); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
              >
                Annuler
              </button>
              <button
                onClick={handlePlanEntretien}
                disabled={savingEntretien || !entretienData.dateEntretien}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md"
              >
                {savingEntretien ? 'Enregistrement...' : 'Planifier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
