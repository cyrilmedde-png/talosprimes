'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import {
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface Partner {
  id: string;
  nom: string;
  type: string;
  statut: string;
  siret: string;
  siren: string;
  clientsCount: number;
  commissionsCount: number;
  email?: string;
  phone?: string;
  address?: string;
}

interface CreatePartnerInput {
  nom: string;
  type: string;
  siret: string;
  siren: string;
  email: string;
}

export default function PartenairesListePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [formData, setFormData] = useState<CreatePartnerInput>({
    nom: '',
    type: '',
    siret: '',
    siren: '',
    email: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadPartners();
  }, [user, router]);

  useEffect(() => {
    applyFilters();
  }, [partners, filterStatus, filterType]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.partners.list();
      setPartners(response.data?.partners || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des partenaires';
      setError(errorMessage);
      console.error('Error loading partners:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = partners;

    if (filterStatus) {
      filtered = filtered.filter((p) => p.statut === filterStatus);
    }

    if (filterType) {
      filtered = filtered.filter((p) => p.type === filterType);
    }

    setFilteredPartners(filtered);
  };

  const validateSIRET = (siret: string): boolean => {
    return /^\d{14}$/.test(siret.replace(/\s/g, ''));
  };

  const validateSIREN = (siren: string): boolean => {
    return /^\d{9}$/.test(siren.replace(/\s/g, ''));
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!formData.nom.trim()) {
      setFormError('Le nom est requis');
      return;
    }

    if (!formData.type) {
      setFormError('Le type est requis');
      return;
    }

    if (!validateSIRET(formData.siret)) {
      setFormError('Le SIRET doit contenir 14 chiffres');
      return;
    }

    if (!validateSIREN(formData.siren)) {
      setFormError('Le SIREN doit contenir 9 chiffres');
      return;
    }

    if (!formData.email.trim()) {
      setFormError('L\'email est requis');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.partners.create({
        nom: formData.nom.trim(),
        type: formData.type,
        siret: formData.siret.replace(/\s/g, ''),
        siren: formData.siren.replace(/\s/g, ''),
        email: formData.email.trim(),
      });

      setShowModal(false);
      setFormData({ nom: '', type: '', siret: '', siren: '', email: '' });
      loadPartners();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création du partenaire';
      setFormError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'suspended':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'suspended':
        return 'Suspendu';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Liste des partenaires</h1>
          <p className="text-gray-400">Gérez vos partenaires ({filteredPartners.length})</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg px-6 py-3 font-medium transition"
        >
          <PlusIcon className="w-5 h-5" />
          Nouveau partenaire
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
          <option value="pending">En attente</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
        >
          <option value="">Tous les types</option>
          <option value="agency">Agence</option>
          <option value="individual">Individuel</option>
          <option value="company">Entreprise</option>
        </select>
      </div>

      {/* Partners Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {filteredPartners.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-700/50">
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Nom</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Type</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Statut</th>
                  <th className="px-6 py-4 text-center text-gray-400 font-semibold">Clients</th>
                  <th className="px-6 py-4 text-center text-gray-400 font-semibold">Commissions</th>
                  <th className="px-6 py-4 text-right text-gray-400 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-6 py-4 text-white font-medium">{partner.nom}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {partner.type === 'agency'
                        ? 'Agence'
                        : partner.type === 'individual'
                        ? 'Individuel'
                        : 'Entreprise'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 ${getStatusColor(
                          partner.statut
                        )}`}
                      >
                        {partner.statut === 'active' && (
                          <CheckCircleIcon className="w-4 h-4" />
                        )}
                        {partner.statut === 'suspended' && (
                          <ExclamationCircleIcon className="w-4 h-4" />
                        )}
                        {getStatusLabel(partner.statut)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-400">
                      {partner.clientsCount}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-400">
                      {partner.commissionsCount}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedPartner(partner)}
                        className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 transition"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">Aucun partenaire trouvé</p>
          </div>
        )}
      </div>

      {/* Create Partner Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Nouveau partenaire</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormError('');
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreatePartner}>
              {/* Nom */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) =>
                    setFormData({ ...formData, nom: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition"
                  placeholder="Nom du partenaire"
                  disabled={submitting}
                />
              </div>

              {/* Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400 transition"
                  disabled={submitting}
                >
                  <option value="">Sélectionner un type</option>
                  <option value="agency">Agence</option>
                  <option value="individual">Individuel</option>
                  <option value="company">Entreprise</option>
                </select>
              </div>

              {/* SIRET */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  SIRET (14 chiffres)
                </label>
                <input
                  type="text"
                  value={formData.siret}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, siret: value.slice(0, 14) });
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition"
                  placeholder="12345678901234"
                  maxLength={14}
                  disabled={submitting}
                />
              </div>

              {/* SIREN */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  SIREN (9 chiffres)
                </label>
                <input
                  type="text"
                  value={formData.siren}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, siren: value.slice(0, 9) });
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition"
                  placeholder="123456789"
                  maxLength={9}
                  disabled={submitting}
                />
              </div>

              {/* Email */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition"
                  placeholder="email@example.com"
                  disabled={submitting}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormError('');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 font-medium transition"
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-black rounded-lg px-4 py-2 font-medium transition disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partner Details Sidebar */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-40">
          <div className="bg-gray-800 border-t border-gray-700 w-full md:w-96 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Détails du partenaire</h2>
              <button
                onClick={() => setSelectedPartner(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <p className="text-gray-400 text-sm mb-1">Nom</p>
                <p className="text-white font-semibold">{selectedPartner.nom}</p>
              </div>

              {/* Type */}
              <div>
                <p className="text-gray-400 text-sm mb-1">Type</p>
                <p className="text-white font-semibold">
                  {selectedPartner.type === 'agency'
                    ? 'Agence'
                    : selectedPartner.type === 'individual'
                    ? 'Individuel'
                    : 'Entreprise'}
                </p>
              </div>

              {/* Status */}
              <div>
                <p className="text-gray-400 text-sm mb-1">Statut</p>
                <span
                  className={`inline-block font-semibold ${getStatusColor(
                    selectedPartner.statut
                  )}`}
                >
                  {getStatusLabel(selectedPartner.statut)}
                </span>
              </div>

              {/* SIRET */}
              <div>
                <p className="text-gray-400 text-sm mb-1">SIRET</p>
                <p className="text-white font-mono text-sm">{selectedPartner.siret}</p>
              </div>

              {/* SIREN */}
              <div>
                <p className="text-gray-400 text-sm mb-1">SIREN</p>
                <p className="text-white font-mono text-sm">{selectedPartner.siren}</p>
              </div>

              {/* Email */}
              {selectedPartner.email && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Email</p>
                  <p className="text-white">{selectedPartner.email}</p>
                </div>
              )}

              {/* Phone */}
              {selectedPartner.phone && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Téléphone</p>
                  <p className="text-white">{selectedPartner.phone}</p>
                </div>
              )}

              {/* Address */}
              {selectedPartner.address && (
                <div>
                  <p className="text-gray-400 text-sm mb-1">Adresse</p>
                  <p className="text-white">{selectedPartner.address}</p>
                </div>
              )}

              {/* Clients Count */}
              <div className="pt-4 border-t border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Nombre de clients</p>
                <p className="text-2xl font-bold text-amber-400">
                  {selectedPartner.clientsCount}
                </p>
              </div>

              {/* Commissions Count */}
              <div>
                <p className="text-gray-400 text-sm mb-1">Nombre de commissions</p>
                <p className="text-2xl font-bold text-amber-400">
                  {selectedPartner.commissionsCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
