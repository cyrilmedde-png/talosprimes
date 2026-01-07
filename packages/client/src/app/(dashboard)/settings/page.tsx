'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import type { Tenant, User, StatutJuridique } from '@talosprimes/shared';
import { BuildingOfficeIcon, UserPlusIcon } from '@heroicons/react/24/outline';

const STATUTS_JURIDIQUES: { value: StatutJuridique; label: string }[] = [
  { value: 'SA', label: 'SA - Société Anonyme' },
  { value: 'SARL', label: 'SARL - Société à Responsabilité Limitée' },
  { value: 'SAS', label: 'SAS - Société par Actions Simplifiée' },
  { value: 'SASU', label: 'SASU - Société par Actions Simplifiée Unipersonnelle' },
  { value: 'SCI', label: 'SCI - Société Civile Immobilière' },
  { value: 'SNC', label: 'SNC - Société en Nom Collectif' },
  { value: 'SCS', label: 'SCS - Société en Commandite Simple' },
  { value: 'SCA', label: 'SCA - Société en Commandite par Actions' },
  { value: 'EURL', label: 'EURL - Entreprise Unipersonnelle à Responsabilité Limitée' },
  { value: 'SCP', label: 'SCP - Société Civile Professionnelle' },
  { value: 'SEL', label: 'SEL - Société d\'Exercice Libéral' },
  { value: 'SELARL', label: 'SELARL - Société d\'Exercice Libéral à Responsabilité Limitée' },
  { value: 'SELAS', label: 'SELAS - Société d\'Exercice Libéral par Actions Simplifiée' },
  { value: 'SELAFA', label: 'SELAFA - Société d\'Exercice Libéral par Actions Forme Anonyme' },
  { value: 'AUTO_ENTREPRENEUR', label: 'Auto-entrepreneur / Micro-entreprise' },
  { value: 'EIRL', label: 'EIRL - Entreprise Individuelle à Responsabilité Limitée' },
  { value: 'ENTREPRISE_INDIVIDUELLE', label: 'Entreprise Individuelle' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'entreprise' | 'utilisateurs'>('entreprise');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Données entreprise
  const [tenant, setTenant] = useState<Partial<Tenant>>({});
  
  // Données utilisateur
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'collaborateur' as 'admin' | 'collaborateur' | 'lecture_seule',
    nom: '',
    prenom: '',
    telephone: '',
    fonction: '',
    salaire: '',
    dateEmbauche: '',
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

      const token = localStorage.getItem('accessToken');
      
      // Charger le profil entreprise
      const tenantResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (tenantResponse.ok) {
        const tenantData = await tenantResponse.json();
        setTenant(tenantData.data.tenant || {});
      }

      // Charger les utilisateurs
      const usersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.data.users || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEntreprise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenant`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenant),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la sauvegarde');
      }

      setSuccess('Profil entreprise mis à jour avec succès');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newUser,
          salaire: newUser.salaire ? parseFloat(newUser.salaire) : null,
          dateEmbauche: newUser.dateEmbauche || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }

      setSuccess('Utilisateur créé avec succès');
      setNewUser({
        email: '',
        password: '',
        role: 'collaborateur',
        nom: '',
        prenom: '',
        telephone: '',
        fonction: '',
        salaire: '',
        dateEmbauche: '',
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Paramètres</h1>
        <p className="mt-2 text-sm text-gray-400">
          Configuration de votre entreprise et gestion des utilisateurs
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-700/30">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('entreprise')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'entreprise'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <BuildingOfficeIcon className="h-5 w-5 inline mr-2" />
            Profil Entreprise
          </button>
          <button
            onClick={() => setActiveTab('utilisateurs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'utilisateurs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <UserPlusIcon className="h-5 w-5 inline mr-2" />
            Utilisateurs
          </button>
        </nav>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-900/20 border border-green-700/30 text-green-300 px-4 py-3 rounded backdrop-blur-md">
          {success}
        </div>
      )}

      {/* Tab Contenu */}
      {activeTab === 'entreprise' ? (
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
          <h2 className="text-xl font-bold text-white mb-6">Profil Entreprise</h2>
          <form onSubmit={handleSaveEntreprise} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nom de l'entreprise *</label>
                <input
                  type="text"
                  required
                  value={tenant.nomEntreprise || ''}
                  onChange={(e) => setTenant({ ...tenant, nomEntreprise: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Statut juridique</label>
                <select
                  value={tenant.statutJuridique || ''}
                  onChange={(e) => setTenant({ ...tenant, statutJuridique: e.target.value as StatutJuridique || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sélectionner...</option>
                  {STATUTS_JURIDIQUES.map((statut) => (
                    <option key={statut.value} value={statut.value}>
                      {statut.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SIRET</label>
                <input
                  type="text"
                  value={tenant.siret || ''}
                  onChange={(e) => setTenant({ ...tenant, siret: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">SIREN</label>
                <input
                  type="text"
                  value={tenant.siren || ''}
                  onChange={(e) => setTenant({ ...tenant, siren: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Code APE</label>
                <input
                  type="text"
                  value={tenant.codeAPE || ''}
                  onChange={(e) => setTenant({ ...tenant, codeAPE: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Code NAF</label>
                <input
                  type="text"
                  value={tenant.codeNAF || ''}
                  onChange={(e) => setTenant({ ...tenant, codeNAF: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={tenant.telephone || ''}
                  onChange={(e) => setTenant({ ...tenant, telephone: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email de contact *</label>
                <input
                  type="email"
                  required
                  value={tenant.emailContact || ''}
                  onChange={(e) => setTenant({ ...tenant, emailContact: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Adresse postale</label>
                <textarea
                  value={tenant.adressePostale || ''}
                  onChange={(e) => setTenant({ ...tenant, adressePostale: e.target.value || null })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Code postal</label>
                <input
                  type="text"
                  value={tenant.codePostal || ''}
                  onChange={(e) => setTenant({ ...tenant, codePostal: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ville</label>
                <input
                  type="text"
                  value={tenant.ville || ''}
                  onChange={(e) => setTenant({ ...tenant, ville: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Métier</label>
                <input
                  type="text"
                  value={tenant.metier || ''}
                  onChange={(e) => setTenant({ ...tenant, metier: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Formulaire création utilisateur */}
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md p-6">
            <h2 className="text-xl font-bold text-white mb-6">Créer un utilisateur</h2>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mot de passe *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Rôle *</label>
                  <select
                    required
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="collaborateur">Collaborateur</option>
                    <option value="admin">Admin</option>
                    <option value="lecture_seule">Lecture seule</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Fonction</label>
                  <input
                    type="text"
                    value={newUser.fonction}
                    onChange={(e) => setNewUser({ ...newUser, fonction: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
                  <input
                    type="text"
                    value={newUser.nom}
                    onChange={(e) => setNewUser({ ...newUser, nom: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Prénom</label>
                  <input
                    type="text"
                    value={newUser.prenom}
                    onChange={(e) => setNewUser({ ...newUser, prenom: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={newUser.telephone}
                    onChange={(e) => setNewUser({ ...newUser, telephone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Salaire (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newUser.salaire}
                    onChange={(e) => setNewUser({ ...newUser, salaire: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date d'embauche</label>
                  <input
                    type="date"
                    value={newUser.dateEmbauche}
                    onChange={(e) => setNewUser({ ...newUser, dateEmbauche: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Création...' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>

          {/* Liste des utilisateurs */}
          <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg backdrop-blur-md">
            <div className="px-6 py-4 border-b border-gray-700/30">
              <h3 className="text-lg font-medium text-white">Utilisateurs de l'entreprise</h3>
            </div>
            <div className="p-6">
              {users.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  <UserPlusIcon className="mx-auto h-12 w-12 text-gray-600" />
                  <p className="mt-4 text-gray-400">Aucun utilisateur pour le moment</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700/30">
                    <thead className="bg-gray-800/30">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nom</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rôle</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fonction</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Salaire</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                            {user.prenom} {user.nom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 capitalize">
                            {user.role.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.fonction || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {user.salaire ? `${user.salaire.toFixed(2)} €` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.statut === 'actif'
                                ? 'bg-green-400/20 text-green-300'
                                : 'bg-gray-400/20 text-gray-300'
                            }`}>
                              {user.statut}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

