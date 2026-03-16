'use client';

import React, { useState, useEffect } from 'react';

interface Template {
  id: string;
  nom: string;
  sujet: string;
  categorie: 'newsletter' | 'promotion' | 'transactionnel' | 'relance' | 'bienvenue' | 'evenement';
  contenuHtml: string;
  dateCreation: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    sujet: '',
    contenuHtml: '',
    categorie: 'newsletter',
  });

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
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

      const res = await fetch(`${baseUrl}/api/newsletters/templates`, { headers });
      if (!res.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const res = await fetch(`${baseUrl}/api/newsletters/templates`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to create template');
      }

      setFormData({
        nom: '',
        sujet: '',
        contenuHtml: '',
        categorie: 'newsletter',
      });
      setShowCreateModal(false);
      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

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
      };

      const res = await fetch(`${baseUrl}/api/newsletters/templates/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        throw new Error('Failed to delete template');
      }

      fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'newsletter':
        return 'bg-blue-900 text-blue-200';
      case 'promotion':
        return 'bg-orange-900 text-orange-200';
      case 'transactionnel':
        return 'bg-gray-700 text-gray-200';
      case 'relance':
        return 'bg-yellow-900 text-yellow-200';
      case 'bienvenue':
        return 'bg-green-900 text-green-200';
      case 'evenement':
        return 'bg-purple-900 text-purple-200';
      default:
        return 'bg-gray-700 text-gray-200';
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      newsletter: 'Newsletter',
      promotion: 'Promotion',
      transactionnel: 'Transactionnel',
      relance: 'Relance',
      bienvenue: 'Bienvenue',
      evenement: 'Événement',
    };
    return labels[category] || category;
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Templates Email</h1>
            <p className="text-gray-400 mt-2">{templates.length} templates</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            ✚ Créer un template
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-200">⚠️ {error}</p>
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400 text-lg">Aucun template trouvé</p>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:border-gray-600 transition group cursor-pointer"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">{template.nom}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{template.sujet}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryBadgeColor(
                        template.categorie
                      )}`}
                    >
                      {getCategoryLabel(template.categorie)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(template.dateCreation).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowPreviewModal(true);
                      }}
                      className="flex-1 px-3 py-2 text-sm bg-blue-900 hover:bg-blue-800 text-blue-200 rounded transition"
                    >
                      👁️ Aperçu
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="px-3 py-2 text-sm bg-red-900 hover:bg-red-800 text-red-200 rounded transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedTemplate.nom}</h2>
                <p className="text-gray-400 text-sm mt-1">{selectedTemplate.sujet}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-700">
              <iframe
                srcDoc={selectedTemplate.contenuHtml}
                title="Template Preview"
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Créer un template</h2>
            <form onSubmit={handleCreateTemplate} className="flex-1 flex flex-col gap-4 overflow-auto">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Nom</label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="Mon Template"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Sujet</label>
                <input
                  type="text"
                  required
                  value={formData.sujet}
                  onChange={(e) => setFormData({ ...formData, sujet: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="Sujet de l'email"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Catégorie</label>
                <select
                  value={formData.categorie}
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="newsletter">Newsletter</option>
                  <option value="promotion">Promotion</option>
                  <option value="transactionnel">Transactionnel</option>
                  <option value="relance">Relance</option>
                  <option value="bienvenue">Bienvenue</option>
                  <option value="evenement">Événement</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-gray-300 text-sm font-medium mb-2">Contenu HTML</label>
                <textarea
                  required
                  value={formData.contenuHtml}
                  onChange={(e) => setFormData({ ...formData, contenuHtml: e.target.value })}
                  className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono text-sm resize-none"
                  placeholder="<html>...</html>"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
