'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// ============================================================
// TYPES
// ============================================================

interface PlatformConfig {
  configured: boolean;
  [key: string]: unknown;
}

interface MarketingConfigDisplay {
  facebook: PlatformConfig & {
    pageAccessToken: string;
    pageId: string;
    instagramUserId: string;
  };
  tiktok: PlatformConfig & {
    clientKey: string;
    clientSecret: string;
    refreshToken: string;
  };
  linkedin: PlatformConfig & {
    accessToken: string;
    orgId: string;
  };
  openai: PlatformConfig & {
    apiKey: string;
  };
}

type TabId = 'facebook' | 'tiktok' | 'linkedin' | 'openai';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
  color: string;
}

const TABS: TabDef[] = [
  { id: 'facebook', label: 'Facebook / Instagram', icon: '📘', color: 'bg-blue-600' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵', color: 'bg-pink-600' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: 'bg-sky-700' },
  { id: 'openai', label: 'OpenAI', icon: '🤖', color: 'bg-emerald-600' },
];

// ============================================================
// COMPOSANT CHAMP SECRET
// ============================================================

function SecretField({
  label,
  value,
  onChange,
  placeholder,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  description?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const isMasked = value.startsWith('••••');

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <div className="relative">
        <input
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full pr-10 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        />
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
        >
          {revealed ? (
            <EyeSlashIcon className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4" />
          )}
        </button>
      </div>
      {isMasked && (
        <p className="text-xs text-amber-400">Valeur existante masquée — saisir une nouvelle valeur pour remplacer</p>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  description,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
      />
    </div>
  );
}

// ============================================================
// INDICATEUR DE STATUT
// ============================================================

function StatusBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
      <CheckCircleIcon className="h-4 w-4" />
      Configuré
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
      <XCircleIcon className="h-4 w-4" />
      Non configuré
    </span>
  );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================

export default function MarketingConfigPage() {
  const [config, setConfig] = useState<MarketingConfigDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('facebook');

  // Form state local
  const [fbForm, setFbForm] = useState({ pageAccessToken: '', pageId: '', instagramUserId: '' });
  const [ttForm, setTtForm] = useState({ clientKey: '', clientSecret: '', refreshToken: '' });
  const [liForm, setLiForm] = useState({ accessToken: '', orgId: '' });
  const [aiForm, setAiForm] = useState({ apiKey: '' });

  // ── Chargement config ──
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await apiClient.marketing.getConfig();
        const data = response.data as unknown as MarketingConfigDisplay;
        if (data) {
          setConfig(data);
          setFbForm({
            pageAccessToken: data.facebook?.pageAccessToken || '',
            pageId: data.facebook?.pageId || '',
            instagramUserId: data.facebook?.instagramUserId || '',
          });
          setTtForm({
            clientKey: data.tiktok?.clientKey || '',
            clientSecret: data.tiktok?.clientSecret || '',
            refreshToken: data.tiktok?.refreshToken || '',
          });
          setLiForm({
            accessToken: data.linkedin?.accessToken || '',
            orgId: data.linkedin?.orgId || '',
          });
          setAiForm({
            apiKey: data.openai?.apiKey || '',
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Sauvegarde ──
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload: Record<string, unknown> = {};
      if (activeTab === 'facebook') payload.facebook = fbForm;
      if (activeTab === 'tiktok') payload.tiktok = ttForm;
      if (activeTab === 'linkedin') payload.linkedin = liForm;
      if (activeTab === 'openai') payload.openai = aiForm;

      await apiClient.marketing.saveConfig(payload);
      setSuccess('Configuration sauvegardée avec succès');

      // Recharger pour avoir les valeurs masquées à jour
      const response = await apiClient.marketing.getConfig();
      const data = response.data as unknown as MarketingConfigDisplay;
      if (data) {
        setConfig(data);
        if (activeTab === 'facebook') setFbForm({ pageAccessToken: data.facebook?.pageAccessToken || '', pageId: data.facebook?.pageId || '', instagramUserId: data.facebook?.instagramUserId || '' });
        if (activeTab === 'tiktok') setTtForm({ clientKey: data.tiktok?.clientKey || '', clientSecret: data.tiktok?.clientSecret || '', refreshToken: data.tiktok?.refreshToken || '' });
        if (activeTab === 'linkedin') setLiForm({ accessToken: data.linkedin?.accessToken || '', orgId: data.linkedin?.orgId || '' });
        if (activeTab === 'openai') setAiForm({ apiKey: data.openai?.apiKey || '' });
      }

      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 rounded-lg">
            <Cog6ToothIcon className="h-7 w-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Configuration Marketing</h1>
            <p className="mt-1 text-sm text-gray-400">
              Connectez vos comptes réseaux sociaux pour publier depuis TalosPrimes
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-900/20 border border-green-700/30 text-green-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setError(null); setSuccess(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <StatusBadge configured={config?.[tab.id]?.configured ?? false} />
          </button>
        ))}
      </div>

      {/* Contenu du tab */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 backdrop-blur-md">
        {/* Facebook / Instagram */}
        {activeTab === 'facebook' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Facebook & Instagram</h2>
              <p className="text-sm text-gray-400">
                Utilisez l&apos;API Meta Graph pour publier sur Facebook et Instagram.
                Vous pouvez obtenir votre Page Access Token depuis le{' '}
                <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                  Graph API Explorer
                </a>.
              </p>
            </div>
            <SecretField
              label="Page Access Token"
              value={fbForm.pageAccessToken}
              onChange={(v) => setFbForm({ ...fbForm, pageAccessToken: v })}
              placeholder="EAFntLfSxEr..."
              description="Token d'accès de votre Page Facebook (long-lived recommandé)"
            />
            <TextField
              label="Page ID"
              value={fbForm.pageId}
              onChange={(v) => setFbForm({ ...fbForm, pageId: v })}
              placeholder="1029257496936725"
              description="Identifiant numérique de votre Page Facebook"
            />
            <TextField
              label="Instagram User ID"
              value={fbForm.instagramUserId}
              onChange={(v) => setFbForm({ ...fbForm, instagramUserId: v })}
              placeholder="1002158382768057"
              description="Identifiant du compte Instagram Business lié à la Page"
            />
          </div>
        )}

        {/* TikTok */}
        {activeTab === 'tiktok' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">TikTok</h2>
              <p className="text-sm text-gray-400">
                Configurez l&apos;API TikTok Content Posting pour publier des photos et vidéos.
                Créez une app sur le{' '}
                <a href="https://developers.tiktok.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                  TikTok Developer Portal
                </a>.
              </p>
            </div>
            <SecretField
              label="Client Key"
              value={ttForm.clientKey}
              onChange={(v) => setTtForm({ ...ttForm, clientKey: v })}
              placeholder="sbawpl2pdtnrwklgap"
              description="Clé client de votre app TikTok"
            />
            <SecretField
              label="Client Secret"
              value={ttForm.clientSecret}
              onChange={(v) => setTtForm({ ...ttForm, clientSecret: v })}
              placeholder="ghKdZ9h7bQvwxep..."
              description="Secret client de votre app TikTok"
            />
            <SecretField
              label="Refresh Token"
              value={ttForm.refreshToken}
              onChange={(v) => setTtForm({ ...ttForm, refreshToken: v })}
              placeholder="rft.JWugOZZyps..."
              description="Token de rafraîchissement OAuth 2.0"
            />
          </div>
        )}

        {/* LinkedIn */}
        {activeTab === 'linkedin' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">LinkedIn</h2>
              <p className="text-sm text-gray-400">
                Publiez sur votre page LinkedIn Organisation via l&apos;API LinkedIn Marketing.
                Configurez votre app sur le{' '}
                <a href="https://www.linkedin.com/developers/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                  LinkedIn Developer Portal
                </a>.
              </p>
            </div>
            <SecretField
              label="Access Token"
              value={liForm.accessToken}
              onChange={(v) => setLiForm({ ...liForm, accessToken: v })}
              placeholder="AQXdq..."
              description="Token d'accès OAuth 2.0 avec les scopes w_member_social et w_organization_social"
            />
            <TextField
              label="Organization ID"
              value={liForm.orgId}
              onChange={(v) => setLiForm({ ...liForm, orgId: v })}
              placeholder="12345678"
              description="Identifiant numérique de votre organisation LinkedIn"
            />
          </div>
        )}

        {/* OpenAI */}
        {activeTab === 'openai' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">OpenAI (Génération de contenu)</h2>
              <p className="text-sm text-gray-400">
                Utilisez GPT pour générer automatiquement des textes et hashtags pour vos publications.
                Créez une clé API sur{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                  OpenAI Platform
                </a>.
              </p>
            </div>
            <SecretField
              label="API Key"
              value={aiForm.apiKey}
              onChange={(v) => setAiForm({ ...aiForm, apiKey: v })}
              placeholder="sk-..."
              description="Clé API OpenAI (modèle GPT-4o-mini utilisé pour la génération)"
            />
          </div>
        )}

        {/* Bouton Sauvegarder */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
