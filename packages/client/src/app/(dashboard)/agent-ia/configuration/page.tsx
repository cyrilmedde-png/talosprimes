'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  PhoneIcon,
  XMarkIcon,
  CheckIcon,
  PencilIcon,
  LockClosedIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ClipboardDocumentIcon,
  MicrophoneIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  PhoneArrowUpRightIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  BookOpenIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
  BoltIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

// ─── Types ───
interface TwilioConfig {
  id: string;
  niche: string;
  agentName: string;
  companyName: string;
  businessHours: string;
  basePrice: string;
  humanContact: string;
  systemPromptAddon: string;
  knowledgeBase: string;
  dispatchDelay: number;
  active: boolean;
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
  webhookUrl?: string;
  systemPrompt?: string | null;
  welcomeMessage?: string | null;
  voiceName?: string;
  language?: string;
  maxTokens?: number;
  temperature?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface FormData {
  niche: string;
  agentName: string;
  companyName: string;
  businessHours: string;
  basePrice: string;
  humanContact: string;
  systemPromptAddon: string;
  knowledgeBase: string;
  dispatchDelay: number;
  active: boolean;
  accountSid: string;
  authToken: string;
  systemPrompt: string | null;
  welcomeMessage: string | null;
  voiceName: string;
  language: string;
  maxTokens: number;
  temperature: number;
}

type TabKey = 'identite' | 'voix' | 'intelligence' | 'twilio' | 'avance';

const TABS: { key: TabKey; label: string; icon: typeof UserCircleIcon }[] = [
  { key: 'identite', label: 'Identité', icon: UserCircleIcon },
  { key: 'voix', label: 'Voix & Accueil', icon: SpeakerWaveIcon },
  { key: 'intelligence', label: 'Intelligence IA', icon: CpuChipIcon },
  { key: 'twilio', label: 'Twilio', icon: PhoneIcon },
  { key: 'avance', label: 'Avancé', icon: Cog6ToothIcon },
];

const VOICES: { value: string; label: string; gender: string; provider: string }[] = [
  { value: 'Polly.Lea-Neural', label: 'Léa', gender: '♀ Française', provider: 'AWS Neural' },
  { value: 'Polly.Celine', label: 'Céline', gender: '♀ Française', provider: 'AWS Standard' },
  { value: 'Polly.Mathieu-Neural', label: 'Mathieu', gender: '♂ Français', provider: 'AWS Neural' },
  { value: 'Polly.Remi-Neural', label: 'Rémi', gender: '♂ Français', provider: 'AWS Neural' },
  { value: 'Polly.Liam-Neural', label: 'Liam', gender: '♂ Canadien-FR', provider: 'AWS Neural' },
  { value: 'Polly.Gabrielle-Neural', label: 'Gabrielle', gender: '♀ Canadienne-FR', provider: 'AWS Neural' },
  { value: 'Google.fr-FR-Wavenet-A', label: 'Wavenet A', gender: '♀ Française', provider: 'Google' },
  { value: 'Google.fr-FR-Wavenet-C', label: 'Wavenet C', gender: '♀ Française', provider: 'Google' },
  { value: 'Google.fr-FR-Wavenet-D', label: 'Wavenet D', gender: '♂ Français', provider: 'Google' },
];

const LANGUAGES = [
  { value: 'fr-FR', label: 'Français (France)', flag: '🇫🇷' },
  { value: 'fr-CA', label: 'Français (Canada)', flag: '🇨🇦' },
  { value: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { value: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
  { value: 'es-ES', label: 'Español', flag: '🇪🇸' },
  { value: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'it-IT', label: 'Italiano', flag: '🇮🇹' },
  { value: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
];

const NICHE_LABELS: Record<string, string> = {
  talosprimes: 'TalosPrimes (Défaut)',
  plomberie: 'Plomberie',
  medical: 'Médical',
  immobilier: 'Immobilier',
  pompes_funebres: 'Pompes funèbres',
  serrurier: 'Serrurier',
  electricien: 'Électricien',
  veterinaire: 'Vétérinaire',
  restaurant: 'Restaurant',
};

// ─── Helpers ───
function cls(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

const defaultFormData: FormData = {
  niche: '',
  agentName: '',
  companyName: '',
  businessHours: '',
  basePrice: '',
  humanContact: '',
  systemPromptAddon: '',
  knowledgeBase: '',
  dispatchDelay: 0,
  active: false,
  accountSid: '',
  authToken: '',
  systemPrompt: '',
  welcomeMessage: '',
  voiceName: 'Polly.Lea-Neural',
  language: 'fr-FR',
  maxTokens: 150,
  temperature: 0.3,
};

// ─── Components ───
function Badge({ color, children }: { color: 'green' | 'red' | 'yellow' | 'blue' | 'gray'; children: React.ReactNode }) {
  const colors = {
    green: 'bg-green-900/40 text-green-300 border-green-700/40',
    red: 'bg-red-900/40 text-red-300 border-red-700/40',
    yellow: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
    blue: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
    gray: 'bg-gray-800/40 text-gray-400 border-gray-700/40',
  };
  return (
    <span className={cls('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', colors[color])}>
      {children}
    </span>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cls('bg-gray-800/30 border border-gray-700/30 rounded-xl p-6 backdrop-blur-sm', className)}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: typeof PhoneIcon; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-5 w-5 text-indigo-400" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function FieldLabel({ label, hint, required, warning }: { label: string; hint?: string; required?: boolean; warning?: string }) {
  return (
    <div className="mb-1.5">
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      {warning && (
        <p className="text-xs text-yellow-400 mt-0.5 flex items-center gap-1">
          <ExclamationTriangleIcon className="h-3.5 w-3.5" />
          {warning}
        </p>
      )}
    </div>
  );
}

// ─── Page ───
export default function ConfigurationPage() {
  const router = useRouter();
  const [config, setConfig] = useState<TwilioConfig | null>(null);
  const [niches, setNiches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingCall, setTestingCall] = useState(false);
  const [callingOut, setCallingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('identite');
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [outboundNumber, setOutboundNumber] = useState('');
  const [outboundReason, setOutboundReason] = useState('');

  const [formData, setFormData] = useState<FormData>({ ...defaultFormData });

  // ─── Data loading ───
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
      setError(null);

      const configResponse = await apiClient.twilioConfig.get();
      if (configResponse.success && configResponse.data) {
        const d = configResponse.data as unknown as TwilioConfig;
        setConfig(d);
        setFormData({
          niche: d.niche || '',
          agentName: d.agentName || '',
          companyName: d.companyName || '',
          businessHours: d.businessHours || '',
          basePrice: d.basePrice || '',
          humanContact: d.humanContact || '',
          systemPromptAddon: d.systemPromptAddon || '',
          knowledgeBase: d.knowledgeBase || '',
          dispatchDelay: d.dispatchDelay || 0,
          active: d.active || false,
          accountSid: d.accountSid || '',
          authToken: d.authToken || '',
          systemPrompt: d.systemPrompt || '',
          welcomeMessage: d.welcomeMessage || '',
          voiceName: d.voiceName || 'Polly.Lea-Neural',
          language: d.language || 'fr-FR',
          maxTokens: d.maxTokens ?? 150,
          temperature: d.temperature ?? 0.3,
        });
      }

      const nichesResponse = await apiClient.twilioConfig.niches();
      if (nichesResponse.success && nichesResponse.data) {
        const data = nichesResponse.data as unknown as { niches: string[] };
        setNiches(data.niches || []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(msg);
      if (msg.includes('Session expirée')) router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // ─── Handlers ───
  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const step = (e.target as HTMLInputElement).step;
    setFormData({
      ...formData,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked
        : type === 'number' ? (step ? parseFloat(value) || 0 : parseInt(value) || 0)
        : type === 'range' ? parseFloat(value) || 0
        : value,
    });
  };

  const handleToggle = async () => {
    const newActive = !formData.active;
    setFormData({ ...formData, active: newActive });
    if (!editing) {
      try {
        setSaving(true);
        await apiClient.twilioConfig.update({ ...formData, active: newActive });
        setSuccess(newActive ? 'Agent activé' : 'Agent désactivé');
        setTimeout(() => setSuccess(null), 2000);
        await loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur');
        setFormData({ ...formData, active: !newActive });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const response = await apiClient.twilioConfig.update(formData as unknown as Record<string, unknown>);
      if (response.success) {
        setSuccess('Configuration sauvegardée');
        setEditing(false);
        setTimeout(() => setSuccess(null), 3000);
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (config) {
      setFormData({
        niche: config.niche || '',
        agentName: config.agentName || '',
        companyName: config.companyName || '',
        businessHours: config.businessHours || '',
        basePrice: config.basePrice || '',
        humanContact: config.humanContact || '',
        systemPromptAddon: config.systemPromptAddon || '',
        knowledgeBase: config.knowledgeBase || '',
        dispatchDelay: config.dispatchDelay || 0,
        active: config.active || false,
        accountSid: config.accountSid || '',
        authToken: config.authToken || '',
        systemPrompt: config.systemPrompt || '',
        welcomeMessage: config.welcomeMessage || '',
        voiceName: config.voiceName || 'Polly.Lea-Neural',
        language: config.language || 'fr-FR',
        maxTokens: config.maxTokens ?? 150,
        temperature: config.temperature ?? 0.3,
      });
    }
    setEditing(false);
    setError(null);
  };

  const handleTestCall = async () => {
    try {
      setTestingCall(true);
      setError(null);
      const response = await apiClient.twilioConfig.testCall();
      if (response.success) {
        setSuccess('Appel de test initié ! Vérifiez votre téléphone.');
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du test d'appel");
    } finally {
      setTestingCall(false);
    }
  };

  const handleOutboundCall = async () => {
    if (!outboundNumber || !outboundReason) {
      setError('Renseignez le numéro et le motif de l\'appel');
      return;
    }
    try {
      setCallingOut(true);
      setError(null);
      const response = await apiClient.twilioConfig.outboundCall({ to: outboundNumber, reason: outboundReason });
      if (response.success) {
        setSuccess(`Appel sortant vers ${outboundNumber} initié`);
        setOutboundNumber('');
        setOutboundReason('');
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur appel sortant');
    } finally {
      setCallingOut(false);
    }
  };

  const handleCopyNumber = () => {
    if (config?.phoneNumber) {
      navigator.clipboard.writeText(config.phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  // ─── Diagnostics ───
  const diagnostics = useMemo(() => {
    const issues: { level: 'error' | 'warning' | 'info'; text: string }[] = [];
    if (!formData.accountSid) issues.push({ level: 'error', text: 'Account SID Twilio non configuré' });
    if (!formData.authToken) issues.push({ level: 'error', text: 'Auth Token Twilio non configuré' });
    if (!formData.agentName) issues.push({ level: 'warning', text: 'Nom de l\'agent non défini' });
    if (!formData.companyName) issues.push({ level: 'warning', text: 'Nom de l\'entreprise non défini' });
    if (!formData.knowledgeBase && !formData.systemPrompt) issues.push({ level: 'warning', text: 'Base de connaissances vide — l\'agent ne pourra pas répondre aux questions métier' });
    if (formData.maxTokens < 120) issues.push({ level: 'warning', text: `Max tokens trop bas (${formData.maxTokens}) — risque de réponses coupées. Recommandé: 200+` });
    if (!formData.welcomeMessage) issues.push({ level: 'info', text: 'Message d\'accueil vide — le message par défaut sera utilisé' });
    if (!formData.businessHours) issues.push({ level: 'info', text: 'Horaires non renseignés — l\'agent ne pourra pas les communiquer' });
    return issues;
  }, [formData]);

  // ─── Prompt preview ───
  const promptPreview = useMemo(() => {
    if (formData.systemPrompt) return formData.systemPrompt;
    const lines = [
      `=== QUI TU ES ===`,
      `Tu es ${formData.agentName || 'l\'assistant(e)'}, assistant(e) téléphonique de ${formData.companyName || 'Notre entreprise'}. Tu vouvoies TOUJOURS.`,
      '',
      formData.basePrice ? `=== TARIFS ===\nPrix de base: ${formData.basePrice}` : '',
      formData.businessHours ? `=== HORAIRES ===\n${formData.businessHours}` : '',
      formData.humanContact ? `=== CONTACT HUMAIN ===\n${formData.humanContact}` : '',
      formData.knowledgeBase ? `=== BASE DE CONNAISSANCES ===\n${formData.knowledgeBase}` : '',
      '',
      `=== OUTILS ===`,
      `create_lead, search_client, create_devis, schedule_callback, update_lead`,
      '',
      `=== COMPORTEMENT ===`,
      `1. MAXIMUM 2 PHRASES par réponse`,
      `2. UNE question à la fois`,
      `3. Ne te répète JAMAIS`,
      `4. Nouveau numéro → create_lead immédiatement`,
      formData.systemPromptAddon ? `\n=== INSTRUCTIONS SUPPLÉMENTAIRES ===\n${formData.systemPromptAddon}` : '',
    ];
    return lines.filter(Boolean).join('\n');
  }, [formData]);

  // ─── CSS helpers ───
  const inputCls = editing
    ? 'w-full px-3.5 py-2.5 bg-gray-900/60 border border-gray-600/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all'
    : 'w-full px-3.5 py-2.5 bg-gray-900/30 border border-gray-800/40 rounded-lg text-gray-400 text-sm cursor-not-allowed';

  const textareaCls = cls(inputCls, 'resize-none');

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto" />
          <p className="mt-4 text-gray-400">Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───
  return (
    <div className="max-w-5xl mx-auto">
      {/* ═══ HEADER ═══ */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Agent IA Téléphonique</h1>
              <p className="text-sm text-gray-400">Configuration complète de l&apos;assistant vocal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Status */}
            <button
              type="button"
              onClick={handleToggle}
              disabled={saving}
              className={cls(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                formData.active
                  ? 'bg-green-900/30 border-green-700/40 text-green-300 hover:bg-green-900/50'
                  : 'bg-gray-800/50 border-gray-700/40 text-gray-400 hover:bg-gray-800/70',
                saving && 'opacity-60 cursor-wait'
              )}
            >
              <span className={cls('h-2.5 w-2.5 rounded-full', formData.active ? 'bg-green-400 animate-pulse' : 'bg-gray-500')} />
              {formData.active ? 'Actif' : 'Inactif'}
            </button>
            {/* Edit toggle */}
            {!editing ? (
              <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                <PencilIcon className="h-4 w-4" />
                Modifier
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                  {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Phone number banner */}
        {config?.phoneNumber && (
          <div className="mt-4 flex items-center gap-3 bg-gray-800/40 border border-gray-700/30 rounded-xl px-5 py-3">
            <PhoneIcon className="h-5 w-5 text-indigo-400" />
            <span className="text-sm text-gray-300">Numéro Twilio :</span>
            <span className="font-mono font-semibold text-white">{config.phoneNumber}</span>
            <button onClick={handleCopyNumber} className="text-gray-400 hover:text-white transition-colors" title="Copier">
              <ClipboardDocumentIcon className="h-4 w-4" />
            </button>
            {copied && <span className="text-xs text-green-400">Copié !</span>}
            <span className="text-gray-600 mx-2">|</span>
            <span className="text-xs text-gray-500">Modifié le {formatDate(config.updatedAt)}</span>
          </div>
        )}
      </div>

      {/* ═══ TOASTS ═══ */}
      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><XMarkIcon className="h-5 w-5" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-900/20 border border-green-700/30 text-green-300 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckIcon className="h-5 w-5" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* ═══ DIAGNOSTICS ═══ */}
      {diagnostics.length > 0 && (
        <Card className="mb-6 !p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheckIcon className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-semibold text-white">Diagnostic rapide</span>
            <Badge color={diagnostics.some(d => d.level === 'error') ? 'red' : diagnostics.some(d => d.level === 'warning') ? 'yellow' : 'blue'}>
              {diagnostics.filter(d => d.level === 'error').length} erreur(s), {diagnostics.filter(d => d.level === 'warning').length} avertissement(s)
            </Badge>
          </div>
          <div className="space-y-1.5">
            {diagnostics.map((d, i) => (
              <div key={i} className={cls('text-xs flex items-start gap-2 px-3 py-1.5 rounded-md',
                d.level === 'error' && 'bg-red-900/20 text-red-300',
                d.level === 'warning' && 'bg-yellow-900/20 text-yellow-300',
                d.level === 'info' && 'bg-blue-900/10 text-blue-300'
              )}>
                <span>{d.level === 'error' ? '●' : d.level === 'warning' ? '▲' : 'ℹ'}</span>
                <span>{d.text}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 mb-6 bg-gray-800/30 rounded-xl p-1 border border-gray-700/30">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cls(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30 border border-transparent'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <form onSubmit={handleSave} className="space-y-6">

        {/* ─── Identité ─── */}
        {activeTab === 'identite' && (
          <div className="space-y-6">
            <Card>
              <SectionHeader icon={UserCircleIcon} title="Identité de l'agent" description="Comment l'agent se présente au téléphone" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <FieldLabel label="Nom de l'agent" hint="Le prénom que l'agent utilisera au téléphone" required />
                  <input type="text" name="agentName" value={formData.agentName} onChange={handleInput} disabled={!editing} placeholder="Ex: Léa, Mathieu..." className={inputCls} />
                </div>
                <div>
                  <FieldLabel label="Nom de l'entreprise" required />
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleInput} disabled={!editing} placeholder="Ex: TalosPrimes" className={inputCls} />
                </div>
                <div>
                  <FieldLabel label="Secteur d'activité (niche)" hint="Adapte le vocabulaire et le comportement de l'agent" />
                  <select name="niche" value={formData.niche} onChange={handleInput} disabled={!editing} className={inputCls}>
                    <option value="">Sélectionner un secteur</option>
                    {niches.map((n) => <option key={n} value={n}>{NICHE_LABELS[n] || n}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel label="Prix de base" hint="L'agent pourra communiquer ce tarif aux appelants" />
                  <input type="text" name="basePrice" value={formData.basePrice} onChange={handleInput} disabled={!editing} placeholder="Ex: à partir de 49€/mois" className={inputCls} />
                </div>
              </div>
            </Card>

            <Card>
              <SectionHeader icon={ClockIcon} title="Disponibilité" description="Horaires et contact de secours" />
              <div className="space-y-4">
                <div>
                  <FieldLabel label="Horaires d'ouverture" hint="L'agent les communiquera aux appelants si demandé" />
                  <textarea name="businessHours" value={formData.businessHours} onChange={handleInput} disabled={!editing} placeholder="Ex: du lundi au vendredi, de 9h à 18h" rows={2} className={textareaCls} />
                </div>
                <div>
                  <FieldLabel label="Contact humain (fallback)" hint="Numéro ou email vers lequel renvoyer si l'agent ne peut pas aider" />
                  <input type="text" name="humanContact" value={formData.humanContact} onChange={handleInput} disabled={!editing} placeholder="Ex: support@talosprimes.com ou 01 23 45 67 89" className={inputCls} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ─── Voix & Accueil ─── */}
        {activeTab === 'voix' && (
          <div className="space-y-6">
            <Card>
              <SectionHeader icon={MicrophoneIcon} title="Message d'accueil" description="La première phrase que l'appelant entend" />
              <div>
                <FieldLabel
                  label="Message d'accueil"
                  hint="Gardez-le court et naturel. Évitez les caractères spéciaux (certaines voix Polly ne les supportent pas)."
                  warning={formData.welcomeMessage && formData.welcomeMessage.length > 100 ? 'Message long — risque de latence au décrochage' : undefined}
                />
                <input
                  type="text"
                  name="welcomeMessage"
                  value={formData.welcomeMessage || ''}
                  onChange={handleInput}
                  disabled={!editing}
                  placeholder="Ex: Bonjour, bienvenue chez TalosPrimes."
                  className={inputCls}
                />
                {!formData.welcomeMessage && (
                  <p className="text-xs text-gray-500 mt-1.5 italic">Vide = message par défaut : &quot;Bonjour, bienvenue chez [entreprise]. Comment puis-je vous aider ?&quot;</p>
                )}
              </div>
            </Card>

            <Card>
              <SectionHeader icon={SpeakerWaveIcon} title="Voix de synthèse" description="Le timbre vocal de l'agent" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <FieldLabel label="Voix TTS" hint="Choisissez une voix qui correspond à l'agent" />
                  <select name="voiceName" value={formData.voiceName} onChange={handleInput} disabled={!editing} className={inputCls}>
                    {VOICES.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label} — {v.gender} ({v.provider})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Voix actuelle : <span className="text-indigo-300 font-medium">{VOICES.find(v => v.value === formData.voiceName)?.label || formData.voiceName}</span>
                  </p>
                </div>
                <div>
                  <FieldLabel label="Langue de reconnaissance vocale" />
                  <select name="language" value={formData.language} onChange={handleInput} disabled={!editing} className={inputCls}>
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            {/* Info transfert d'appel */}
            {config?.phoneNumber && (
              <Card className="!bg-amber-900/10 !border-amber-700/20">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-semibold text-amber-300 mb-2">Redirection d&apos;appels</h4>
                    <p className="text-gray-300 mb-2">
                      Configurez un <strong className="text-white">renvoi d&apos;appel</strong> chez votre opérateur vers le numéro Twilio pour que vos clients soient accueillis par l&apos;agent IA.
                    </p>
                    <div className="bg-gray-900/50 rounded-lg p-3 font-mono text-xs text-white">
                      Votre numéro → Renvoi → {config.phoneNumber}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ─── Intelligence IA ─── */}
        {activeTab === 'intelligence' && (
          <div className="space-y-6">
            <Card>
              <SectionHeader icon={BookOpenIcon} title="Base de connaissances" description="Les informations que l'agent peut utiliser pour répondre — CRUCIAL pour la qualité des réponses" />
              <div>
                <FieldLabel
                  label="Connaissances (texte libre)"
                  hint="Tarifs détaillés, liste des services, FAQ, infos clés... Plus c'est complet, mieux l'agent répond."
                  warning={!formData.knowledgeBase ? 'Base vide — l\'agent ne pourra répondre qu\'avec les infos basiques (nom, prix, horaires)' : undefined}
                />
                <textarea
                  name="knowledgeBase"
                  value={formData.knowledgeBase}
                  onChange={handleInput}
                  disabled={!editing}
                  placeholder={"Exemple :\n\nNos offres :\n- Starter : 49€/mois — CRM + facturation\n- Pro : 99€/mois — CRM + facturation + agent IA\n- Enterprise : sur devis\n\nNos services :\n- Gestion commerciale (devis, factures)\n- CRM et suivi clients\n- Agent IA téléphonique\n- Comptabilité automatisée\n\nFAQ :\n- Période d'essai : 14 jours gratuits\n- Engagement : sans engagement\n- Support : par email ou téléphone"}
                  rows={12}
                  className={textareaCls}
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  En complément, vous pouvez gérer une base structurée dans l&apos;onglet <strong className="text-indigo-400">Base de connaissances</strong> du menu Agent IA.
                </p>
              </div>
            </Card>

            <Card>
              <SectionHeader icon={ChatBubbleLeftRightIcon} title="Prompt système" description="Le cerveau de l'agent — définit sa personnalité et ses instructions" />
              <div className="space-y-5">
                <div>
                  <FieldLabel
                    label="Prompt système complet (optionnel)"
                    hint="Si rempli, remplace ENTIÈREMENT le prompt par défaut. Avancé — laissez vide pour le prompt automatique."
                  />
                  <textarea name="systemPrompt" value={formData.systemPrompt || ''} onChange={handleInput} disabled={!editing} placeholder="Laissez vide pour le prompt automatique (recommandé)" rows={6} className={textareaCls} />
                </div>
                <div>
                  <FieldLabel label="Instructions supplémentaires (addon)" hint="Ajoutées au prompt par défaut. Ignorées si un prompt complet est défini ci-dessus." />
                  <textarea name="systemPromptAddon" value={formData.systemPromptAddon} onChange={handleInput} disabled={!editing} placeholder="Ex: Ne jamais parler de la concurrence. Toujours proposer un rendez-vous." rows={4} className={textareaCls} />
                </div>

                {/* Prompt preview */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPromptPreview(!showPromptPreview)}
                    className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <EyeIcon className="h-4 w-4" />
                    {showPromptPreview ? 'Masquer' : 'Prévisualiser'} le prompt complet que l&apos;IA reçoit
                  </button>
                  {showPromptPreview && (
                    <div className="mt-3 bg-gray-900/70 border border-gray-700/30 rounded-lg p-4 max-h-80 overflow-y-auto">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{promptPreview}</pre>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <SectionHeader icon={BoltIcon} title="Paramètres du modèle IA" description="Contrôle la longueur et le style des réponses" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FieldLabel
                    label={`Tokens max par réponse : ${formData.maxTokens}`}
                    hint="Plus c'est élevé, plus la réponse peut être longue"
                    warning={formData.maxTokens < 120 ? 'Trop bas — les réponses seront coupées' : undefined}
                  />
                  <input type="range" name="maxTokens" value={formData.maxTokens} onChange={handleInput} disabled={!editing} min="50" max="500" step="10" className="w-full accent-indigo-500" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>50 (très court)</span>
                    <span className="text-indigo-400 font-medium">Recommandé: 200-300</span>
                    <span>500 (long)</span>
                  </div>
                </div>
                <div>
                  <FieldLabel
                    label={`Température (créativité) : ${formData.temperature.toFixed(1)}`}
                    hint="Bas = réponses précises et prévisibles. Haut = plus créatif mais moins fiable."
                  />
                  <input type="range" name="temperature" value={formData.temperature} onChange={handleInput} disabled={!editing} min="0" max="1" step="0.1" className="w-full accent-indigo-500" />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0 (robot)</span>
                    <span className="text-indigo-400 font-medium">Recommandé: 0.2-0.4</span>
                    <span>1 (créatif)</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ─── Twilio ─── */}
        {activeTab === 'twilio' && (
          <div className="space-y-6">
            <Card>
              <SectionHeader icon={LockClosedIcon} title="Identifiants Twilio" description="Vos clés API Twilio pour connecter l'agent au réseau téléphonique" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <FieldLabel label="Account SID" required />
                  {editing ? (
                    <input type="text" name="accountSid" value={formData.accountSid} onChange={handleInput} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className={cls(inputCls, 'font-mono')} />
                  ) : (
                    <div className={cls(inputCls, 'font-mono')}>
                      {formData.accountSid
                        ? `${formData.accountSid.substring(0, 8)}...${formData.accountSid.slice(-4)}`
                        : <span className="text-red-400 italic">Non configuré</span>}
                    </div>
                  )}
                </div>
                <div>
                  <FieldLabel label="Auth Token" required />
                  {editing ? (
                    <input type="password" name="authToken" value={formData.authToken} onChange={handleInput} placeholder="Votre Auth Token Twilio" className={cls(inputCls, 'font-mono')} />
                  ) : (
                    <div className={cls(inputCls, 'font-mono')}>
                      {formData.authToken ? '••••••••••••••••••••' : <span className="text-red-400 italic">Non configuré</span>}
                    </div>
                  )}
                </div>
              </div>
              {config?.phoneNumber && (
                <div className="mt-4 pt-4 border-t border-gray-700/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <FieldLabel label="Numéro Twilio" hint="Assigné automatiquement" />
                      <div className="px-3.5 py-2.5 bg-gray-900/30 border border-gray-800/40 rounded-lg text-gray-300 text-sm font-mono">
                        {config.phoneNumber}
                      </div>
                    </div>
                    <div>
                      <FieldLabel label="Webhook URL" hint="URL que Twilio appelle quand un appel arrive" />
                      <div className="px-3.5 py-2.5 bg-gray-900/30 border border-gray-800/40 rounded-lg text-gray-400 text-xs font-mono truncate">
                        {config.webhookUrl || 'https://n8n.talosprimes.com/webhook/twilio-inbound-voice'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ─── Avancé ─── */}
        {activeTab === 'avance' && (
          <div className="space-y-6">
            <Card>
              <SectionHeader icon={Cog6ToothIcon} title="Paramètres avancés" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <FieldLabel label="Délai de dispatch (minutes)" hint="Temps avant de déclencher les actions post-appel (notification admin, etc.)" />
                  <input type="number" name="dispatchDelay" value={formData.dispatchDelay} onChange={handleInput} disabled={!editing} min="0" max="60" className={inputCls} />
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card>
              <SectionHeader icon={PhoneArrowUpRightIcon} title="Actions" description="Tester et déclencher des appels" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Test call */}
                <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/20">
                  <h4 className="text-sm font-semibold text-white mb-2">Appel de test entrant</h4>
                  <p className="text-xs text-gray-400 mb-3">L&apos;agent vous appelle pour tester le workflow complet.</p>
                  <button
                    type="button"
                    onClick={handleTestCall}
                    disabled={testingCall || !config?.active}
                    className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    {testingCall ? 'Test en cours...' : 'Déclencher appel test'}
                  </button>
                  {!config?.active && <p className="mt-2 text-xs text-yellow-400">Activez l&apos;agent pour tester.</p>}
                </div>

                {/* Outbound call */}
                <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/20">
                  <h4 className="text-sm font-semibold text-white mb-2">Appel sortant</h4>
                  <p className="text-xs text-gray-400 mb-3">L&apos;agent appelle un numéro avec un motif précis.</p>
                  <div className="space-y-2 mb-3">
                    <input
                      type="text"
                      value={outboundNumber}
                      onChange={(e) => setOutboundNumber(e.target.value)}
                      placeholder="+33612345678"
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/40 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <input
                      type="text"
                      value={outboundReason}
                      onChange={(e) => setOutboundReason(e.target.value)}
                      placeholder="Motif : rappel devis, relance client..."
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/40 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleOutboundCall}
                    disabled={callingOut || !config?.active || !outboundNumber || !outboundReason}
                    className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <PhoneArrowUpRightIcon className="h-4 w-4" />
                    {callingOut ? 'Appel en cours...' : 'Lancer l\'appel'}
                  </button>
                </div>
              </div>

              {/* Refresh */}
              <div className="mt-5 pt-5 border-t border-gray-700/20">
                <button
                  type="button"
                  onClick={loadData}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Recharger la configuration depuis le serveur
                </button>
              </div>
            </Card>
          </div>
        )}
      </form>
    </div>
  );
}
