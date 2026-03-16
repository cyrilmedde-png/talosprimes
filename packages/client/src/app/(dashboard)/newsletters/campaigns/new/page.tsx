'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Template {
  id: string;
  nom: string;
  sujet: string;
  categorie: string;
  contenuHtml: string;
}

interface SubscriberList {
  id: string;
  nom: string;
  count: number;
}

type CampaignStep = 1 | 2 | 3 | 4;

export default function NewCampaignPage() {
  const [step, setStep] = useState<CampaignStep>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [subscriberLists, setSubscriberLists] = useState<SubscriberList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    sujet: '',
    expediteurNom: '',
    expediteurEmail: '',
    useTemplate: false,
    selectedTemplate: '',
    contenuHtml: '',
    subscriberListId: '',
    sendNow: true,
    scheduledDate: '',
    scheduledTime: '',
  });

  const [previewHtml, setPreviewHtml] = useState('');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');

      if (!token || !tenantId) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
      };

      // Fetch templates
      const templatesRes = await fetch(`${baseUrl}/api/newsletters/templates`, { headers });
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }

      // Fetch subscriber lists
      const listsRes = await fetch(`${baseUrl}/api/newsletters/subscribers/lists`, { headers });
      if (listsRes.ok) {
        const listsData = await listsRes.json();
        setSubscriberLists(listsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        selectedTemplate: templateId,
        sujet: template.sujet,
        contenuHtml: template.contenuHtml,
      });
      setPreviewHtml(template.contenuHtml);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');

      if (!token || !tenantId) {
        setError('Authentication required');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      };

      const res = await fetch(`${baseUrl}/api/newsletters/campaigns/test-email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sujet: formData.sujet,
          contenuHtml: formData.contenuHtml,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send test email');
      }

      alert('Email de test envoyé avec succès!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');

      if (!token || !tenantId) {
        setError('Authentication required');
        setSubmitting(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      };

      let dateEnvoi = null;
      if (!formData.sendNow) {
        const dateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
        dateEnvoi = dateTime.toISOString();
      }

      const payload = {
        nom: formData.nom,
        sujet: formData.sujet,
        expediteurNom: formData.expediteurNom,
        expediteurEmail: formData.expediteurEmail,
        contenuHtml: formData.contenuHtml,
        subscriberListId: formData.subscriberListId,
        dateEnvoi,
      };

      const res = await fetch(`${baseUrl}/api/newsletters/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to create campaign');
      }

      // Redirect to campaigns list
      window.location.href = '/newsletters';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/newsletters">
              <button className="text-gray-400 hover:text-white mb-4">← Retour</button>
            </Link>
            <h1 className="text-4xl font-bold text-white">Nouvelle Campagne</h1>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-200">⚠️ {error}</p>
          </div>
        )}

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    s === step
                      ? 'bg-blue-600 text-white'
                      : s < step
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                <div
                  className={`flex-1 h-1 mx-2 ${
                    s < step ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                ></div>
              </div>
            ))}
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold bg-gray-700 text-gray-400">
              ✓
            </div>
          </div>
          <div className="flex justify-between mt-4 text-sm">
            <span className={step === 1 ? 'text-white font-semibold' : 'text-gray-400'}>
              Infos
            </span>
            <span className={step === 2 ? 'text-white font-semibold' : 'text-gray-400'}>
              Contenu
            </span>
            <span className={step === 3 ? 'text-white font-semibold' : 'text-gray-400'}>
              Destinataires
            </span>
            <span className={step === 4 ? 'text-white font-semibold' : 'text-gray-400'}>
              Planification
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateCampaign}>
          {/* Step 1: Infos */}
          {step === 1 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Informations de la campagne</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Nom de la campagne
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Campagne de printemps"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Sujet de l'email
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sujet}
                    onChange={(e) => setFormData({ ...formData, sujet: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Découvrez nos nouveaux produits"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Nom de l'expéditeur
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.expediteurNom}
                      onChange={(e) => setFormData({ ...formData, expediteurNom: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      placeholder="Ex: Équipe Marketing"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Email de l'expéditeur
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.expediteurEmail}
                      onChange={(e) => setFormData({ ...formData, expediteurEmail: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      placeholder="noreply@example.com"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Contenu */}
          {step === 2 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Contenu de l'email</h2>
              <div className="space-y-6">
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-gray-300 text-sm font-medium mb-4">Utiliser un template</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleTemplateSelect(template.id)}
                        className={`p-3 rounded-lg border-2 transition text-left ${
                          formData.selectedTemplate === template.id
                            ? 'border-blue-500 bg-blue-900'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <p className="text-white font-medium text-sm">{template.nom}</p>
                        <p className="text-gray-400 text-xs mt-1">{template.categorie}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Contenu HTML
                  </label>
                  <textarea
                    required
                    value={formData.contenuHtml}
                    onChange={(e) => {
                      setFormData({ ...formData, contenuHtml: e.target.value });
                      setPreviewHtml(e.target.value);
                    }}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono text-sm h-48 resize-none"
                    placeholder="<html>...</html>"
                  />
                </div>

                {previewHtml && (
                  <div>
                    <p className="text-gray-300 text-sm font-medium mb-2">Aperçu</p>
                    <div className="bg-white rounded-lg border border-gray-700 h-64 overflow-auto">
                      <iframe
                        srcDoc={previewHtml}
                        title="Preview"
                        className="w-full h-full border-none"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  ← Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Destinataires */}
          {step === 3 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Sélectionner les destinataires</h2>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Liste d'abonnés
                </label>
                <select
                  required
                  value={formData.subscriberListId}
                  onChange={(e) => setFormData({ ...formData, subscriberListId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Sélectionner une liste --</option>
                  {subscriberLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.nom} ({list.count} abonnés)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  ← Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Planification */}
          {step === 4 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Planification et envoi</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-4">
                    Quand envoyer?
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.sendNow}
                        onChange={() => setFormData({ ...formData, sendNow: true })}
                        className="w-4 h-4"
                      />
                      <span className="text-white">Envoyer maintenant</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        checked={!formData.sendNow}
                        onChange={() => setFormData({ ...formData, sendNow: false })}
                        className="w-4 h-4"
                      />
                      <span className="text-white">Planifier pour plus tard</span>
                    </label>
                  </div>
                </div>

                {!formData.sendNow && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        required={!formData.sendNow}
                        value={formData.scheduledDate}
                        onChange={(e) =>
                          setFormData({ ...formData, scheduledDate: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Heure
                      </label>
                      <input
                        type="time"
                        required={!formData.sendNow}
                        value={formData.scheduledTime}
                        onChange={(e) =>
                          setFormData({ ...formData, scheduledTime: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-3 mt-8 pt-8 border-t border-gray-700">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    ← Précédent
                  </button>
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    📧 Envoyer test
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition font-medium"
                >
                  {submitting ? 'Création...' : '✓ Créer la campagne'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
