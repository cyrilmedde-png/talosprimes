'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import type { Tenant, User, StatutJuridique } from '@talosprimes/shared';
import { BuildingOfficeIcon, UserPlusIcon, CpuChipIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

const STATUTS_JURIDIQUES: { value: StatutJuridique; label: string }[] = [
  { value: 'SA', label: 'SA - Société Anonyme' },
  { value: 'SARL', label: 'SARL - Société à Responsabilité Limitée' },
  { value: 'SAS', label: 'SAS - Société par Actions Simplifiée' },
  { value: 'SASU', label: 'SASU - Société par Actions Simplifiée Unipersonnelle' },
  { value: 'SCI', label: 'SCI - Société Civile Immobilière' },
  { value: 'SNC', label: 'SNC - Société en Nom Collectif' },
  { value: 'SCS', label: 'SCS - Société en Commandite Simple' },
  { value: 'SCA', label: 'SCA - Société en Commandite par Actions' },
  { value: 'EURL', label: 'EURL - Entreprise Unipersonnelle à Responsabilité Limitée' },
  { value: 'SCP', label: 'SCP - Société Civile Professionnelle' },
  { value: 'SEL', label: 'SEL - Société d\'Exercice Libéral' },
  { value: 'SELARL', label: 'SELARL - Société d\'Exercice Libéral à Responsabilité Limitée' },
  { value: 'SELAS', label: 'SELAS - Société d\'Exercice Libéral par Actions Simplifiée' },
  { value: 'SELAFA', label: 'SELAFA - Société d\'Exercice Libéral par Actions Forme Anonyme' },
  { value: 'AUTO_ENTREPRENEUR', label: 'Auto-entrepreneur / Micro-entreprise' },
  { value: 'EIRL', label: 'EIRL - Entreprise Individuelle à Responsabilité Limitée' },
  { value: 'ENTREPRISE_INDIVIDUELLE', label: 'Entreprise Individuelle' },
];

type AgentConfigEmail = {
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPassword?: string;
  imapTls?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
  configuredRead: boolean;
  configuredSend: boolean;
};
type AgentConfigQonto = { apiSecret?: string; bankAccountId?: string; configured: boolean };

type SettingsTab = 'entreprise' | 'utilisateurs' | 'agent' | 'facturation';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('entreprise');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Données entreprise
  const [tenant, setTenant] = useState<Partial<Tenant>>({});
  
  // Données utilisateur
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'collaborateur' as 'admin' | 'collaborateur' | 'lecture_seule',
    nom: '',
    prenom: '',
    telephone: '',
    fonction: '',
    salaire: '',
    dateEmbauche: '',
  });

  // Config Assistant IA (email + Qonto)
  const [agentConfig, setAgentConfig] = useState<{ email: AgentConfigEmail; qonto: AgentConfigQonto } | null>(null);
  const [agentForm, setAgentForm] = useState<{
    email: Partial<AgentConfigEmail>;
    qonto: Partial<AgentConfigQonto>;
  }>({ email: {}, qonto: {} });

  // Config Facturation (en-tête, pied de page, plateforme facturation électronique)
  const [facturationForm, setFacturationForm] = useState({
    entete: '',
    piedDePage: '',
    plateformeFacturationElectronique: '',
    apiKeyFacturation: '',
    apiUrlFacturation: '',
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  // Ouvrir l'onglet depuis l'URL (?tab=facturation)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'facturation' || tab === 'entreprise' || tab === 'utilisateurs' || tab === 'agent') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      
      // Charger le profil entreprise
      const tenantResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (tenantResponse.ok) {
        const tenantData = await tenantResponse.json();
        setTenant(tenantData.data.tenant || {});
      }

      // Charger les utilisateurs
      const usersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.data.users || []);
      }

      // Config agent (pour onglet Assistant IA)
      try {
        const configRes = await apiClient.agent.getConfig();
        if (configRes.success && configRes.data) {
          setAgentConfig(configRes.data);
          setAgentForm({
            email: {
              imapHost: configRes.data.email?.imapHost ?? '',
              imapPort: configRes.data.email?.imapPort ?? 993,
              imapUser: configRes.data.email?.imapUser ?? '',
              imapPassword: '', // ne pas pré-remplir
              imapTls: configRes.data.email?.imapTls ?? true,
              smtpHost: configRes.data.email?.smtpHost ?? '',
              smtpPort: configRes.data.email?.smtpPort ?? 587,
              smtpUser: configRes.data.email?.smtpUser ?? '',
              smtpPassword: '',
              smtpFrom: configRes.data.email?.smtpFrom ?? '',
            },
            qonto: {
              apiSecret: '',
              bankAccountId: configRes.data.qonto?.bankAccountId ?? '',
            },
          });
        }
      } catch {
        // optionnel : ne pas bloquer le chargement
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEntreprise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenant),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setSuccess('Profil entreprise mis à jour avec succès');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newUser,
          salaire: newUser.salaire ? parseFloat(newUser.salaire) : null,
          dateEmbauche: newUser.dateEmbauche || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }

      setSuccess('Utilisateur créé avec succès');
      setNewUser({
        email: '',
        password: '',
        role: 'collaborateur',
        nom: '',
        prenom: '',
        telephone: '',
        fonction: '',
        salaire: '',
        dateEmbauche: '',
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Paramètres</h1>
        <p className="mt-2 text-sm text-gray-400">
          Configuration de votre entreprise et gestion des utilisateurs
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-700/30">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('entreprise')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'entreprise'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <BuildingOfficeIcon className="h-5 w-5 inline mr-2" />
            Profil Entreprise
          </button>
          <button
            onClick={() => setActiveTab('utilisateurs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'utilisateurs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <UserPlusIcon className="h-5 w-5 inline mr-2" />
            Utilisateurs
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'agent'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <CpuChipIcon className="h-5 w-5 inline mr-2" />
            Assistant IA
          </button>
          <button
            onClick={() => setActiveTab('facturation')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'facturation'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <BanknotesIcon className="h-5 w-5 inline mr-2" />
            Facturation
          </button>
        </nav>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-900/20 border border-green-700/30 text-green-300 px-4 py-3 rounded backdrop-blur-md">
          {success}
        </div>
      )}

      {/* Tab Contenu */}
      {activeTab === 'facturation' ? (
        <div className="space-y-6">
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
            <h2 className="text-xl font-bold text-white mb-2">Configuration de la facturation</h2>
            <p className="text-sm text-gray-400 mb-6">
              En-tête et pied de page des factures, connexion aux plateformes de facturation électronique (normes européennes).
            </p>

            {/* En-tête de facture */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-white mb-1">En-tête de facture</h3>
              <p className="text-sm text-gray-500 mb-2">Texte ou HTML affiché en haut de chaque facture (logo, raison sociale, etc.).</p>
              <textarea
                value={facturationForm.entete}
                onChange={(e) => setFacturationForm((f) => ({ ...f, entete: e.target.value }))}
                rows={4}
                placeholder="Ex. : Logo, nom de l'entreprise, SIRET, adresse..."
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
            </div>

            {/* Pied de page de facture */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-white mb-1">Pied de page de facture</h3>
              <p className="text-sm text-gray-500 mb-2">Mentions légales, conditions de paiement, RIB, etc.</p>
              <textarea
                value={facturationForm.piedDePage}
                onChange={(e) => setFacturationForm((f) => ({ ...f, piedDePage: e.target.value }))}
                rows={4}
                placeholder="Ex. : Conditions de paiement, mentions légales, TVA..."
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
            </div>

            {/* Facturation électronique */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-white mb-1">Facturation électronique</h3>
              <p className="text-sm text-gray-500 mb-3">Connexion à une plateforme de facturation électronique (ex. Chorus Pro, factur-X, etc.).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Plateforme</label>
                  <select
                    value={facturationForm.plateformeFacturationElectronique}
                    onChange={(e) => setFacturationForm((f) => ({ ...f, plateformeFacturationElectronique: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Aucune</option>
                    <option value="chorus_pro">Chorus Pro</option>
                    <option value="factur_x">Factur-X</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">URL API (optionnel)</label>
                  <input
                    type="url"
                    value={facturationForm.apiUrlFacturation}
                    onChange={(e) => setFacturationForm((f) => ({ ...f, apiUrlFacturation: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Clé API / Token (stockée de façon sécurisée)</label>
                  <input
                    type="password"
                    value={facturationForm.apiKeyFacturation}
                    onChange={(e) => setFacturationForm((f) => ({ ...f, apiKeyFacturation: e.target.value }))}
                    placeholder="Laisser vide pour ne pas modifier"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Types de documents à venir */}
            <div className="mb-8 rounded-lg bg-gray-700/30 border border-gray-600/50 p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Types de documents (à venir)</h3>
              <p className="text-sm text-gray-500">
                Les types suivants seront disponibles dans une prochaine version : <strong className="text-gray-400">Devis</strong>, <strong className="text-gray-400">Proforma</strong>, <strong className="text-gray-400">Facture d&apos;achat</strong>, <strong className="text-gray-400">Avoir</strong>. Actuellement, seules les factures clients (vente) sont gérées.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSuccess('Configuration facturation enregistrée.');
                  setError(null);
                  // TODO: appeler l\'API de sauvegarde des paramètres facturation (tenant settings)
                }}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'agent' ? (
        <div className="space-y-6">
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
            <h2 className="text-xl font-bold text-white mb-2">Assistant IA</h2>
            <p className="text-sm text-gray-400 mb-6">
              Configurez l’email (lecture/envoi) et Qonto pour que l’assistant puisse gérer vos e-mails et consulter vos mouvements bancaires. L’agenda est géré par l’assistant sans configuration supplémentaire.
            </p>

            {/* Email — Lecture IMAP */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-white mb-1">Email — Lecture (IMAP)</h3>
              {agentConfig?.email?.configuredRead && (
                <span className="inline-block px-2 py-0.5 text-xs rounded bg-green-400/20 text-green-300 mb-3">Configuré</span>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Serveur IMAP (host)</label>
                  <input
                    type="text"
                    value={agentForm.email?.imapHost ?? ''}
                    onChange={(e) => setAgentForm((f) => ({ ...f, email: { ...f.email, imapHost: e.target.value } }))}
                    placeholder="imap.example.com"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Port IMAP</label>
                  <input
                    type="number"
                    value={agentForm.email?.imapPort ?? 993}
                    onChange={(e) => setAgentForm((f) => ({ ...f, email: { ...f.email, imapPort: parseInt(e.target.value, 10) || 993 } }))}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Utilisateur IMAP</label>
                  <input
                    type="text"
                    value={agentForm.email?.imapUser ?? ''}
                    onChange={(e) => setAgentForm((f) => ({ ...f, email: { ...f.email, imapUser: e.target.value } }))}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe IMAP</label>
                  <input
                    type="password"
                    value={agentForm.email?.imapPassword ?? ''}
                    onChange={(e) => setAgentForm((f) => ({ ...f, email: { ...f.email, imapPassword: e.target.value } }))}
                    placeholder="Laisser vide pour ne pas modifier"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Email — Envoi SMTP */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-white mb-1">Email — Envoi (SMTP)</h3>
              {agentConfig?.email?.configuredSend && (
                <span className="inline-block px-2 py-0.5 text-xs rounded bg-green-400/20 text-green-300 mb-3">Configuré</span>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Serveur SMTP (host)</label>
                  <input
                    type="text"
                    value={agentForm.email?.smtpHost ?? ''}
                    onChange={(e) => setAgentForm((f) => ({ ...f, email: { ...f.email, smtpHost: e.target.value } }))}
                    placeholder="smtp.example.com"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Port SMTP</label>
                  <input
                    type="number"
                    value={agentForm.email?.smtpPort ?? 587}
                    onChange={(e) => setAgentForm((f) => ({ ...f, email: { ...f.email, smtpPort: parseInt(e.target.value, 10) || 587 } }))}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Utilisateur SMTP</label>
                  <input
                    type="text"
                    value={agentForm.email?.smtpUser ?? ''}
                    onChange={(e) => setAgentForm((f) => ({ ...f, email: { ...f.email, smtpUser: e.target.value } }))}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe SMTP</label>
                  <input
                    type="password"
                    value={agentForm.email?.smtpPassword ?? ''}
                    onChange={(e) => setAgentForm((f) => ({ ...f, email: { ...f.email, smtpPassword: e.target.value } }))}
                    placeholder="Laisser vide pour ne pas modifier"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Adresse d’envoi (From)</label>
                  <input
                    type="email"
                    value={agentForm.email?.smtpFrom ?? ''}
                    onChange={(e) => setAgentForm((f) => ({ ...f, email: { ...f.email, smtpFrom: e.target.value } }))}
                    placeholder="noreply@example.com"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Qonto */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-white mb-1">Qonto</h3>
              {agentConfig?.qonto?.configured && (
                <span className="inline-block px-2 py-0.5 text-xs rounded bg-green-400/20 text-green-300 mb-3">Configuré</span>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">API Secret (Bearer)</label>
                  <input
                    type="password"
                    value={agentForm.qonto?.apiSecret ?? ''}
                    onChange={(e) => setAgentForm((f) => ({ ...f, qonto: { ...f.qonto, apiSecret: e.target.value } }))}
                    placeholder="Laisser vide pour ne pas modifier"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">ID compte bancaire (bank_account_id)</label>
                  <input
                    type="text"
                    value={agentForm.qonto?.bankAccountId ?? ''}
                    onChange={(e) => setAgentForm((f) => ({ ...f, qonto: { ...f.qonto, bankAccountId: e.target.value } }))}
                    placeholder="UUID du compte Qonto"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setSaving(true);
                    setError(null);
                    setSuccess(null);
                    const patch: Parameters<typeof apiClient.agent.updateConfig>[0] = {};
                    if (agentForm.email && Object.keys(agentForm.email).length) {
                      const e = agentForm.email;
                      patch.email = {
                        imapHost: e.imapHost || undefined,
                        imapPort: e.imapPort ?? 993,
                        imapUser: e.imapUser || undefined,
                        imapPassword: e.imapPassword || undefined,
                        imapTls: e.imapTls ?? true,
                        smtpHost: e.smtpHost || undefined,
                        smtpPort: e.smtpPort ?? 587,
                        smtpUser: e.smtpUser || undefined,
                        smtpPassword: e.smtpPassword || undefined,
                        smtpFrom: e.smtpFrom || undefined,
                      };
                    }
                    if (agentForm.qonto && (agentForm.qonto.apiSecret !== undefined || agentForm.qonto.bankAccountId !== undefined)) {
                      patch.qonto = {
                        apiSecret: agentForm.qonto.apiSecret || undefined,
                        bankAccountId: agentForm.qonto.bankAccountId || undefined,
                      };
                    }
                    await apiClient.agent.updateConfig(patch);
                    setSuccess('Configuration Assistant IA enregistrée.');
                    const res = await apiClient.agent.getConfig();
                    if (res.success && res.data) {
                      setAgentConfig(res.data);
                    }
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'entreprise' ? (
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
          <h2 className="text-xl font-bold text-white mb-6">Profil Entreprise</h2>
          <form onSubmit={handleSaveEntreprise} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nom de l'entreprise *</label>
                <input
                  type="text"
                  required
                  value={tenant.nomEntreprise || ''}
                  onChange={(e) => setTenant({ ...tenant, nomEntreprise: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Statut juridique</label>
                <select
                  value={tenant.statutJuridique || ''}
                  onChange={(e) => setTenant({ ...tenant, statutJuridique: e.target.value as StatutJuridique || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sélectionner...</option>
                  {STATUTS_JURIDIQUES.map((statut) => (
                    <option key={statut.value} value={statut.value}>
                      {statut.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SIRET</label>
                <input
                  type="text"
                  value={tenant.siret || ''}
                  onChange={(e) => setTenant({ ...tenant, siret: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SIREN</label>
                <input
                  type="text"
                  value={tenant.siren || ''}
                  onChange={(e) => setTenant({ ...tenant, siren: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Code APE</label>
                <input
                  type="text"
                  value={tenant.codeAPE || ''}
                  onChange={(e) => setTenant({ ...tenant, codeAPE: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Code NAF</label>
                <input
                  type="text"
                  value={tenant.codeNAF || ''}
                  onChange={(e) => setTenant({ ...tenant, codeNAF: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={tenant.telephone || ''}
                  onChange={(e) => setTenant({ ...tenant, telephone: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email de contact *</label>
                <input
                  type="email"
                  required
                  value={tenant.emailContact || ''}
                  onChange={(e) => setTenant({ ...tenant, emailContact: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Adresse postale</label>
                <textarea
                  value={tenant.adressePostale || ''}
                  onChange={(e) => setTenant({ ...tenant, adressePostale: e.target.value || null })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Code postal</label>
                <input
                  type="text"
                  value={tenant.codePostal || ''}
                  onChange={(e) => setTenant({ ...tenant, codePostal: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ville</label>
                <input
                  type="text"
                  value={tenant.ville || ''}
                  onChange={(e) => setTenant({ ...tenant, ville: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Métier</label>
                <input
                  type="text"
                  value={tenant.metier || ''}
                  onChange={(e) => setTenant({ ...tenant, metier: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Formulaire création utilisateur */}
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
            <h2 className="text-xl font-bold text-white mb-6">Créer un utilisateur</h2>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mot de passe *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Rôle *</label>
                  <select
                    required
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="collaborateur">Collaborateur</option>
                    <option value="admin">Admin</option>
                    <option value="lecture_seule">Lecture seule</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Fonction</label>
                  <input
                    type="text"
                    value={newUser.fonction}
                    onChange={(e) => setNewUser({ ...newUser, fonction: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
                  <input
                    type="text"
                    value={newUser.nom}
                    onChange={(e) => setNewUser({ ...newUser, nom: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Prénom</label>
                  <input
                    type="text"
                    value={newUser.prenom}
                    onChange={(e) => setNewUser({ ...newUser, prenom: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={newUser.telephone}
                    onChange={(e) => setNewUser({ ...newUser, telephone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Salaire (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newUser.salaire}
                    onChange={(e) => setNewUser({ ...newUser, salaire: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date d'embauche</label>
                  <input
                    type="date"
                    value={newUser.dateEmbauche}
                    onChange={(e) => setNewUser({ ...newUser, dateEmbauche: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Création...' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>

          {/* Liste des utilisateurs */}
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md">
            <div className="px-6 py-4 border-b border-gray-700/30">
              <h3 className="text-lg font-medium text-white">Utilisateurs de l'entreprise</h3>
            </div>
            <div className="p-6">
              {users.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  <UserPlusIcon className="mx-auto h-12 w-12 text-gray-600" />
                  <p className="mt-4 text-gray-400">Aucun utilisateur pour le moment</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700/30">
                    <thead className="bg-gray-800/30">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nom</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rôle</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fonction</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Salaire</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {user.prenom} {user.nom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 capitalize">
                            {user.role.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.fonction || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {user.salaire ? `${user.salaire.toFixed(2)} €` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.statut === 'actif'
                                ? 'bg-green-400/20 text-green-300'
                                : 'bg-gray-400/20 text-gray-300'
                            }`}>
                              {user.statut}
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
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-300">Chargement...</p>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
