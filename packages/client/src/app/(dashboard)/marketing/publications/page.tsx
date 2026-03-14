'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { Eye, Pencil, Trash2, Send, Loader2, ImagePlus, X } from 'lucide-react';

interface MarketingPost {
  id: string;
  plateforme: string;
  type: string;
  sujet: string;
  contenuTexte?: string | null;
  contenuVisuelUrl?: string | null;
  contenuVisuelUrls?: string[] | null;
  hashtags?: string | null;
  datePublication: string;
  status: string;
  postExternalId?: string | null;
  erreurDetail?: string | null;
  semaineCycle?: number | null;
  createdAt: string;
}

const PLATEFORME_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

const PLATEFORME_COLORS: Record<string, string> = {
  facebook: 'bg-blue-600',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  tiktok: 'bg-gray-900 border border-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  planifie: 'Planifié',
  publie: 'Publié',
  erreur: 'Erreur',
};

const STATUS_COLORS: Record<string, string> = {
  planifie: 'text-yellow-400 bg-yellow-900/30',
  publie: 'text-green-400 bg-green-900/30',
  erreur: 'text-red-400 bg-red-900/30',
};

const TYPE_LABELS: Record<string, string> = {
  module_presentation: 'Présentation',
  astuce: 'Astuce',
  temoignage: 'Témoignage',
  promo: 'Promo',
};

export default function PublicationsPage() {
  const [posts, setPosts] = useState<MarketingPost[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterPlateforme, setFilterPlateforme] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editPost, setEditPost] = useState<MarketingPost | null>(null);
  const [viewPost, setViewPost] = useState<MarketingPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const limit = 20;

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (filterPlateforme) params.plateforme = filterPlateforme;
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;

      const response = await apiClient.marketing.listPosts(params as Parameters<typeof apiClient.marketing.listPosts>[0]);
      if (response.success) {
        setPosts(response.data.posts);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Erreur chargement publications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterPlateforme, filterStatus, filterType]);

  const deletePost = async (id: string) => {
    try {
      await apiClient.marketing.deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setTotal(prev => prev - 1);
      setDeleteConfirm(null);
      showNotification('success', 'Publication supprimée');
    } catch (error) {
      console.error('Erreur suppression:', error);
      showNotification('error', 'Erreur lors de la suppression');
    }
  };

  const publishPost = async (id: string) => {
    setPublishing(id);
    try {
      // Trouver le post pour envoyer ses données au workflow n8n
      const post = posts.find(p => p.id === id);
      if (!post) {
        showNotification('error', 'Publication introuvable');
        return;
      }
      await apiClient.marketing.triggerPublish({
        postId: id,
        plateforme: post.plateforme,
        type: post.type,
        sujet: post.sujet,
        contenuTexte: post.contenuTexte || undefined,
        hashtags: post.hashtags || undefined,
      });
      showNotification('success', 'Publication déclenchée avec succès');
      loadPosts();
    } catch (error) {
      console.error('Erreur publication:', error);
      showNotification('error', 'Erreur lors de la publication');
    } finally {
      setPublishing(null);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between ${
          notification.type === 'success' ? 'bg-green-900/40 text-green-400 border border-green-700' : 'bg-red-900/40 text-red-400 border border-red-700'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-3 hover:opacity-70">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/marketing" className="hover:text-cyan-400">Marketing</Link>
            <span>/</span>
            <span className="text-white">Publications</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Publications</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors text-sm"
        >
          + Nouvelle publication
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterPlateforme}
          onChange={e => { setFilterPlateforme(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="">Toutes les plateformes</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="">Tous les statuts</option>
          <option value="planifie">Planifié</option>
          <option value="publie">Publié</option>
          <option value="erreur">Erreur</option>
        </select>
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="">Tous les types</option>
          <option value="module_presentation">Présentation</option>
          <option value="astuce">Astuce</option>
          <option value="temoignage">Témoignage</option>
          <option value="promo">Promo</option>
        </select>
        <span className="text-gray-400 text-sm self-center ml-auto">
          {total} publication{total > 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-700">
                <th className="px-5 py-3">Plateforme</th>
                <th className="px-5 py-3">Sujet</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3">Date publication</th>
                <th className="px-5 py-3">Semaine</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded text-xs text-white ${PLATEFORME_COLORS[post.plateforme] || 'bg-gray-600'}`}>
                      {PLATEFORME_LABELS[post.plateforme] || post.plateforme}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-white text-sm max-w-xs truncate">{post.sujet}</div>
                    {post.contenuTexte && (
                      <div className="text-gray-500 text-xs mt-1 max-w-xs truncate">{post.contenuTexte}</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-300 text-sm">{TYPE_LABELS[post.type] || post.type}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[post.status] || 'text-gray-400'}`}>
                      {STATUS_LABELS[post.status] || post.status}
                    </span>
                    {post.status === 'erreur' && post.erreurDetail && (
                      <div className="text-red-400 text-xs mt-1 max-w-[200px] truncate" title={post.erreurDetail}>
                        {post.erreurDetail}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-sm">{formatDate(post.datePublication)}</td>
                  <td className="px-5 py-3 text-gray-400 text-sm text-center">{post.semaineCycle ?? '-'}</td>
                  <td className="px-5 py-3 text-right">
                    {deleteConfirm === post.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => deletePost(post.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-medium"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-gray-400 hover:text-gray-300 text-xs"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setViewPost(post)}
                          className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-900/20 rounded transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditPost(post)}
                          className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-900/20 rounded transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {post.status === 'planifie' && (
                          <button
                            onClick={() => publishPost(post.id)}
                            disabled={publishing === post.id}
                            className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
                            title="Publier maintenant"
                          >
                            {publishing === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(post.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-500">
                    Aucune publication trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 text-sm"
          >
            ←
          </button>
          <span className="text-gray-400 text-sm">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 text-sm"
          >
            →
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(autoPublish) => {
            setShowCreateModal(false);
            if (autoPublish) {
              showNotification('success', 'Publication créée et envoi déclenché');
            }
            loadPosts();
          }}
        />
      )}

      {/* Edit Modal */}
      {editPost && (
        <EditPostModal
          post={editPost}
          onClose={() => setEditPost(null)}
          onUpdated={() => { setEditPost(null); loadPosts(); showNotification('success', 'Publication modifiée'); }}
        />
      )}

      {/* View Modal */}
      {viewPost && (
        <ViewPostModal post={viewPost} onClose={() => setViewPost(null)} />
      )}
    </div>
  );
}

// ── Modal création ─────────────────────────────────────────────

function CreatePostModal({ onClose, onCreated }: { onClose: () => void; onCreated: (autoPublish: boolean) => void }) {
  const [form, setForm] = useState({
    plateforme: 'facebook' as string,
    type: 'astuce' as string,
    sujet: '',
    contenuTexte: '',
    hashtags: '',
    datePublication: '',
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        setError('Format non supporté. Utilisez JPG, PNG, GIF ou WebP.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image trop volumineuse (max 10 Mo)');
        return;
      }
    }

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const preview = URL.createObjectURL(file);
      setImagePreviews(prev => [...prev, preview]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        const response = await fetch(`${API}/api/marketing/upload`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        const result = await response.json();
        if (result.success && result.data?.url) {
          setImageUrls(prev => [...prev, result.data.url]);
        } else {
          setError(result.message || 'Erreur lors de l\'upload');
          setImagePreviews(prev => prev.filter(p => p !== preview));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
        setImagePreviews(prev => prev.filter(p => p !== preview));
      }
    }

    setUploading(false);
    // Reset input pour permettre la re-sélection du même fichier
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!form.sujet.trim()) { setError('Entrez un sujet avant de générer'); return; }
    setGenerating(true);
    setError(null);
    try {
      const response = await apiClient.marketing.generateContent({
        plateforme: form.plateforme,
        type: form.type,
        sujet: form.sujet,
      });
      if (response.success && response.data) {
        setForm(f => ({
          ...f,
          contenuTexte: response.data.contenuTexte || f.contenuTexte,
          hashtags: response.data.hashtags || f.hashtags,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération IA');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sujet.trim()) { setError('Le sujet est obligatoire'); return; }
    setSaving(true);
    setError(null);
    const shouldAutoPublish = !form.datePublication;
    try {
      await apiClient.marketing.createPost({
        plateforme: form.plateforme,
        type: form.type,
        sujet: form.sujet,
        contenuTexte: form.contenuTexte || null,
        contenuVisuelUrl: imageUrls.length > 0 ? imageUrls[0] : null,
        contenuVisuelUrls: imageUrls.length > 0 ? imageUrls : null,
        hashtags: form.hashtags || null,
        datePublication: form.datePublication || undefined,
      });
      // Si pas de date → déclencher la publication automatique via n8n
      if (shouldAutoPublish) {
        try {
          await apiClient.marketing.triggerPublish({
            plateforme: form.plateforme,
            type: form.type,
            sujet: form.sujet,
            contenuTexte: form.contenuTexte || undefined,
            hashtags: form.hashtags || undefined,
          });
        } catch {
          // Silently fail — the post is created, publish will retry
        }
      }
      onCreated(shouldAutoPublish);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-white font-semibold">Nouvelle publication</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Plateforme</label>
              <select
                value={form.plateforme}
                onChange={e => setForm(f => ({ ...f, plateforme: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="module_presentation">Présentation</option>
                <option value="astuce">Astuce</option>
                <option value="temoignage">Témoignage</option>
                <option value="promo">Promo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Sujet *</label>
            <input
              type="text"
              value={form.sujet}
              onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
              placeholder="Titre de la publication"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !form.sujet.trim()}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Génération en cours...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Générer avec l&apos;IA
                </>
              )}
            </button>
            <p className="text-gray-500 text-xs mt-1 text-center">Remplissez le sujet ci-dessus puis cliquez pour générer le texte et les hashtags</p>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Contenu texte</label>
            <textarea
              value={form.contenuTexte}
              onChange={e => setForm(f => ({ ...f, contenuTexte: e.target.value }))}
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="Texte de la publication"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Hashtags</label>
            <input
              type="text"
              value={form.hashtags}
              onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
              placeholder="#marketing #saas #talosprimes"
            />
          </div>

          {/* Upload images (multi) */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Images / Visuels</label>
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={preview}
                      alt={`Aperçu ${idx + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-600"
                    />
                    {uploading && idx === imagePreviews.length - 1 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                    {!uploading && (
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-1 -right-1 p-0.5 bg-red-600 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-cyan-500 hover:bg-gray-700/30 transition-colors">
              <ImagePlus className="w-5 h-5 text-gray-500 mb-1" />
              <span className="text-gray-500 text-xs">{imagePreviews.length > 0 ? 'Ajouter d\'autres images' : 'Cliquez pour ajouter des images'}</span>
              <span className="text-gray-600 text-xs mt-0.5">JPG, PNG, GIF, WebP (max 10 Mo chacune)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Date de publication</label>
            <input
              type="datetime-local"
              value={form.datePublication}
              onChange={e => setForm(f => ({ ...f, datePublication: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-gray-500 text-xs mt-1">Laisser vide pour publier immédiatement</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className={`px-4 py-2 disabled:opacity-50 text-white rounded-lg text-sm ${
                form.datePublication ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-green-600 hover:bg-green-500'
              }`}
            >
              {saving ? 'Envoi...' : form.datePublication ? 'Planifier' : 'Créer & Publier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal édition ───────────────────────────────────────────────

function EditPostModal({ post, onClose, onUpdated }: { post: MarketingPost; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm] = useState({
    plateforme: post.plateforme,
    type: post.type,
    sujet: post.sujet,
    contenuTexte: post.contenuTexte || '',
    hashtags: post.hashtags || '',
    datePublication: post.datePublication ? new Date(post.datePublication).toISOString().slice(0, 16) : '',
    status: post.status,
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialUrls = post.contenuVisuelUrls ?? (post.contenuVisuelUrl ? [post.contenuVisuelUrl] : []);
  const [imageUrls, setImageUrls] = useState<string[]>(initialUrls);
  const [imagePreviews, setImagePreviews] = useState<string[]>(initialUrls);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        setError('Format non supporté. Utilisez JPG, PNG, GIF ou WebP.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image trop volumineuse (max 10 Mo)');
        return;
      }
    }

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const preview = URL.createObjectURL(file);
      setImagePreviews(prev => [...prev, preview]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API}/api/marketing/upload`, {
          method: 'POST',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
        });
        const result = await response.json();
        if (result.success && result.data?.url) {
          setImageUrls(prev => [...prev, result.data.url]);
        } else {
          setError(result.message || 'Erreur lors de l\'upload');
          setImagePreviews(prev => prev.filter(p => p !== preview));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
        setImagePreviews(prev => prev.filter(p => p !== preview));
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!form.sujet.trim()) { setError('Entrez un sujet avant de générer'); return; }
    setGenerating(true);
    setError(null);
    try {
      const response = await apiClient.marketing.generateContent({
        plateforme: form.plateforme,
        type: form.type,
        sujet: form.sujet,
      });
      if (response.success && response.data) {
        setForm(f => ({
          ...f,
          contenuTexte: response.data.contenuTexte || f.contenuTexte,
          hashtags: response.data.hashtags || f.hashtags,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération IA');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sujet.trim()) { setError('Le sujet est obligatoire'); return; }
    setSaving(true);
    setError(null);
    try {
      await apiClient.marketing.updatePost(post.id, {
        plateforme: form.plateforme,
        type: form.type,
        sujet: form.sujet,
        contenuTexte: form.contenuTexte || null,
        contenuVisuelUrl: imageUrls.length > 0 ? imageUrls[0] : null,
        contenuVisuelUrls: imageUrls.length > 0 ? imageUrls : null,
        hashtags: form.hashtags || null,
        datePublication: form.datePublication || undefined,
        status: form.status,
      });
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800 z-10">
          <h2 className="text-white font-semibold">Modifier la publication</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Plateforme</label>
              <select value={form.plateforme} onChange={e => setForm(f => ({ ...f, plateforme: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
                <option value="module_presentation">Présentation</option>
                <option value="astuce">Astuce</option>
                <option value="temoignage">Témoignage</option>
                <option value="promo">Promo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Statut</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
              <option value="planifie">Planifié</option>
              <option value="publie">Publié</option>
              <option value="erreur">Erreur</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Sujet *</label>
            <input type="text" value={form.sujet} onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <button type="button" onClick={handleGenerate} disabled={generating || !form.sujet.trim()} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2">
              {generating ? (
                <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> Régénération...</>
              ) : (
                <><span>✨</span> Régénérer avec l&apos;IA</>
              )}
            </button>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Contenu texte</label>
            <textarea value={form.contenuTexte} onChange={e => setForm(f => ({ ...f, contenuTexte: e.target.value }))} rows={4} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Hashtags</label>
            <input type="text" value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Image upload (multi) */}
          <div>
            <label className="block text-gray-400 text-sm mb-1">Images / Visuels</label>
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative group">
                    <img src={preview} alt={`Aperçu ${idx + 1}`} className="w-24 h-24 object-cover rounded-lg border border-gray-600" />
                    {uploading && idx === imagePreviews.length - 1 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                    {!uploading && (
                      <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 p-0.5 bg-red-600 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <label className="flex flex-col items-center justify-center w-full h-20 bg-gray-700/50 border-2 border-dashed border-gray-600 hover:border-cyan-500 rounded-lg cursor-pointer transition-colors">
              <ImagePlus size={20} className="text-gray-400 mb-1" />
              <span className="text-gray-400 text-xs">{imagePreviews.length > 0 ? 'Ajouter d\'autres images' : 'Cliquez pour ajouter des images'}</span>
              <span className="text-gray-500 text-xs">JPG, PNG, GIF, WebP — max 10 Mo chacune</span>
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={handleImageUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Date de publication</label>
            <input type="datetime-local" value={form.datePublication} onChange={e => setForm(f => ({ ...f, datePublication: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Annuler</button>
            <button type="submit" disabled={saving || uploading} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded-lg text-sm">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal détails ───────────────────────────────────────────────

function ViewPostModal({ post, onClose }: { post: MarketingPost; onClose: () => void }) {
  const formatDateFull = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800 z-10">
          <h2 className="text-white font-semibold">Détails de la publication</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs text-white ${PLATEFORME_COLORS[post.plateforme] || 'bg-gray-600'}`}>
              {PLATEFORME_LABELS[post.plateforme] || post.plateforme}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[post.status] || 'text-gray-400'}`}>
              {STATUS_LABELS[post.status] || post.status}
            </span>
            <span className="text-gray-400 text-xs">{TYPE_LABELS[post.type] || post.type}</span>
          </div>

          <div>
            <label className="block text-gray-500 text-xs mb-1">Sujet</label>
            <p className="text-white text-sm">{post.sujet}</p>
          </div>

          {post.contenuTexte && (
            <div>
              <label className="block text-gray-500 text-xs mb-1">Contenu</label>
              <p className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-700/50 rounded-lg p-3">{post.contenuTexte}</p>
            </div>
          )}

          {post.hashtags && (
            <div>
              <label className="block text-gray-500 text-xs mb-1">Hashtags</label>
              <p className="text-cyan-400 text-sm">{post.hashtags}</p>
            </div>
          )}

          {(post.contenuVisuelUrls && post.contenuVisuelUrls.length > 0 ? post.contenuVisuelUrls : post.contenuVisuelUrl ? [post.contenuVisuelUrl] : []).length > 0 && (
            <div>
              <label className="block text-gray-500 text-xs mb-1">Images</label>
              <div className="flex flex-wrap gap-2">
                {(post.contenuVisuelUrls && post.contenuVisuelUrls.length > 0 ? post.contenuVisuelUrls : post.contenuVisuelUrl ? [post.contenuVisuelUrl] : []).map((url, idx) => (
                  <img key={idx} src={url} alt={`Visuel ${idx + 1}`} className="max-h-48 rounded-lg border border-gray-600" />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-gray-500 text-xs mb-1">Date publication</label>
              <p className="text-gray-300">{formatDateFull(post.datePublication)}</p>
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1">Créé le</label>
              <p className="text-gray-300">{formatDateFull(post.createdAt)}</p>
            </div>
          </div>

          {post.semaineCycle != null && (
            <div>
              <label className="block text-gray-500 text-xs mb-1">Semaine cycle</label>
              <p className="text-gray-300 text-sm">Semaine {post.semaineCycle}</p>
            </div>
          )}

          {post.postExternalId && (
            <div>
              <label className="block text-gray-500 text-xs mb-1">ID externe</label>
              <p className="text-gray-400 text-xs font-mono">{post.postExternalId}</p>
            </div>
          )}

          {post.status === 'erreur' && post.erreurDetail && (
            <div>
              <label className="block text-red-400 text-xs mb-1">Détail erreur</label>
              <p className="text-red-300 text-sm bg-red-900/20 rounded-lg p-3">{post.erreurDetail}</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
