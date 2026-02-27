'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import {
  PhoneIcon,
  XMarkIcon,
  CheckIcon,
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

  // Form states
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

      // Load config
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

      // Load niches
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
        setTimeout(() => setSuccess(null), 3000);
        // Reload config
        await loadData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
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
      setError(err instanceof Error ? err.message : 'Erreur lors du test d\'appel');
    } finally {
      setTestingCall(false);
    }
  };

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Configuration Agent Twilio IA
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Paramètres de l'agent IA et configuration Twilio
        </p>
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

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Niche Section */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white mb-4">Niche et identité</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Niche
              </label>
              <select
                name="niche"
                value={formData.niche}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:border-indigo-500"
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
                Nom de l'agent
              </label>
              <input
                type="text"
                name="agentName"
                value={formData.agentName}
                onChange={handleInputChange}
                placeholder="Ex: Anna"
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom de l'entreprise
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="Ex: TalosPrimes"
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prix de base
              </label>
              <input
                type="text"
                name="basePrice"
                value={formData.basePrice}
                onChange={handleInputChange}
                placeholder="Ex: 29.99€"
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Horaires
            </label>
            <textarea
              name="businessHours"
              value={formData.businessHours}
              onChange={handleInputChange}
              placeholder="Ex: Lun-Ven: 9h-18h, Sam: 10h-16h"
              rows={3}
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contact humain
            </label>
            <input
              type="text"
              name="humanContact"
              value={formData.humanContact}
              onChange={handleInputChange}
              placeholder="Téléphone ou email pour passer à un humain"
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Prompt et Knowledge Base Section */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white mb-4">Intelligence</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prompt addon
            </label>
            <textarea
              name="systemPromptAddon"
              value={formData.systemPromptAddon}
              onChange={handleInputChange}
              placeholder="Instructions supplémentaires pour le modèle IA..."
              rows={6}
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
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
              placeholder="Contexte, informations clés, FAQ..."
              rows={6}
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Advanced Settings Section */}
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white mb-4">Paramètres avancés</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Délai dispatch (en minutes)
            </label>
            <input
              type="number"
              name="dispatchDelay"
              value={formData.dispatchDelay}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="mt-6">
            <label className="flex items-center gap-4 cursor-pointer">
              <span className="text-sm font-medium text-gray-300">
                Agent actif
              </span>
              <button
                type="button"
                onClick={handleToggle}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  formData.active
                    ? 'bg-green-600'
                    : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    formData.active ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
            <p className="mt-2 text-xs text-gray-400">
              {formData.active
                ? 'L\'agent IA est actif'
                : 'L\'agent IA est désactivé'}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
        >
          <CheckIcon className="h-5 w-5" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
        </button>
      </form>

      {/* Actions Section */}
      <div className="mt-8 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md">
        <h2 className="text-lg font-bold text-white mb-6">Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Test Call */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Tester l'appel
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Déclenchez un appel de test pour vérifier que l'agent IA fonctionne
              correctement.
            </p>
            <button
              onClick={handleTestCall}
              disabled={testingCall}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <PhoneIcon className="h-5 w-5" />
              {testingCall ? 'Test en cours...' : 'Déclencher appel de test'}
            </button>
          </div>

          {/* Twilio Number */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Numéro Twilio
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {config?.phoneNumber
                ? `Votre numéro Twilio assigné:`
                : 'Aucun numéro Twilio assigné'}
            </p>
            <div className="px-4 py-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm font-mono">
              {config?.phoneNumber || 'Non configuré'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
