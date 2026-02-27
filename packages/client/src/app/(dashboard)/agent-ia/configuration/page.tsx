'use client';

import { useEffect, useState } from 'react';
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
} from '@heroicons/react/24/outline';

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
  phoneNumber?: string;
  webhookUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ConfigurationPage() {
  const router = useRouter();
  const [config, setConfig] = useState<TwilioConfig | null>(null);
  const [niches, setNiches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingCall, setTestingCall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
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
  });

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
        const configData = configResponse.data as unknown as TwilioConfig;
        setConfig(configData);
        setFormData({
          niche: configData.niche || '',
          agentName: configData.agentName || '',
          companyName: configData.companyName || '',
          businessHours: configData.businessHours || '',
          basePrice: configData.basePrice || '',
          humanContact: configData.humanContact || '',
          systemPromptAddon: configData.systemPromptAddon || '',
          knowledgeBase: configData.knowledgeBase || '',
          dispatchDelay: configData.dispatchDelay || 0,
          active: configData.active || false,
        });
      }

      const nichesResponse = await apiClient.twilioConfig.niches();
      if (nichesResponse.success && nichesResponse.data) {
        const data = nichesResponse.data as unknown as { niches: string[] };
        setNiches(data.niches || []);
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
            ? parseInt(value) || 0
            : value,
    });
  };

  const handleToggle = () => {
    if (!editing) return;
    setFormData({
      ...formData,
      active: !formData.active,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await apiClient.twilioConfig.update(formData);

      if (response.success) {
        setSuccess('Configuration sauvegardée avec succès');
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
      });
    }
    setEditing(false);
    setError(null);
  };

  const handleTestCall = async () => {
    try {
      setTestingCall(true);
      setError(null);
      setSuccess(null);

      const response = await apiClient.twilioConfig.testCall();

      if (response.success) {
        setSuccess('Appel de test initié. Vérifiez votre téléphone.');
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du test d'appel");
    } finally {
      setTestingCall(false);
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Composants pour les champs en mode lecture vs édition
  const inputClass = editing
    ? 'w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500'
    : 'w-full px-4 py-2 bg-gray-900/30 border border-gray-800/50 rounded text-gray-300 text-sm cursor-not-allowed';

  const textareaClass = editing
    ? 'w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none'
    : 'w-full px-4 py-2 bg-gray-900/30 border border-gray-800/50 rounded text-gray-300 text-sm cursor-not-allowed resize-none';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header avec bouton Modifier */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Configuration Agent IA</h1>
          <p className="mt-2 text-sm text-gray-400">
            Paramètres de l&apos;agent téléphonique et configuration Twilio
          </p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
          >
            <PencilIcon className="h-5 w-5" />
            Modifier
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
              Annuler
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-400 hover:text-red-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-900/20 border border-green-700/30 text-green-300 px-4 py-3 rounded backdrop-blur-md flex items-center gap-2">
          <CheckIcon className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Infos système (toujours en lecture seule) */}
      <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md mb-6">
        <div className="flex items-center gap-2 mb-4">
          <PhoneIcon className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Informations Twilio</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Numéro Twilio assigné
            </label>
            {config?.phoneNumber ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm font-mono">
                  {config.phoneNumber}
                </div>
                <button
                  onClick={handleCopyNumber}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                  title="Copier le numéro"
                >
                  <ClipboardDocumentIcon className="h-5 w-5" />
                </button>
                {copied && <span className="text-xs text-green-400">Copié !</span>}
              </div>
            ) : (
              <div className="px-4 py-2 bg-gray-900/30 border border-gray-800/50 rounded text-gray-500 text-sm italic">
                Aucun numéro assigné
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Statut agent</label>
            <div className="flex items-center gap-3 px-4 py-2">
              <span
                className={`inline-flex h-3 w-3 rounded-full ${
                  config?.active ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
                }`}
              />
              <span className={`text-sm font-medium ${config?.active ? 'text-green-400' : 'text-gray-500'}`}>
                {config?.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>

          {config?.webhookUrl && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-1">Webhook URL</label>
              <div className="px-4 py-2 bg-gray-900/30 border border-gray-800/50 rounded text-gray-400 text-xs font-mono truncate">
                {config.webhookUrl}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Dernière modification
            </label>
            <div className="px-4 py-2 text-sm text-gray-400">{formatDate(config?.updatedAt)}</div>
          </div>
        </div>
      </div>

      {/* Guide transfert d'appel */}
      {config?.phoneNumber && (
        <div className="bg-amber-900/10 border border-amber-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md mb-6">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-300 mb-2">
                Comment rediriger vos appels vers l&apos;agent IA ?
              </h3>
              <p className="text-sm text-gray-300 mb-3">
                Pour que vos clients soient accueillis par l&apos;agent IA quand ils appellent votre numéro
                professionnel, configurez un <strong className="text-white">renvoi d&apos;appel</strong> chez
                votre opérateur téléphonique vers le numéro Twilio ci-dessus.
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <p>
                  <span className="text-white font-medium">Renvoi inconditionnel :</span> Tous les appels
                  sont redirigés vers l&apos;agent IA (24h/24).
                </p>
                <p>
                  <span className="text-white font-medium">Renvoi sur non-réponse :</span> L&apos;agent IA
                  prend le relais uniquement si vous ne décrochez pas après X sonneries.
                </p>
                <p>
                  <span className="text-white font-medium">Renvoi sur occupation :</span> L&apos;agent IA
                  répond quand votre ligne est déjà occupée.
                </p>
              </div>
              <div className="mt-4 p-3 bg-gray-900/50 rounded border border-gray-700/50">
                <p className="text-xs text-gray-400 mb-1">Exemple de configuration :</p>
                <p className="text-sm text-white font-mono">
                  Votre numéro → Renvoi d&apos;appel → {config.phoneNumber}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Contactez votre opérateur (Orange, SFR, Free, OVH, etc.) ou consultez l&apos;interface
                  de gestion de votre ligne pour configurer le renvoi.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de configuration */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Niche et identité */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            {!editing && <LockClosedIcon className="h-4 w-4 text-gray-500" />}
            <h2 className="text-lg font-bold text-white">Niche et identité</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Niche</label>
              <select
                name="niche"
                value={formData.niche}
                onChange={handleInputChange}
                disabled={!editing}
                className={inputClass}
              >
                <option value="">Sélectionner une niche</option>
                {niches.map((niche) => (
                  <option key={niche} value={niche}>
                    {niche.charAt(0).toUpperCase() + niche.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom de l&apos;agent
              </label>
              <input
                type="text"
                name="agentName"
                value={formData.agentName}
                onChange={handleInputChange}
                disabled={!editing}
                placeholder="Ex: Léa"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom de l&apos;entreprise
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                disabled={!editing}
                placeholder="Ex: TalosPrimes"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Prix de base</label>
              <input
                type="text"
                name="basePrice"
                value={formData.basePrice}
                onChange={handleInputChange}
                disabled={!editing}
                placeholder="Ex: 29.99€"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Horaires</label>
            <textarea
              name="businessHours"
              value={formData.businessHours}
              onChange={handleInputChange}
              disabled={!editing}
              placeholder="Ex: Lun-Ven: 9h-18h, Sam: 10h-16h"
              rows={2}
              className={textareaClass}
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Contact humain</label>
            <input
              type="text"
              name="humanContact"
              value={formData.humanContact}
              onChange={handleInputChange}
              disabled={!editing}
              placeholder="Téléphone ou email pour passer à un humain"
              className={inputClass}
            />
          </div>
        </div>

        {/* Intelligence */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            {!editing && <LockClosedIcon className="h-4 w-4 text-gray-500" />}
            <h2 className="text-lg font-bold text-white">Intelligence</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Prompt addon</label>
            <textarea
              name="systemPromptAddon"
              value={formData.systemPromptAddon}
              onChange={handleInputChange}
              disabled={!editing}
              placeholder="Instructions supplémentaires pour le modèle IA..."
              rows={5}
              className={textareaClass}
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Base de connaissances
            </label>
            <textarea
              name="knowledgeBase"
              value={formData.knowledgeBase}
              onChange={handleInputChange}
              disabled={!editing}
              placeholder="Contexte, informations clés, FAQ..."
              rows={5}
              className={textareaClass}
            />
          </div>
        </div>

        {/* Paramètres avancés */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-4">
            {!editing && <LockClosedIcon className="h-4 w-4 text-gray-500" />}
            <h2 className="text-lg font-bold text-white">Paramètres avancés</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Délai dispatch (minutes)
              </label>
              <input
                type="number"
                name="dispatchDelay"
                value={formData.dispatchDelay}
                onChange={handleInputChange}
                disabled={!editing}
                placeholder="0"
                min="0"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Agent actif</label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={handleToggle}
                  disabled={!editing}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    formData.active ? 'bg-green-600' : 'bg-gray-600'
                  } ${!editing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      formData.active ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm ${formData.active ? 'text-green-400' : 'text-gray-500'}`}>
                  {formData.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton Sauvegarder (visible uniquement en mode édition) */}
        {editing && (
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5" />
                Sauvegarder la configuration
              </>
            )}
          </button>
        )}
      </form>

      {/* Actions (toujours visible) */}
      <div className="mt-8 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
        <h2 className="text-lg font-bold text-white mb-6">Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Tester l&apos;appel</h3>
            <p className="text-sm text-gray-400 mb-4">
              Déclenchez un appel de test pour vérifier que l&apos;agent IA fonctionne correctement.
            </p>
            <button
              onClick={handleTestCall}
              disabled={testingCall || !config?.active}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <PhoneIcon className="h-5 w-5" />
              {testingCall ? 'Test en cours...' : 'Déclencher appel de test'}
            </button>
            {!config?.active && (
              <p className="mt-2 text-xs text-yellow-400">
                Activez l&apos;agent pour pouvoir lancer un test.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Recharger la configuration</h3>
            <p className="text-sm text-gray-400 mb-4">
              Actualiser les données depuis le serveur.
            </p>
            <button
              onClick={loadData}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Actualiser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
