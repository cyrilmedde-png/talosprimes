'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';
import { Save, Trash2, Plus, Star, Eye, EyeOff, Mail, CheckCircle } from 'lucide-react';

// Types
interface Testimonial {
  id: string;
  nom: string;
  prenom: string;
  entreprise?: string;
  poste?: string;
  avatar?: string;
  note: number;
  commentaire: string;
  affiche: boolean;
  ordre: number;
}

interface ContactMessage {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  entreprise?: string;
  message: string;
  traite: boolean;
  createdAt: string;
}

type TabType = 'content' | 'testimonials' | 'messages' | 'config';

interface ConfigSection {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'email' | 'tel' | 'textarea';
  category: 'contact' | 'legal' | 'company';
}

export default function CMSPage() {
  const [activeTab, setActiveTab] = useState<TabType>('content');
  
  // Content
  const [content, setContent] = useState<Record<string, string>>({});
  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [savingContent, setSavingContent] = useState<string | null>(null);
  
  // Testimonials
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState<Partial<Testimonial>>({
    nom: '',
    prenom: '',
    entreprise: '',
    poste: '',
    avatar: '',
    note: 5,
    commentaire: '',
    affiche: true,
    ordre: 0,
  });

  // Messages
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  // Charger les données
  useEffect(() => {
    loadContent();
    loadTestimonials();
    loadMessages();
  }, []);

  const loadContent = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content`);
      const data = await response.json();
      setContent(data);
      setEditingContent(data);
    } catch (error) {
      console.error('Erreur chargement contenu:', error);
    }
  };

  const loadTestimonials = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/testimonials/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTestimonials(data);
    } catch (error) {
      console.error('Erreur chargement testimonials:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/contact`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  // Sauvegarder contenu
  const saveContent = async (section: string) => {
    setSavingContent(section);
    try {
      const token = getAccessToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content/${section}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contenu: editingContent[section] }),
      });
      setContent({ ...content, [section]: editingContent[section] });
      alert('Contenu sauvegardé !');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSavingContent(null);
    }
  };

  // Créer testimonial
  const createTestimonial = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/testimonials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTestimonial),
      });
      
      if (response.ok) {
        await loadTestimonials();
        setShowTestimonialForm(false);
        setNewTestimonial({
          nom: '',
          prenom: '',
          entreprise: '',
          poste: '',
          avatar: '',
          note: 5,
          commentaire: '',
          affiche: true,
          ordre: 0,
        });
        alert('Témoignage créé !');
      }
    } catch (error) {
      console.error('Erreur création testimonial:', error);
      alert('Erreur lors de la création');
    }
  };

  // Mettre à jour testimonial
  const updateTestimonial = async (id: string, data: Partial<Testimonial>) => {
    try {
      const token = getAccessToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/testimonials/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      await loadTestimonials();
      alert('Témoignage mis à jour !');
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  // Supprimer testimonial
  const deleteTestimonial = async (id: string) => {
    if (!confirm('Supprimer ce témoignage ?')) return;
    
    try {
      const token = getAccessToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/testimonials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadTestimonials();
      alert('Témoignage supprimé !');
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Marquer message comme traité
  const markMessageAsProcessed = async (id: string) => {
    try {
      const token = getAccessToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/contact/${id}/traite`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadMessages();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Supprimer message
  const deleteMessage = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    
    try {
      const token = getAccessToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/contact/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadMessages();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const contentSections = [
    { key: 'hero_title', label: 'Titre Hero' },
    { key: 'hero_subtitle', label: 'Sous-titre Hero' },
    { key: 'hero_cta_primary', label: 'CTA Principal' },
    { key: 'hero_cta_secondary', label: 'CTA Secondaire' },
    { key: 'feature_1_title', label: 'Feature 1 - Titre' },
    { key: 'feature_1_desc', label: 'Feature 1 - Description' },
    { key: 'feature_2_title', label: 'Feature 2 - Titre' },
    { key: 'feature_2_desc', label: 'Feature 2 - Description' },
    { key: 'feature_3_title', label: 'Feature 3 - Titre' },
    { key: 'feature_3_desc', label: 'Feature 3 - Description' },
    { key: 'feature_4_title', label: 'Feature 4 - Titre' },
    { key: 'feature_4_desc', label: 'Feature 4 - Description' },
    { key: 'feature_5_title', label: 'Feature 5 - Titre' },
    { key: 'feature_5_desc', label: 'Feature 5 - Description' },
    { key: 'feature_6_title', label: 'Feature 6 - Titre' },
    { key: 'feature_6_desc', label: 'Feature 6 - Description' },
    { key: 'stats_1_value', label: 'Stat 1 - Valeur' },
    { key: 'stats_1_label', label: 'Stat 1 - Label' },
    { key: 'stats_2_value', label: 'Stat 2 - Valeur' },
    { key: 'stats_2_label', label: 'Stat 2 - Label' },
    { key: 'stats_3_value', label: 'Stat 3 - Valeur' },
    { key: 'stats_3_label', label: 'Stat 3 - Label' },
    { key: 'cta_section_title', label: 'Section CTA - Titre' },
    { key: 'cta_section_subtitle', label: 'Section CTA - Sous-titre' },
    { key: 'footer_company_name', label: 'Footer - Nom entreprise' },
    { key: 'footer_company_desc', label: 'Footer - Description' },
  ];

  const configSections: ConfigSection[] = [
    // COORDONNÉES DE CONTACT
    { key: 'config_contact_email', label: 'Email de contact', placeholder: 'contact@talosprimes.com', type: 'email', category: 'contact' },
    { key: 'config_contact_phone', label: 'Téléphone', placeholder: '+33 1 23 45 67 89', type: 'tel', category: 'contact' },
    { key: 'config_contact_address', label: 'Adresse complète', placeholder: '123 Avenue de la Tech, 75001 Paris, France', type: 'textarea', category: 'contact' },
    
    // INFORMATIONS LÉGALES
    { key: 'config_legal_company_name', label: 'Raison sociale', placeholder: 'TalosPrimes SAS', type: 'text', category: 'legal' },
    { key: 'config_legal_legal_form', label: 'Forme juridique', placeholder: 'SAS (Société par Actions Simplifiée)', type: 'text', category: 'legal' },
    { key: 'config_legal_capital', label: 'Capital social', placeholder: '10 000 €', type: 'text', category: 'legal' },
    { key: 'config_legal_siret', label: 'SIRET', placeholder: 'XXX XXX XXX XXXXX', type: 'text', category: 'legal' },
    { key: 'config_legal_tva', label: 'Numéro TVA intracommunautaire', placeholder: 'FR XX XXX XXX XXX', type: 'text', category: 'legal' },
    { key: 'config_legal_address', label: 'Siège social', placeholder: '123 Avenue de la Tech, 75001 Paris, France', type: 'textarea', category: 'legal' },
    
    // INFORMATIONS ENTREPRISE
    { key: 'config_company_description', label: 'Description entreprise', placeholder: 'La plateforme de gestion intelligente...', type: 'textarea', category: 'company' },
    { key: 'config_company_support_email', label: 'Email support', placeholder: 'support@talosprimes.com', type: 'email', category: 'company' },
    { key: 'config_company_rgpd_email', label: 'Email RGPD/DPO', placeholder: 'rgpd@talosprimes.com', type: 'email', category: 'company' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestion de la Landing Page</h1>
        <p className="text-gray-600 mt-2">Modifiez le contenu, les témoignages et consultez les messages de contact</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'content'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Contenu
        </button>
        <button
          onClick={() => setActiveTab('testimonials')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'testimonials'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Témoignages ({testimonials.length})
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-6 py-3 font-semibold transition relative ${
            activeTab === 'messages'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Messages ({messages.filter(m => !m.traite).length})
          {messages.filter(m => !m.traite).length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {messages.filter(m => !m.traite).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'config'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ⚙️ Configuration
        </button>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          {contentSections.map((section) => (
            <div key={section.key} className="bg-white p-6 rounded-lg shadow">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {section.label}
              </label>
              <div className="flex gap-2">
                {section.label.includes('Description') ? (
                  <textarea
                    value={editingContent[section.key] || ''}
                    onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                    rows={3}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                ) : (
                  <input
                    type="text"
                    value={editingContent[section.key] || ''}
                    onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                )}
                <button
                  onClick={() => saveContent(section.key)}
                  disabled={savingContent === section.key || editingContent[section.key] === content[section.key]}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingContent === section.key ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Testimonials Tab */}
      {activeTab === 'testimonials' && (
        <div>
          <div className="mb-4">
            <button
              onClick={() => setShowTestimonialForm(!showTestimonialForm)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nouveau témoignage
            </button>
          </div>

          {/* Form nouveau testimonial */}
          {showTestimonialForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-xl font-bold mb-4">Nouveau témoignage</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Prénom *"
                  value={newTestimonial.prenom}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, prenom: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Nom *"
                  value={newTestimonial.nom}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, nom: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Entreprise"
                  value={newTestimonial.entreprise}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, entreprise: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Poste"
                  value={newTestimonial.poste}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, poste: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Avatar (ex: AB)"
                  value={newTestimonial.avatar}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, avatar: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Note /5</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newTestimonial.note}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, note: parseInt(e.target.value) })}
                    className="px-4 py-2 border border-gray-300 rounded-lg w-full"
                  />
                </div>
                <div className="col-span-2">
                  <textarea
                    placeholder="Commentaire *"
                    value={newTestimonial.commentaire}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, commentaire: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newTestimonial.affiche}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, affiche: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <label>Afficher sur la landing page</label>
                </div>
                <input
                  type="number"
                  placeholder="Ordre d'affichage"
                  value={newTestimonial.ordre}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, ordre: parseInt(e.target.value) })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={createTestimonial}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Créer
                </button>
                <button
                  onClick={() => setShowTestimonialForm(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste testimonials */}
          <div className="grid gap-4">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {testimonial.avatar || `${testimonial.prenom[0]}${testimonial.nom[0]}`}
                      </div>
                      <div>
                        <div className="font-bold">{testimonial.prenom} {testimonial.nom}</div>
                        <div className="text-sm text-gray-600">
                          {testimonial.poste && `${testimonial.poste} - `}{testimonial.entreprise}
                        </div>
                      </div>
                      <div className="flex">
                        {[...Array(testimonial.note)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      {testimonial.affiche ? (
                        <Eye className="w-5 h-5 text-green-600" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <p className="text-gray-700 italic">"{testimonial.commentaire}"</p>
                    <div className="text-sm text-gray-500 mt-2">Ordre: {testimonial.ordre}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateTestimonial(testimonial.id, { affiche: !testimonial.affiche })}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                      title={testimonial.affiche ? 'Masquer' : 'Afficher'}
                    >
                      {testimonial.affiche ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => deleteTestimonial(testimonial.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
              Aucun message de contact
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`bg-white p-6 rounded-lg shadow ${message.traite ? 'opacity-60' : 'border-l-4 border-purple-600'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-lg">
                      {message.prenom} {message.nom}
                      {message.traite && <span className="ml-2 text-sm text-green-600">(Traité)</span>}
                    </div>
                    <div className="text-gray-600">
                      <Mail className="inline w-4 h-4 mr-1" />
                      {message.email}
                    </div>
                    {message.telephone && (
                      <div className="text-gray-600 text-sm">Tél: {message.telephone}</div>
                    )}
                    {message.entreprise && (
                      <div className="text-gray-600 text-sm">Entreprise: {message.entreprise}</div>
                    )}
                    <div className="text-sm text-gray-400 mt-1">
                      {new Date(message.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!message.traite && (
                      <button
                        onClick={() => markMessageAsProcessed(message.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                        title="Marquer comme traité"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div className="space-y-8">
          {/* Coordonnées de Contact */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              📞 Coordonnées de Contact
            </h2>
            <p className="text-gray-600 mb-4">
              Ces informations seront affichées sur la landing page dans la section Contact
            </p>
            <div className="space-y-4">
              {configSections
                .filter(s => s.category === 'contact')
                .map((section) => (
                  <div key={section.key} className="bg-white p-6 rounded-lg shadow">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {section.label}
                    </label>
                    <div className="flex gap-2">
                      {section.type === 'textarea' ? (
                        <textarea
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          rows={3}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        />
                      ) : (
                        <input
                          type={section.type || 'text'}
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        />
                      )}
                      <button
                        onClick={() => saveContent(section.key)}
                        disabled={savingContent === section.key || editingContent[section.key] === content[section.key]}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {savingContent === section.key ? 'Sauvegarde...' : 'Sauvegarder'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Informations Légales */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              ⚖️ Informations Légales
            </h2>
            <p className="text-gray-600 mb-4">
              Ces informations seront utilisées dans les mentions légales, CGU, CGV et politique de confidentialité.
              <br />
              <span className="text-orange-600 font-semibold">⚠️ Important : Remplacez les valeurs fictives par vos vraies informations !</span>
            </p>
            <div className="space-y-4">
              {configSections
                .filter(s => s.category === 'legal')
                .map((section) => (
                  <div key={section.key} className="bg-white p-6 rounded-lg shadow">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {section.label}
                    </label>
                    <div className="flex gap-2">
                      {section.type === 'textarea' ? (
                        <textarea
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          rows={3}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        />
                      ) : (
                        <input
                          type={section.type || 'text'}
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        />
                      )}
                      <button
                        onClick={() => saveContent(section.key)}
                        disabled={savingContent === section.key || editingContent[section.key] === content[section.key]}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {savingContent === section.key ? 'Sauvegarde...' : 'Sauvegarder'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Informations Entreprise */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              🏢 Informations Entreprise
            </h2>
            <p className="text-gray-600 mb-4">
              Informations générales sur votre entreprise affichées sur le site
            </p>
            <div className="space-y-4">
              {configSections
                .filter(s => s.category === 'company')
                .map((section) => (
                  <div key={section.key} className="bg-white p-6 rounded-lg shadow">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {section.label}
                    </label>
                    <div className="flex gap-2">
                      {section.type === 'textarea' ? (
                        <textarea
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          rows={3}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        />
                      ) : (
                        <input
                          type={section.type || 'text'}
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                        />
                      )}
                      <button
                        onClick={() => saveContent(section.key)}
                        disabled={savingContent === section.key || editingContent[section.key] === content[section.key]}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {savingContent === section.key ? 'Sauvegarde...' : 'Sauvegarder'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Aide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-2">💡 Information</h3>
            <p className="text-blue-800">
              Les modifications de configuration sont sauvegardées dans la base de données. 
              Pour que certaines modifications (notamment les informations légales) soient affichées partout, 
              vous devrez peut-être mettre à jour les pages légales directement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
