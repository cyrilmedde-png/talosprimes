'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import type { Tenant, User, StatutJuridique } from '@talosprimes/shared';
import { BuildingOfficeIcon, UserPlusIcon, CpuChipIcon, BanknotesIcon, DocumentTextIcon, QueueListIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { apiClient, type ArticleCode } from '@/lib/api-client';

import { useDemoGuard } from '@/hooks/useDemoGuard';
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

type SettingsTab = 'entreprise' | 'utilisateurs' | 'agent' | 'facturation' | 'configPdf' | 'codesArticles' | 'systeme';

function SettingsContent() {
  const router = useRouter();
  const { isDemo, demoAlert } = useDemoGuard();
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

  // Système (n8n)
  const [publishingWorkflows, setPublishingWorkflows] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null);
  const [n8nStatus, setN8nStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [testingN8n, setTestingN8n] = useState(false);

  // Codes articles
  const [articleCodes, setArticleCodes] = useState<ArticleCode[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [newArticle, setNewArticle] = useState({ code: '', designation: '', prixUnitaireHt: '', tvaTaux: '', unite: '' });
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [editArticle, setEditArticle] = useState({ code: '', designation: '', prixUnitaireHt: '', tvaTaux: '', unite: '' });

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
    if (tab === 'facturation' || tab === 'entreprise' || tab === 'utilisateurs' || tab === 'agent' || tab === 'configPdf' || tab === 'codesArticles' || tab === 'systeme') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'codesArticles' && articleCodes.length === 0) {
      loadArticleCodes();
    }
  }, [activeTab]);

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

  const loadArticleCodes = async () => {
    try {
      setLoadingArticles(true);
      const res = await apiClient.articleCodes.list();
      if (res.success) {
        setArticleCodes(res.data.articles || []);
      }
    } catch {
      // silencieux
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await apiClient.articleCodes.create({
        code: newArticle.code,
        designation: newArticle.designation,
        prixUnitaireHt: newArticle.prixUnitaireHt ? parseFloat(newArticle.prixUnitaireHt) : undefined,
        tvaTaux: newArticle.tvaTaux ? parseFloat(newArticle.tvaTaux) : undefined,
        unite: newArticle.unite || undefined,
      });
      setNewArticle({ code: '', designation: '', prixUnitaireHt: '', tvaTaux: '', unite: '' });
      setSuccess('Code article créé');
      await loadArticleCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création code article');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateArticle = async (id: string) => {
    try {
      setSaving(true);
      setError(null);
      await apiClient.articleCodes.update(id, {
        code: editArticle.code,
        designation: editArticle.designation,
        prixUnitaireHt: editArticle.prixUnitaireHt ? parseFloat(editArticle.prixUnitaireHt) : undefined,
        tvaTaux: editArticle.tvaTaux ? parseFloat(editArticle.tvaTaux) : undefined,
        unite: editArticle.unite || undefined,
      });
      setEditingArticleId(null);
      setSuccess('Code article mis à jour');
      await loadArticleCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur modification code article');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    // demo-guard: handleDeleteArticle
    if (isDemo) { demoAlert(); return; }
    if (!confirm('Supprimer ce code article ?')) return;
    try {
      setSaving(true);
      setError(null);
      await apiClient.articleCodes.delete(id);
      setSuccess('Code article supprimé');
      await loadArticleCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression code article');
    } finally {
      setSaving(false);
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
          <button
            onClick={() => setActiveTab('configPdf')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'configPdf'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <DocumentTextIcon className="h-5 w-5 inline mr-2" />
            Config PDF
          </button>
          <button
            onClick={() => setActiveTab('codesArticles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'codesArticles'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <QueueListIcon className="h-5 w-5 inline mr-2" />
            Codes Articles
          </button>
          <button
            onClick={() => setActiveTab('systeme')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'systeme'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <WrenchScrewdriverIcon className="h-5 w-5 inline mr-2" />
            Système
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
      {activeTab === 'codesArticles' ? (
        <div className="space-y-6">
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
            <h2 className="text-xl font-bold text-white mb-2">Codes Articles</h2>
            <p className="text-sm text-gray-400 mb-6">
              Gérez vos codes articles pour les utiliser rapidement dans les factures et bons de commande.
            </p>

            {/* Formulaire ajout */}
            <form onSubmit={handleCreateArticle} className="mb-6 p-4 rounded-lg bg-gray-700/30 border border-gray-600/50">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Ajouter un code article</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={newArticle.code}
                    onChange={(e) => setNewArticle({ ...newArticle, code: e.target.value })}
                    placeholder="Ex: 901"
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-gray-400 mb-1">Désignation *</label>
                  <input
                    type="text"
                    required
                    value={newArticle.designation}
                    onChange={(e) => setNewArticle({ ...newArticle, designation: e.target.value })}
                    placeholder="Ex: Setup initial"
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Prix HT (€)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newArticle.prixUnitaireHt}
                    onChange={(e) => setNewArticle({ ...newArticle, prixUnitaireHt: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Unité</label>
                  <input
                    type="text"
                    value={newArticle.unite}
                    onChange={(e) => setNewArticle({ ...newArticle, unite: e.target.value })}
                    placeholder="h, j, forfait..."
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md disabled:opacity-50"
                >
                  {saving ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>

            {/* Tableau des codes articles */}
            {loadingArticles ? (
              <div className="text-center py-8 text-gray-400">Chargement...</div>
            ) : articleCodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <QueueListIcon className="mx-auto h-12 w-12 text-gray-600" />
                <p className="mt-4 text-gray-400">Aucun code article</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700/30">
                  <thead className="bg-gray-800/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Désignation</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Prix HT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Unité</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                    {articleCodes.map((art) => (
                      <tr key={art.id}>
                        {editingArticleId === art.id ? (
                          <>
                            <td className="px-4 py-2">
                              <input type="text" value={editArticle.code} onChange={(e) => setEditArticle({ ...editArticle, code: e.target.value })} className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={editArticle.designation} onChange={(e) => setEditArticle({ ...editArticle, designation: e.target.value })} className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" inputMode="decimal" value={editArticle.prixUnitaireHt} onChange={(e) => setEditArticle({ ...editArticle, prixUnitaireHt: e.target.value })} className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm text-right" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" value={editArticle.unite} onChange={(e) => setEditArticle({ ...editArticle, unite: e.target.value })} className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm" />
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-400">—</td>
                            <td className="px-4 py-2 text-right">
                              <button type="button" onClick={() => handleUpdateArticle(art.id)} disabled={saving} className="text-green-400 hover:text-green-300 text-sm mr-2">Sauver</button>
                              <button type="button" onClick={() => setEditingArticleId(null)} className="text-gray-400 hover:text-gray-300 text-sm">Annuler</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-sm text-white font-mono">{art.code}</td>
                            <td className="px-4 py-3 text-sm text-gray-300">{art.designation}</td>
                            <td className="px-4 py-3 text-sm text-gray-300 text-right">{art.prixUnitaireHt ? `${Number(art.prixUnitaireHt).toFixed(2)} €` : '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-300">{art.unite || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${art.actif ? 'bg-green-400/20 text-green-300' : 'bg-gray-400/20 text-gray-400'}`}>
                                {art.actif ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingArticleId(art.id);
                                  setEditArticle({
                                    code: art.code,
                                    designation: art.designation,
                                    prixUnitaireHt: art.prixUnitaireHt ? String(Number(art.prixUnitaireHt)) : '',
                                    tvaTaux: art.tvaTaux ? String(Number(art.tvaTaux)) : '',
                                    unite: art.unite || '',
                                  });
                                }}
                                className="text-indigo-400 hover:text-indigo-300 text-sm mr-3"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteArticle(art.id)}
                                disabled={saving}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Supprimer
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'configPdf' ? (
        <div className="space-y-6">
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
            <h2 className="text-xl font-bold text-white mb-2">Configuration du PDF Facture</h2>
            <p className="text-sm text-gray-400 mb-6">
              Ces informations apparaissent directement sur vos factures PDF. Le nom d'entreprise, l'adresse, le SIRET et les coordonnees se configurent dans l'onglet <button onClick={() => setActiveTab('entreprise')} className="text-indigo-400 hover:underline">Profil Entreprise</button>.
            </p>

            <form onSubmit={async (e) => {
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
                  body: JSON.stringify({
                    tvaIntracom: tenant.tvaIntracom || null,
                    rib: tenant.rib || null,
                    logoBase64: (tenant as Record<string, unknown>).logoBase64 || null,
                  }),
                });
                if (!response.ok) {
                  const data = await response.json();
                  throw new Error(data.error || 'Erreur lors de la sauvegarde');
                }
                setSuccess('Configuration PDF mise a jour avec succes');
                await loadData();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
              } finally {
                setSaving(false);
              }
            }} className="space-y-8">

              {/* Logo entreprise */}
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Logo de l&apos;entreprise</h3>
                <p className="text-sm text-gray-500 mb-4">Image affichee en haut a gauche de vos factures PDF. Formats acceptes : PNG, JPG. Taille max : 500 Ko.</p>
                <div className="flex items-start gap-6">
                  {/* Apercu du logo */}
                  <div className="flex-shrink-0 w-32 h-32 bg-gray-700/50 border border-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                    {(tenant as Record<string, unknown>).logoBase64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(tenant as Record<string, unknown>).logoBase64 as string}
                        alt="Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-500 text-xs text-center px-2">Aucun logo</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Choisir une image
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 500 * 1024) {
                            setError('Le logo ne doit pas depasser 500 Ko');
                            return;
                          }
                          if (!['image/png', 'image/jpeg'].includes(file.type)) {
                            setError('Format accepte : PNG ou JPG uniquement');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            const base64 = reader.result as string;
                            setTenant({ ...tenant, logoBase64: base64 } as Partial<Tenant>);
                            setError(null);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {!!(tenant as Record<string, unknown>).logoBase64 && (
                      <button
                        type="button"
                        onClick={() => setTenant({ ...tenant, logoBase64: null } as Partial<Tenant>)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Supprimer le logo
                      </button>
                    )}
                    <p className="text-xs text-gray-500">Le logo sera redimensionne automatiquement sur le PDF (max 80x60 px).</p>
                  </div>
                </div>
              </div>

              {/* Informations legales */}
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Informations legales</h3>
                <p className="text-sm text-gray-500 mb-4">Numero de TVA intracommunautaire affiche dans l'en-tete du PDF.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">TVA Intracommunautaire</label>
                    <input
                      type="text"
                      value={(tenant as Record<string, unknown>).tvaIntracom as string || ''}
                      onChange={(e) => setTenant({ ...tenant, tvaIntracom: e.target.value || null } as Partial<Tenant>)}
                      placeholder="Ex : FR 12 345678901"
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="rounded-lg bg-gray-700/30 border border-gray-600/50 px-4 py-3 text-sm text-gray-400 w-full">
                      <span className="text-gray-500">SIRET :</span>{' '}
                      <span className="text-white">{tenant.siret || <span className="text-gray-500 italic">Non renseigne</span>}</span>
                      <span className="text-gray-600 mx-2">|</span>
                      <button onClick={() => setActiveTab('entreprise')} className="text-indigo-400 hover:underline text-xs">Modifier</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coordonnees bancaires */}
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Coordonnees bancaires</h3>
                <p className="text-sm text-gray-500 mb-4">RIB / IBAN affiche dans le tableau &quot;Informations de paiement&quot; en bas de la facture.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">RIB / IBAN</label>
                  <textarea
                    value={(tenant as Record<string, unknown>).rib as string || ''}
                    onChange={(e) => setTenant({ ...tenant, rib: e.target.value || null } as Partial<Tenant>)}
                    rows={2}
                    placeholder="Ex : IBAN FR76 1234 5678 9012 3456 7890 123 | BIC BNPAFRPP"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Apercu des infos qui apparaissent sur le PDF */}
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Apercu - Donnees utilisees sur le PDF</h3>
                <div className="rounded-lg bg-gray-700/20 border border-gray-600/40 p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Entreprise :</span>{' '}
                      <span className="text-white">{tenant.nomEntreprise || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">SIRET :</span>{' '}
                      <span className="text-white">{tenant.siret || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Adresse :</span>{' '}
                      <span className="text-white">{tenant.adressePostale || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">CP / Ville :</span>{' '}
                      <span className="text-white">{[tenant.codePostal, tenant.ville].filter(Boolean).join(' ') || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">TVA Intra :</span>{' '}
                      <span className="text-white">{(tenant as Record<string, unknown>).tvaIntracom as string || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">RIB :</span>{' '}
                      <span className="text-white font-mono text-xs">{(tenant as Record<string, unknown>).rib as string || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email :</span>{' '}
                      <span className="text-white">{tenant.emailContact || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Telephone :</span>{' '}
                      <span className="text-white">{tenant.telephone || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info modes de paiement */}
              <div className="rounded-lg bg-gray-700/30 border border-gray-600/50 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Modes de paiement et description</h3>
                <p className="text-sm text-gray-500">
                  Le <strong className="text-gray-400">mode de paiement</strong> (CB, Especes, Virement bancaire) et la <strong className="text-gray-400">description</strong> (designation de la prestation) sont configurables par facture lors de la creation. Si non renseignes, les valeurs par defaut sont &quot;Virement bancaire&quot; et &quot;Prestation de services&quot;.
                </p>
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
        </div>
      ) : activeTab === 'facturation' ? (
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
      ) : activeTab === 'systeme' ? (
        <div className="space-y-6">
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
            <h2 className="text-xl font-bold text-white mb-2">Système &amp; Workflows</h2>
            <p className="text-sm text-gray-400 mb-6">
              Outils de maintenance pour les workflows n8n et le système.
            </p>

            {/* Connexion n8n */}
            <div className="mb-8 p-4 rounded-lg bg-gray-700/30 border border-gray-600/50">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Connexion n8n</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={async () => {
                    setTestingN8n(true);
                    setN8nStatus(null);
                    try {
                      const result = await apiClient.n8n.test();
                      setN8nStatus(result);
                    } catch (err) {
                      setN8nStatus({ success: false, message: err instanceof Error ? err.message : 'Erreur' });
                    } finally {
                      setTestingN8n(false);
                    }
                  }}
                  disabled={testingN8n}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium rounded-md disabled:opacity-50"
                >
                  {testingN8n ? 'Test en cours...' : 'Tester la connexion'}
                </button>
                {n8nStatus && (
                  <span className={`text-sm ${n8nStatus.success ? 'text-green-400' : 'text-red-400'}`}>
                    {n8nStatus.success ? '\u2705' : '\u274C'} {n8nStatus.message}
                  </span>
                )}
              </div>
            </div>

            {/* Publier tous les workflows */}
            <div className="p-4 rounded-lg bg-gray-700/30 border border-gray-600/50">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Publier tous les workflows</h3>
              <p className="text-xs text-gray-500 mb-4">
                Active tous les workflows n8n puis red&eacute;marre le service n8n pour enregistrer les webhooks.
                L&apos;op&eacute;ration prend ~30 secondes (red&eacute;marrage inclus). Utile apr&egrave;s un d&eacute;ploiement.
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={async () => {
                    setPublishingWorkflows(true);
                    setPublishResult(null);
                    try {
                      const result = await apiClient.n8n.publishAll();
                      setPublishResult(result);
                    } catch (err) {
                      setPublishResult({ success: false, message: err instanceof Error ? err.message : 'Erreur' });
                    } finally {
                      setPublishingWorkflows(false);
                    }
                  }}
                  disabled={publishingWorkflows}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {publishingWorkflows ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Publication en cours...
                    </span>
                  ) : (
                    'Publier tous les workflows'
                  )}
                </button>
              </div>
              {publishResult && (
                <div className={`mt-4 p-3 rounded-md text-sm ${
                  publishResult.success
                    ? 'bg-green-900/20 border border-green-700/30 text-green-300'
                    : 'bg-red-900/20 border border-red-700/30 text-red-300'
                }`}>
                  {publishResult.success ? '\u2705' : '\u274C'} {publishResult.message}
                </div>
              )}
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