'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/auth';
import { Save, Trash2, Plus, Star, Eye, EyeOff, Mail, CheckCircle, FileText, CreditCard, Pencil, Globe, GripVertical } from 'lucide-react';

import { apiClient, type CmsPageData, type PlanWithModules } from '@/lib/api-client';
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

type TabType = 'content' | 'testimonials' | 'messages' | 'config' | 'legal' | 'tarifs' | 'pages';

interface ConfigSection {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'email' | 'tel' | 'textarea';
  category: 'contact' | 'legal' | 'company' | 'hosting' | 'insurance';
}

interface LegalPage {
  id: string;
  title: string;
  description: string;
  contentKey: string;
  route: string;
}

export default function CMSPage() {
  const [activeTab, setActiveTab] = useState<TabType>('content');

  // Content
  const [content, setContent] = useState<Record<string, string>>({});
  const [editingContent, setEditingContent] = useState<Record<string, string>>({});
  const [savingContent, setSavingContent] = useState<string | null>(null);
  
  // Legal Pages
  const [generatingLegal, setGeneratingLegal] = useState<string | null>(null);
  
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

  // Tarifs (plans publics)
  const [tarifsPlans, setTarifsPlans] = useState<PlanWithModules[]>([]);

  // CMS Pages
  const [cmsPages, setCmsPages] = useState<CmsPageData[]>([]);
  const [showPageForm, setShowPageForm] = useState(false);
  const [editingPage, setEditingPage] = useState<CmsPageData | null>(null);
  const [pageForm, setPageForm] = useState({
    slug: '',
    titre: '',
    contenu: '',
    metaTitle: '',
    metaDesc: '',
    publie: false,
    ordre: 0,
  });
  const [savingPage, setSavingPage] = useState(false);

  // Charger les données
  useEffect(() => {
    loadContent();
    loadTestimonials();
    loadMessages();
    loadTarifs();
    loadCmsPages();
  }, []);

  const loadContent = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  const loadTarifs = async () => {
    try {
      const res = await apiClient.landingTarifs();
      if (res.success) setTarifsPlans(res.data.plans);
    } catch (error) {
      console.error('Erreur chargement tarifs:', error);
    }
  };

  const loadCmsPages = async () => {
    try {
      const res = await apiClient.cmsPages.listAll();
      if (res.success) setCmsPages(res.data.pages);
    } catch (error) {
      console.error('Erreur chargement pages CMS:', error);
    }
  };

  const resetPageForm = () => {
    setPageForm({ slug: '', titre: '', contenu: '', metaTitle: '', metaDesc: '', publie: false, ordre: 0 });
    setEditingPage(null);
    setShowPageForm(false);
  };

  const openEditPage = (page: CmsPageData) => {
    setEditingPage(page);
    setPageForm({
      slug: page.slug,
      titre: page.titre,
      contenu: page.contenu,
      metaTitle: page.metaTitle ?? '',
      metaDesc: page.metaDesc ?? '',
      publie: page.publie,
      ordre: page.ordre,
    });
    setShowPageForm(true);
  };

  const handleSavePage = async () => {

    if (!pageForm.slug || !pageForm.titre) { alert('Slug et titre requis'); return; }
    setSavingPage(true);
    try {
      if (editingPage) {
        await apiClient.cmsPages.update(editingPage.id, pageForm);
      } else {
        await apiClient.cmsPages.create(pageForm);
      }
      await loadCmsPages();
      resetPageForm();
      alert(editingPage ? 'Page modifiée !' : 'Page créée !');
    } catch (error) {
      console.error('Erreur sauvegarde page:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSavingPage(false);
    }
  };

  const handleDeletePage = async (id: string) => {

    if (!confirm('Supprimer cette page ?')) return;
    try {
      await apiClient.cmsPages.delete(id);
      await loadCmsPages();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const handleTogglePublish = async (page: CmsPageData) => {

    try {
      await apiClient.cmsPages.update(page.id, { publie: !page.publie });
      await loadCmsPages();
    } catch (error) {
      console.error('Erreur publication:', error);
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

  // Générer contenu légal avec IA
  const generateLegalContent = async (pageId: string) => {
    if (!confirm('Générer le contenu avec IA ? Cela remplacera le contenu actuel.')) return;
    
    setGeneratingLegal(pageId);
    
    console.log('🤖 Démarrage génération IA pour:', pageId);
    
    try {
      const token = getAccessToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/landing/generate-legal/${pageId}`;
      
      console.log('📡 URL appelée:', url);
      console.log('📦 Données envoyées:', {
        companyName: editingContent.config_legal_company_name,
        siret: editingContent.config_legal_siret,
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: editingContent.config_legal_company_name || 'TalosPrimes SAS',
          siret: editingContent.config_legal_siret || '',
          tva: editingContent.config_legal_tva || '',
          address: editingContent.config_legal_address || '',
          email: editingContent.config_contact_email || 'contact@talosprimes.com',
          phone: editingContent.config_contact_phone || '',
          hostingProvider: editingContent.config_hosting_provider || 'OVH',
          hostingAddress: editingContent.config_hosting_address || '',
          insuranceCompany: editingContent.config_insurance_company || '',
          insurancePolicyNumber: editingContent.config_insurance_policy_number || '',
          insuranceCoverage: editingContent.config_insurance_coverage || '',
        }),
      });

      console.log('📡 Réponse status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Contenu reçu:', data);
        
        const page = legalPages.find(p => p.id === pageId);
        if (page) {
          setEditingContent({ ...editingContent, [page.contentKey]: data.content });
          alert('✅ Contenu généré avec succès ! Cliquez sur Sauvegarder pour appliquer.');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('❌ Erreur serveur:', errorData);
        alert(`❌ Erreur: ${errorData.error || 'Erreur lors de la génération'}`);
      }
    } catch (error) {
      console.error('❌ Erreur catch:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`❌ Erreur: ${errorMessage}`);
    } finally {
      setGeneratingLegal(null);
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

  const legalPages: LegalPage[] = [
    {
      id: 'mentions-legales',
      title: 'Mentions Légales',
      description: 'Informations légales obligatoires (SIRET, TVA, hébergeur, etc.)',
      contentKey: 'legal_mentions_legales',
      route: '/mentions-legales',
    },
    {
      id: 'cgu',
      title: 'Conditions Générales d\'Utilisation (CGU)',
      description: 'Règles d\'utilisation de la plateforme',
      contentKey: 'legal_cgu',
      route: '/cgu',
    },
    {
      id: 'cgv',
      title: 'Conditions Générales de Vente (CGV)',
      description: 'Conditions commerciales et de vente',
      contentKey: 'legal_cgv',
      route: '/cgv',
    },
    {
      id: 'confidentialite',
      title: 'Politique de Confidentialité & RGPD',
      description: 'Protection des données personnelles et conformité RGPD',
      contentKey: 'legal_confidentialite',
      route: '/confidentialite',
    },
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
    
    // HÉBERGEMENT
    { key: 'config_hosting_provider', label: 'Nom de l\'hébergeur', placeholder: 'OVH', type: 'text', category: 'hosting' },
    { key: 'config_hosting_company_name', label: 'Raison sociale hébergeur', placeholder: 'OVH SAS', type: 'text', category: 'hosting' },
    { key: 'config_hosting_address', label: 'Adresse hébergeur', placeholder: '2 rue Kellermann, 59100 Roubaix, France', type: 'textarea', category: 'hosting' },
    { key: 'config_hosting_phone', label: 'Téléphone hébergeur', placeholder: '1007', type: 'tel', category: 'hosting' },
    { key: 'config_hosting_website', label: 'Site web hébergeur', placeholder: 'https://www.ovh.com', type: 'text', category: 'hosting' },
    
    // ASSURANCE RC PROFESSIONNELLE
    { key: 'config_insurance_company', label: 'Nom de l\'assureur', placeholder: 'AXA Assurances', type: 'text', category: 'insurance' },
    { key: 'config_insurance_policy_number', label: 'Numéro de police', placeholder: '123456789', type: 'text', category: 'insurance' },
    { key: 'config_insurance_coverage', label: 'Montant de garantie', placeholder: '1 000 000 €', type: 'text', category: 'insurance' },
    { key: 'config_insurance_address', label: 'Adresse assureur', placeholder: '1 Avenue de France, 75013 Paris', type: 'textarea', category: 'insurance' },
    { key: 'config_insurance_phone', label: 'Téléphone assureur', placeholder: '01 XX XX XX XX', type: 'tel', category: 'insurance' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Gestion de la Landing Page</h1>
        <p className="mt-2 text-sm text-gray-400">Modifiez le contenu, les témoignages et consultez les messages de contact</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700/30">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'content'
              ? 'border-b-2 border-indigo-500 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Contenu
        </button>
        <button
          onClick={() => setActiveTab('testimonials')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'testimonials'
              ? 'border-b-2 border-indigo-500 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Témoignages ({testimonials.length})
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-6 py-3 font-semibold transition relative ${
            activeTab === 'messages'
              ? 'border-b-2 border-indigo-500 text-white'
              : 'text-gray-400 hover:text-gray-300'
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
              ? 'border-b-2 border-indigo-500 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          ⚙️ Configuration
        </button>
        <button
          onClick={() => setActiveTab('legal')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'legal'
              ? 'border-b-2 border-indigo-500 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          ⚖️ Pages Légales
        </button>
        <button
          onClick={() => setActiveTab('tarifs')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'tarifs'
              ? 'border-b-2 border-indigo-500 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <CreditCard className="w-4 h-4 inline mr-1" />
          Tarifs ({tarifsPlans.length})
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'pages'
              ? 'border-b-2 border-indigo-500 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-1" />
          Pages ({cmsPages.length})
        </button>
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-4">
          {contentSections.map((section) => {
            const actifKey = `${section.key}_actif`;
            const lienKey = `${section.key}_lien`;
            const isActive = (editingContent[actifKey] ?? 'true') === 'true';
            return (
              <div key={section.key} className="bg-gray-800/20 backdrop-blur-md p-6 rounded-lg shadow-lg border border-gray-700/30">
                <label className="block text-sm font-semibold text-gray-300 mb-2">{section.label}</label>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {section.label.includes('Description') ? (
                    <textarea
                      value={editingContent[section.key] || ''}
                      onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                      rows={3}
                      className="flex-1 min-w-[200px] px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                    />
                  ) : (
                    <input
                      type="text"
                      value={editingContent[section.key] || ''}
                      onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                      className="flex-1 min-w-[200px] px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                    />
                  )}
                  <button
                    onClick={() => saveContent(section.key)}
                    disabled={savingContent === section.key || editingContent[section.key] === content[section.key]}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {savingContent === section.key ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-700/50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={async (e) => {
                        const value = e.target.checked ? 'true' : 'false';
                        setEditingContent((prev) => ({ ...prev, [actifKey]: value }));
                        setContent((prev) => ({ ...prev, [actifKey]: value }));
                        try {
                          const token = getAccessToken();
                          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content/${actifKey}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ contenu: value }),
                          });
                        } catch (err) {
                          console.error(err);
                          alert('Erreur lors de la sauvegarde');
                        }
                      }}
                      className="w-5 h-5 rounded border-gray-600 bg-gray-700/50 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-800"
                    />
                    <span className="text-sm text-gray-400">Afficher</span>
                  </label>
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-sm text-gray-400 whitespace-nowrap">Lien (URL)</span>
                    <input
                      type="text"
                      value={editingContent[lienKey] || ''}
                      onChange={(e) => setEditingContent({ ...editingContent, [lienKey]: e.target.value })}
                      placeholder="/page ou https://..."
                      className="flex-1 px-3 py-1.5 bg-gray-700/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500"
                    />
                    <button
                      onClick={async () => {
                        setSavingContent(lienKey);
                        try {
                          const token = getAccessToken();
                          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/landing/content/${lienKey}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ contenu: editingContent[lienKey] || '' }),
                          });
                          setContent({ ...content, [lienKey]: editingContent[lienKey] || '' });
                          alert('Lien sauvegardé');
                        } catch (err) {
                          console.error(err);
                          alert('Erreur');
                        } finally {
                          setSavingContent(null);
                        }
                      }}
                      disabled={savingContent === lienKey}
                      className="px-4 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-500 transition disabled:opacity-50"
                    >
                      Sauvegarder le lien
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* Testimonials Tab */}
      {activeTab === 'testimonials' && (
        <div>
          <div className="mb-4">
            <button
              onClick={() => setShowTestimonialForm(!showTestimonialForm)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nouveau témoignage
            </button>
          </div>

          {/* Form nouveau testimonial */}
          {showTestimonialForm && (
            <div className="bg-gray-800/20 backdrop-blur-md p-6 rounded-lg shadow-lg border border-gray-700/30 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Nouveau témoignage</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Prénom *"
                  value={newTestimonial.prenom}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, prenom: e.target.value })}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Nom *"
                  value={newTestimonial.nom}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, nom: e.target.value })}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Entreprise"
                  value={newTestimonial.entreprise}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, entreprise: e.target.value })}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Poste"
                  value={newTestimonial.poste}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, poste: e.target.value })}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Avatar (ex: AB)"
                  value={newTestimonial.avatar}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, avatar: e.target.value })}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Note /5</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newTestimonial.note}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, note: parseInt(e.target.value) })}
                    className="px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <textarea
                    placeholder="Commentaire *"
                    value={newTestimonial.commentaire}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, commentaire: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newTestimonial.affiche}
                    onChange={(e) => setNewTestimonial({ ...newTestimonial, affiche: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700/50 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-800"
                  />
                  <label className="text-gray-300">Afficher sur la landing page</label>
                </div>
                <input
                  type="number"
                  placeholder="Ordre d'affichage"
                  value={newTestimonial.ordre}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, ordre: parseInt(e.target.value) })}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={createTestimonial}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Créer
                </button>
                <button
                  onClick={() => setShowTestimonialForm(false)}
                  className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste testimonials */}
          <div className="grid gap-4">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-gray-800/20 backdrop-blur-md p-6 rounded-lg shadow-lg border border-gray-700/30">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {testimonial.avatar || `${testimonial.prenom[0]}${testimonial.nom[0]}`}
                      </div>
                      <div>
                        <div className="font-bold text-white">{testimonial.prenom} {testimonial.nom}</div>
                        <div className="text-sm text-gray-400">
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
                    <p className="text-gray-300 italic">"{testimonial.commentaire}"</p>
                    <div className="text-sm text-gray-400 mt-2">Ordre: {testimonial.ordre}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateTestimonial(testimonial.id, { affiche: !testimonial.affiche })}
                      className="p-2 text-blue-400 hover:bg-gray-700/50 rounded transition"
                      title={testimonial.affiche ? 'Masquer' : 'Afficher'}
                    >
                      {testimonial.affiche ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => deleteTestimonial(testimonial.id)}
                      className="p-2 text-red-400 hover:bg-gray-700/50 rounded transition"
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
            <div className="bg-gray-800/20 backdrop-blur-md p-12 rounded-lg shadow-lg border border-gray-700/30 text-center text-gray-400">
              Aucun message de contact
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`bg-gray-800/20 backdrop-blur-md p-6 rounded-lg shadow-lg border ${message.traite ? 'opacity-60 border-gray-700/30' : 'border-l-4 border-indigo-500 border-t border-r border-b border-gray-700/30'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-lg text-white">
                      {message.prenom} {message.nom}
                      {message.traite && <span className="ml-2 text-sm text-green-400">(Traité)</span>}
                    </div>
                    <div className="text-gray-300">
                      <Mail className="inline w-4 h-4 mr-1" />
                      {message.email}
                    </div>
                    {message.telephone && (
                      <div className="text-gray-400 text-sm">Tél: {message.telephone}</div>
                    )}
                    {message.entreprise && (
                      <div className="text-gray-400 text-sm">Entreprise: {message.entreprise}</div>
                    )}
                    <div className="text-sm text-gray-500 mt-1">
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
                        className="p-2 text-green-400 hover:bg-gray-700/50 rounded transition"
                        title="Marquer comme traité"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className="p-2 text-red-400 hover:bg-gray-700/50 rounded transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600/30">
                  <p className="text-gray-300 whitespace-pre-wrap">{message.message}</p>
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
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              📞 Coordonnées de Contact
            </h2>
            <p className="text-gray-400 mb-4">
              Ces informations seront affichées sur la landing page dans la section Contact
            </p>
            <div className="space-y-4">
              {configSections
                .filter(s => s.category === 'contact')
                .map((section) => (
                  <div key={section.key} className="bg-gray-800/20 backdrop-blur-md p-6 rounded-lg shadow-lg border border-gray-700/30">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      {section.label}
                    </label>
                    <div className="flex gap-2">
                      {section.type === 'textarea' ? (
                        <textarea
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          rows={3}
                          className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      ) : (
                        <input
                          type={section.type || 'text'}
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      )}
                      <button
                        onClick={() => saveContent(section.key)}
                        disabled={savingContent === section.key || editingContent[section.key] === content[section.key]}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              ⚖️ Informations Légales
            </h2>
            <p className="text-gray-400 mb-4">
              Ces informations seront utilisées dans les mentions légales, CGU, CGV et politique de confidentialité.
              <br />
              <span className="text-orange-400 font-semibold">⚠️ Important : Remplacez les valeurs fictives par vos vraies informations !</span>
            </p>
            <div className="space-y-4">
              {configSections
                .filter(s => s.category === 'legal')
                .map((section) => (
                  <div key={section.key} className="bg-gray-800/20 backdrop-blur-md p-6 rounded-lg shadow-lg border border-gray-700/30">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      {section.label}
                    </label>
                    <div className="flex gap-2">
                      {section.type === 'textarea' ? (
                        <textarea
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          rows={3}
                          className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      ) : (
                        <input
                          type={section.type || 'text'}
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      )}
                      <button
                        onClick={() => saveContent(section.key)}
                        disabled={savingContent === section.key || editingContent[section.key] === content[section.key]}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              🏢 Informations Entreprise
            </h2>
            <p className="text-gray-400 mb-4">
              Informations générales sur votre entreprise affichées sur le site
            </p>
            <div className="space-y-4">
              {configSections
                .filter(s => s.category === 'company')
                .map((section) => (
                  <div key={section.key} className="bg-gray-800/20 backdrop-blur-md p-6 rounded-lg shadow-lg border border-gray-700/30">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      {section.label}
                    </label>
                    <div className="flex gap-2">
                      {section.type === 'textarea' ? (
                        <textarea
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          rows={3}
                          className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      ) : (
                        <input
                          type={section.type || 'text'}
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      )}
                      <button
                        onClick={() => saveContent(section.key)}
                        disabled={savingContent === section.key || editingContent[section.key] === content[section.key]}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {savingContent === section.key ? 'Sauvegarde...' : 'Sauvegarder'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Hébergement */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              🖥️ Informations Hébergement
            </h2>
            <p className="text-gray-400 mb-4">
              Informations sur votre société d'hébergement (obligatoire pour les mentions légales)
            </p>
            <div className="space-y-4">
              {configSections
                .filter(s => s.category === 'hosting')
                .map((section) => (
                  <div key={section.key} className="bg-gray-800/20 backdrop-blur-md p-6 rounded-lg shadow-lg border border-gray-700/30">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      {section.label}
                    </label>
                    <div className="flex gap-2">
                      {section.type === 'textarea' ? (
                        <textarea
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          rows={3}
                          className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      ) : (
                        <input
                          type={section.type || 'text'}
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      )}
                      <button
                        onClick={() => saveContent(section.key)}
                        disabled={savingContent === section.key || editingContent[section.key] === content[section.key]}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {savingContent === section.key ? 'Sauvegarde...' : 'Sauvegarder'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Assurance RC Professionnelle */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              🛡️ Assurance RC Professionnelle
            </h2>
            <p className="text-gray-400 mb-4">
              Informations sur votre assurance Responsabilité Civile Professionnelle (recommandé pour les mentions légales)
            </p>
            <div className="space-y-4">
              {configSections
                .filter(s => s.category === 'insurance')
                .map((section) => (
                  <div key={section.key} className="bg-gray-800/20 backdrop-blur-md p-6 rounded-lg shadow-lg border border-gray-700/30">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      {section.label}
                    </label>
                    <div className="flex gap-2">
                      {section.type === 'textarea' ? (
                        <textarea
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          rows={3}
                          className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      ) : (
                        <input
                          type={section.type || 'text'}
                          value={editingContent[section.key] || ''}
                          onChange={(e) => setEditingContent({ ...editingContent, [section.key]: e.target.value })}
                          placeholder={section.placeholder}
                          className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      )}
                      <button
                        onClick={() => saveContent(section.key)}
                        disabled={savingContent === section.key || editingContent[section.key] === content[section.key]}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
            <h3 className="font-bold text-blue-300 mb-2">💡 Information</h3>
            <p className="text-blue-200">
              Les modifications de configuration sont sauvegardées dans la base de données. 
              Ces informations seront utilisées lors de la génération IA des pages légales pour créer un contenu 100% personnalisé et conforme.
            </p>
          </div>
        </div>
      )}

      {/* Legal Pages Tab */}
      {activeTab === 'legal' && (
        <div className="space-y-6">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
            <h3 className="font-bold text-blue-300 mb-2">🤖 Génération Automatique par IA</h3>
            <p className="text-blue-200 text-sm">
              Utilisez l'IA pour générer automatiquement le contenu de vos pages légales en fonction de vos informations de configuration.
              <br />
              <span className="font-semibold">⚠️ Important : Remplissez d'abord vos informations dans l'onglet Configuration avant de générer !</span>
            </p>
          </div>

          {legalPages.map((page) => (
            <div key={page.id} className="bg-gray-800/20 backdrop-blur-md rounded-lg shadow-lg border border-gray-700/30 overflow-hidden">
              <div className="bg-gray-700/30 px-6 py-4 border-b border-gray-600/30">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">{page.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{page.description}</p>
                    <a
                      href={page.route}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
                    >
                      Voir la page →
                    </a>
                  </div>
                  <button
                    onClick={() => generateLegalContent(page.id)}
                    disabled={generatingLegal === page.id}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {generatingLegal === page.id ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Génération...
                      </>
                    ) : (
                      <>
                        🤖 Générer avec IA
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="p-6">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Contenu de la page
                </label>
                <div className="space-y-2">
                  <textarea
                    value={editingContent[page.contentKey] || ''}
                    onChange={(e) => setEditingContent({ ...editingContent, [page.contentKey]: e.target.value })}
                    placeholder={`Contenu de ${page.title}...`}
                    rows={15}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 text-white rounded-lg placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => saveContent(page.contentKey)}
                      disabled={savingContent === page.contentKey || editingContent[page.contentKey] === content[page.contentKey]}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {savingContent === page.contentKey ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Aide */}
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
            <h3 className="font-bold text-yellow-300 mb-2">💡 Conseils</h3>
            <ul className="text-yellow-200 text-sm space-y-2">
              <li>• Remplissez d&apos;abord toutes vos informations dans l&apos;onglet <strong>Configuration</strong></li>
              <li>• Utilisez la génération IA pour créer un contenu personnalisé automatiquement</li>
              <li>• Vous pouvez ensuite modifier manuellement le contenu généré</li>
              <li>• N&apos;oubliez pas de sauvegarder après modification</li>
              <li>• Les pages légales sont accessibles directement depuis le footer de la landing page</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tarifs Tab */}
      {activeTab === 'tarifs' && (
        <div className="space-y-6">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              💡 Cette section affiche un aperçu de ce que vos visiteurs verront sur la page tarifs.
              Pour modifier les plans, rendez-vous dans <strong>Administration → Plans &amp; Modules</strong>.
            </p>
          </div>

          <div className="bg-gray-800/20 backdrop-blur-md p-6 rounded-lg border border-gray-700/30">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              Aperçu des tarifs (landing page)
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Ces tarifs sont automatiquement synchronisés depuis vos Plans &amp; Modules.
              Modifiez-les dans la section <strong>Plans</strong> du menu Administration.
            </p>
            <button
              onClick={loadTarifs}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition mb-4"
            >
              Rafraîchir
            </button>
          </div>

          {tarifsPlans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Aucun plan actif. Créez des plans dans Administration → Plans &amp; Modules.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tarifsPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-6 relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: plan.couleur ?? '#6366f1' }}
                  />
                  <h3 className="text-lg font-bold text-white mt-2">{plan.nom}</h3>
                  {plan.description && (
                    <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
                  )}
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-white">
                      {Number(plan.prixMensuel).toFixed(0)}€
                    </span>
                    <span className="text-gray-400 text-sm">/mois</span>
                    {plan.prixAnnuel && (
                      <div className="text-xs text-gray-500 mt-1">
                        ou {Number(plan.prixAnnuel).toFixed(0)}€/an
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-indigo-400">
                    {plan.essaiJours} jours d&apos;essai gratuit
                  </div>
                  <div className="mt-4 border-t border-gray-700/30 pt-4">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Modules inclus ({plan.planModules.length})
                    </h4>
                    <ul className="space-y-1.5">
                      {plan.planModules.map((pm) => (
                        <li key={pm.id} className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          {pm.module.nomAffiche}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Pages Tab */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Pages dynamiques
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Créez des pages personnalisées accessibles sur votre site (ex: À propos, FAQ, etc.)
              </p>
            </div>
            <button
              onClick={() => { resetPageForm(); setShowPageForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Nouvelle page
            </button>
          </div>

          {/* Formulaire création/édition */}
          {showPageForm && (
            <div className="bg-gray-800/40 border border-gray-700/30 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">
                {editingPage ? `Modifier : ${editingPage.titre}` : 'Créer une nouvelle page'}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Titre <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={pageForm.titre}
                    onChange={(e) => {
                      const titre = e.target.value;
                      setPageForm((prev) => ({
                        ...prev,
                        titre,
                        slug: prev.slug || titre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                      }));
                    }}
                    placeholder="Ma page"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Slug (URL) <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">/page/</span>
                    <input
                      type="text"
                      value={pageForm.slug}
                      onChange={(e) => setPageForm((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="ma-page"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contenu (Markdown/HTML)</label>
                <textarea
                  value={pageForm.contenu}
                  onChange={(e) => setPageForm((prev) => ({ ...prev, contenu: e.target.value }))}
                  rows={10}
                  placeholder="# Mon titre&#10;&#10;Le contenu de la page en Markdown ou HTML..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono text-sm resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Meta Title (SEO)</label>
                  <input
                    type="text"
                    value={pageForm.metaTitle}
                    onChange={(e) => setPageForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
                    placeholder="Titre pour le référencement"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Meta Description (SEO)</label>
                  <input
                    type="text"
                    value={pageForm.metaDesc}
                    onChange={(e) => setPageForm((prev) => ({ ...prev, metaDesc: e.target.value }))}
                    placeholder="Description pour le référencement"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageForm.publie}
                    onChange={(e) => setPageForm((prev) => ({ ...prev, publie: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-300">Publier immédiatement</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-400">Ordre :</label>
                  <input
                    type="number"
                    value={pageForm.ordre}
                    onChange={(e) => setPageForm((prev) => ({ ...prev, ordre: parseInt(e.target.value) || 0 }))}
                    className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={resetPageForm}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSavePage}
                  disabled={savingPage || !pageForm.slug || !pageForm.titre}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {savingPage ? 'Sauvegarde...' : (editingPage ? 'Enregistrer' : 'Créer la page')}
                </button>
              </div>
            </div>
          )}

          {/* Liste des pages */}
          {cmsPages.length === 0 && !showPageForm ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Aucune page créée. Cliquez sur &quot;Nouvelle page&quot; pour commencer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cmsPages.map((page) => (
                <div
                  key={page.id}
                  className="bg-gray-800/40 border border-gray-700/30 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <GripVertical className="w-4 h-4 text-gray-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">{page.titre}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          page.publie
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {page.publie ? 'Publié' : 'Brouillon'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 font-mono">/page/{page.slug}</span>
                        {page.metaTitle && (
                          <span className="text-xs text-gray-600">SEO: {page.metaTitle}</span>
                        )}
                        <span className="text-xs text-gray-600">
                          Modifié le {new Date(page.updatedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePublish(page)}
                      className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition"
                      title={page.publie ? 'Dépublier' : 'Publier'}
                    >
                      {page.publie ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEditPage(page)}
                      className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-indigo-400 transition"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {page.publie && (
                      <a
                        href={`/page/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition"
                        title="Voir la page"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeletePage(page.id)}
                      className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
