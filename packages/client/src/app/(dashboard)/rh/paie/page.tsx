'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  calculerPaie,
  getDefaultDonnees,
  formatEUR,
  formatPct,
  PMSS_2025,
  SMIC_MENSUEL_2025,
  type DonneesEmploye,
  type ResultatPaie,
  type StatutEmploye,
  type LigneCotisation,
} from '@/lib/paie-engine';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  CalculatorIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

// ============================================================
// TYPES
// ============================================================

interface BulletinPaie {
  id: string;
  tenantId: string;
  membreId: string;
  membreNom: string;
  mois: number;
  annee: number;
  salaireBase: number;
  primes: number;
  deductions: number;
  chargesPatronales: number;
  chargesSalariales: number;
  netAPayer: number;
  netImposable: number;
  statut: 'brouillon' | 'valide' | 'paye';
  commentaire?: string;
  createdAt: string;
}

interface Membre {
  id: string;
  nom: string;
  prenom: string;
  poste?: string;
  departement?: string;
  contratType: string;
  salaireBase?: number;
}

interface PaieFormData extends DonneesEmploye {
  membreId: string;
  mois: number;
  annee: number;
  commentaire: string;
}

const moisFrancais = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const statutLabels: Record<StatutEmploye, string> = {
  non_cadre: 'Non-cadre',
  cadre: 'Cadre',
  apprenti: 'Apprenti',
  stagiaire: 'Stagiaire',
  dirigeant: 'Dirigeant',
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function PaiePage(): JSX.Element {
  const [bulletins, setBulletins] = useState<BulletinPaie[]>([]);
  const [filteredBulletins, setFilteredBulletins] = useState<BulletinPaie[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMois, setSelectedMois] = useState<number | string>('');
  const [selectedAnnee, setSelectedAnnee] = useState<number | string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingBulletin, setEditingBulletin] = useState<BulletinPaie | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sante', 'retraite', 'chomage', 'famille', 'csg_crds', 'autre']));

  const defaultForm: PaieFormData = {
    membreId: '',
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    commentaire: '',
    ...getDefaultDonnees(2500, 'non_cadre'),
  };

  const [formData, setFormData] = useState<PaieFormData>(defaultForm);

  // Calcul temps réel
  const resultatPaie: ResultatPaie | null = useMemo(() => {
    if (formData.salaireBase <= 0) return null;
    try {
      return calculerPaie(formData);
    } catch {
      return null;
    }
  }, [formData]);

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================

  const fetchBulletins = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiClient.rh.paie.list();
      const raw = response.data as unknown as { success: boolean; data: BulletinPaie[] };
      setBulletins(raw.data || []);
      setFilteredBulletins(raw.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembres = async (): Promise<void> => {
    try {
      const response = await apiClient.equipe.membres.list();
      const raw = response.data as unknown as { success: boolean; data: Membre[] };
      setMembres(raw.data || []);
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    fetchBulletins();
    fetchMembres();
  }, []);

  useEffect(() => {
    let filtered = bulletins;
    if (searchTerm) {
      filtered = filtered.filter((b) =>
        b.membreNom.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedMois) filtered = filtered.filter((b) => b.mois === Number(selectedMois));
    if (selectedAnnee) filtered = filtered.filter((b) => b.annee === Number(selectedAnnee));
    setFilteredBulletins(filtered);
  }, [searchTerm, selectedMois, selectedAnnee, bulletins]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleCreate = (): void => {
    setEditingBulletin(null);
    setFormData(defaultForm);
    setShowModal(true);
  };

  const handleEdit = (bulletin: BulletinPaie): void => {
    setEditingBulletin(bulletin);
    const membre = membres.find(m => m.id === bulletin.membreId);
    const statut: StatutEmploye = (membre?.contratType === 'cdi' || membre?.contratType === 'cdd')
      ? 'non_cadre' : 'non_cadre';

    setFormData({
      membreId: bulletin.membreId,
      mois: bulletin.mois,
      annee: bulletin.annee,
      commentaire: bulletin.commentaire || '',
      ...getDefaultDonnees(bulletin.salaireBase, statut),
      primes: bulletin.primes,
    });
    setShowModal(true);
  };

  const handleMembreChange = (membreId: string): void => {
    const membre = membres.find(m => m.id === membreId);
    setFormData(prev => ({
      ...prev,
      membreId,
      salaireBase: membre?.salaireBase || prev.salaireBase,
    }));
  };

  const handleSave = async (): Promise<void> => {
    if (!formData.membreId) {
      setError('Veuillez sélectionner un employé');
      return;
    }
    if (!resultatPaie) {
      setError('Erreur de calcul — vérifiez le salaire de base');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const dataToSave = {
        membreId: formData.membreId,
        mois: formData.mois,
        annee: formData.annee,
        salaireBase: formData.salaireBase,
        primes: formData.primes,
        deductions: resultatPaie.totalChargesSalariales,
        chargesPatronales: resultatPaie.totalChargesPatronales,
        chargesSalariales: resultatPaie.totalChargesSalariales,
        netAPayer: resultatPaie.netAPayer,
        netImposable: resultatPaie.netImposable,
        commentaire: formData.commentaire,
        // Données détaillées pour la fiche de paie
        detailCotisations: JSON.stringify(resultatPaie.lignesCotisations),
        heuresSupp: formData.heuresSupp,
        avantagesNature: formData.avantagesNature,
        statut: formData.statut,
        tauxAT: formData.tauxAT,
        mutuelleEmployeur: formData.mutuelleEmployeur,
        mutuelleSalarie: formData.mutuelleSalarie,
        transportEmployeur: formData.transportEmployeur,
        ticketsRestaurant: formData.ticketsRestaurant,
        coutTotalEmployeur: resultatPaie.coutTotalEmployeur,
      };

      if (editingBulletin) {
        await apiClient.rh.paie.update(editingBulletin.id, dataToSave);
      } else {
        await apiClient.rh.paie.create(dataToSave);
      }
      setShowModal(false);
      setSuccessMsg(editingBulletin ? 'Bulletin modifié' : 'Bulletin créé avec succès');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchBulletins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bulletin ?')) return;
    setDeletingId(id);
    try {
      await apiClient.rh.paie.delete(id);
      await fetchBulletins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const getStatutBadgeColor = (statut: string): string => {
    switch (statut) {
      case 'brouillon': return 'bg-gray-500/20 text-gray-400';
      case 'valide': return 'bg-blue-500/20 text-blue-400';
      case 'paye': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const calculateTotals = () => ({
    totalBrut: filteredBulletins.reduce((sum, b) => sum + b.salaireBase + b.primes, 0),
    totalNet: filteredBulletins.reduce((sum, b) => sum + b.netAPayer, 0),
    totalChargesS: filteredBulletins.reduce((sum, b) => sum + (b.chargesSalariales || b.deductions), 0),
    totalChargesP: filteredBulletins.reduce((sum, b) => sum + (b.chargesPatronales || 0), 0),
  });

  const totals = calculateTotals();
  const currentYear = new Date().getFullYear();
  const yearsRange = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Regrouper les cotisations par catégorie
  const cotisationsParCategorie = useMemo(() => {
    if (!resultatPaie) return {};
    const grouped: Record<string, LigneCotisation[]> = {};
    for (const ligne of resultatPaie.lignesCotisations) {
      if (!grouped[ligne.categorie]) grouped[ligne.categorie] = [];
      grouped[ligne.categorie].push(ligne);
    }
    return grouped;
  }, [resultatPaie]);

  const categorieLabels: Record<string, string> = {
    sante: 'Santé',
    retraite: 'Retraite',
    chomage: 'Chômage',
    famille: 'Famille',
    csg_crds: 'CSG / CRDS',
    autre: 'Autres contributions',
  };

  // ============================================================
  // RENDU
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Bulletins de Paie</h1>
          <p className="mt-2 text-sm text-gray-400">
            Calcul automatique des cotisations sociales et patronales (taux 2025)
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nouveau bulletin</span>
        </button>
      </div>

      {/* Référence PMSS/SMIC */}
      <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-4 mb-6 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <InformationCircleIcon className="h-5 w-5 text-indigo-400" />
          <span className="text-sm font-medium text-indigo-300">Références 2025</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">PMSS :</span>
            <span className="ml-2 text-white font-medium">{formatEUR(PMSS_2025)}</span>
          </div>
          <div>
            <span className="text-gray-400">SMIC mensuel :</span>
            <span className="ml-2 text-white font-medium">{formatEUR(SMIC_MENSUEL_2025)}</span>
          </div>
          <div>
            <span className="text-gray-400">Plafond T2 :</span>
            <span className="ml-2 text-white font-medium">{formatEUR(PMSS_2025 * 4)}</span>
          </div>
          <div>
            <span className="text-gray-400">Plafond T2 Agirc :</span>
            <span className="ml-2 text-white font-medium">{formatEUR(PMSS_2025 * 8)}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded backdrop-blur-md">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-green-900/20 border border-green-700/30 text-green-300 px-4 py-3 rounded backdrop-blur-md">
          {successMsg}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 bg-gray-800/20 border border-gray-700/30 rounded-lg shadow-lg p-6 backdrop-blur-md mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={selectedMois}
            onChange={(e) => setSelectedMois(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les mois</option>
            {moisFrancais.map((mois, index) => (
              <option key={index + 1} value={index + 1}>{mois}</option>
            ))}
          </select>
          <select
            value={selectedAnnee}
            onChange={(e) => setSelectedAnnee(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Toutes les années</option>
            {yearsRange.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-gray-800 rounded-xl border border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Membre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Période</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Brut</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Charges sal.</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Charges pat.</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Net imposable</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Net à payer</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase">Statut</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBulletins.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  Aucun bulletin trouvé
                </td>
              </tr>
            ) : (
              filteredBulletins.map((bulletin) => (
                <tr key={bulletin.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="px-4 py-4 text-sm text-white font-medium">{bulletin.membreNom}</td>
                  <td className="px-4 py-4 text-sm text-gray-300">
                    {moisFrancais[bulletin.mois - 1]} {bulletin.annee}
                  </td>
                  <td className="px-4 py-4 text-sm text-white text-right">
                    {formatEUR(bulletin.salaireBase + bulletin.primes)}
                  </td>
                  <td className="px-4 py-4 text-sm text-orange-400 text-right">
                    {formatEUR(bulletin.chargesSalariales || bulletin.deductions)}
                  </td>
                  <td className="px-4 py-4 text-sm text-red-400 text-right">
                    {formatEUR(bulletin.chargesPatronales || 0)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-300 text-right">
                    {bulletin.netImposable ? formatEUR(bulletin.netImposable) : '-'}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-green-400 text-right">
                    {formatEUR(bulletin.netAPayer)}
                  </td>
                  <td className="px-4 py-4 text-sm text-center">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatutBadgeColor(bulletin.statut)}`}>
                      {bulletin.statut.charAt(0).toUpperCase() + bulletin.statut.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleEdit(bulletin)}
                        className="text-indigo-400 hover:text-indigo-300"
                        title="Modifier"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(bulletin.id)}
                        disabled={deletingId === bulletin.id}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                        title="Supprimer"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-4 backdrop-blur-md">
          <p className="text-gray-400 text-sm mb-1">Total Brut</p>
          <p className="text-2xl font-bold text-white">{formatEUR(totals.totalBrut)}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-4 backdrop-blur-md">
          <p className="text-gray-400 text-sm mb-1">Charges Salariales</p>
          <p className="text-2xl font-bold text-orange-400">{formatEUR(totals.totalChargesS)}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-4 backdrop-blur-md">
          <p className="text-gray-400 text-sm mb-1">Charges Patronales</p>
          <p className="text-2xl font-bold text-red-400">{formatEUR(totals.totalChargesP)}</p>
        </div>
        <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-4 backdrop-blur-md">
          <p className="text-gray-400 text-sm mb-1">Total Net à Payer</p>
          <p className="text-2xl font-bold text-green-400">{formatEUR(totals.totalNet)}</p>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        {filteredBulletins.length} bulletin{filteredBulletins.length > 1 ? 's' : ''} sur {bulletins.length}
      </div>

      {/* ============================================================ */}
      {/* MODAL CRÉATION / ÉDITION                                      */}
      {/* ============================================================ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CalculatorIcon className="h-6 w-6 text-indigo-400" />
                  {editingBulletin ? 'Modifier le bulletin' : 'Nouveau bulletin de paie'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonne gauche : Formulaire */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Informations employé</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Employé</label>
                    <select
                      value={formData.membreId}
                      onChange={(e) => handleMembreChange(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Sélectionner --</option>
                      {membres.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.prenom} {m.nom} — {m.poste || 'N/A'}
                          {m.salaireBase ? ` (${formatEUR(m.salaireBase)})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Mois</label>
                      <select
                        value={formData.mois}
                        onChange={(e) => setFormData({ ...formData, mois: parseInt(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {moisFrancais.map((mois, index) => (
                          <option key={index + 1} value={index + 1}>{mois}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Année</label>
                      <select
                        value={formData.annee}
                        onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {yearsRange.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Statut</label>
                    <select
                      value={formData.statut}
                      onChange={(e) => setFormData({ ...formData, statut: e.target.value as StatutEmploye })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Object.entries(statutLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider pt-2">Rémunération</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Salaire brut de base</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.salaireBase}
                        onChange={(e) => setFormData({ ...formData, salaireBase: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Primes</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.primes}
                        onChange={(e) => setFormData({ ...formData, primes: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Heures supplémentaires</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.heuresSupp}
                        onChange={(e) => setFormData({ ...formData, heuresSupp: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Avantages en nature</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.avantagesNature}
                        onChange={(e) => setFormData({ ...formData, avantagesNature: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider pt-2">Paramètres entreprise</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Taux AT/MP (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={(formData.tauxAT * 100).toFixed(2)}
                        onChange={(e) => setFormData({ ...formData, tauxAT: (parseFloat(e.target.value) || 0) / 100 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Temps partiel</label>
                      <select
                        value={formData.tempsPartiel}
                        onChange={(e) => setFormData({ ...formData, tempsPartiel: parseFloat(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={1}>Temps plein (100%)</option>
                        <option value={0.9}>90%</option>
                        <option value={0.8}>80%</option>
                        <option value={0.5}>50%</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Mutuelle employeur</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.mutuelleEmployeur}
                        onChange={(e) => setFormData({ ...formData, mutuelleEmployeur: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Mutuelle salarié</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.mutuelleSalarie}
                        onChange={(e) => setFormData({ ...formData, mutuelleSalarie: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Transport employeur</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.transportEmployeur}
                        onChange={(e) => setFormData({ ...formData, transportEmployeur: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Tickets restaurant</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.ticketsRestaurant}
                        onChange={(e) => setFormData({ ...formData, ticketsRestaurant: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Commentaire</label>
                    <textarea
                      value={formData.commentaire}
                      onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                      rows={2}
                      className="w-full bg-gray-900 border border-gray-700 rounded-md text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Notes optionnelles..."
                    />
                  </div>
                </div>

                {/* Colonne droite : Résultat en temps réel */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider">Résultat du calcul</h3>

                  {resultatPaie ? (
                    <>
                      {/* Résumé */}
                      <div className="bg-gray-900 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Salaire brut</span>
                          <span className="text-white font-medium">{formatEUR(resultatPaie.salaireBrut)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Charges salariales ({resultatPaie.tauxChargesSalariales}%)</span>
                          <span className="text-orange-400 font-medium">-{formatEUR(resultatPaie.totalChargesSalariales)}</span>
                        </div>
                        <div className="border-t border-gray-700 pt-2 flex justify-between">
                          <span className="text-gray-300 font-semibold">Net imposable</span>
                          <span className="text-white font-bold">{formatEUR(resultatPaie.netImposable)}</span>
                        </div>
                        <div className="border-t border-gray-700 pt-2 flex justify-between">
                          <span className="text-green-300 font-semibold text-lg">Net à payer</span>
                          <span className="text-green-400 font-bold text-lg">{formatEUR(resultatPaie.netAPayer)}</span>
                        </div>
                        <div className="border-t border-gray-700 pt-2 flex justify-between">
                          <span className="text-gray-400">Charges patronales ({resultatPaie.tauxChargesPatronales}%)</span>
                          <span className="text-red-400 font-medium">{formatEUR(resultatPaie.totalChargesPatronales)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-semibold">Coût total employeur</span>
                          <span className="text-white font-bold">{formatEUR(resultatPaie.coutTotalEmployeur)}</span>
                        </div>
                      </div>

                      {/* Détail des cotisations */}
                      <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider pt-2">Détail des cotisations</h3>

                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {Object.entries(cotisationsParCategorie).map(([cat, lignes]) => (
                          <div key={cat} className="bg-gray-900 rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleCategory(cat)}
                              className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-800/50"
                            >
                              <span className="text-sm font-medium text-indigo-300">{categorieLabels[cat] || cat}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-orange-400">
                                  S: {formatEUR(lignes.reduce((s, l) => s + l.montantSalarial, 0))}
                                </span>
                                <span className="text-xs text-red-400">
                                  P: {formatEUR(lignes.reduce((s, l) => s + l.montantPatronal, 0))}
                                </span>
                                {expandedCategories.has(cat) ? (
                                  <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                            </button>

                            {expandedCategories.has(cat) && (
                              <div className="px-4 pb-3">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-500">
                                      <th className="text-left py-1">Libellé</th>
                                      <th className="text-right py-1">Base</th>
                                      <th className="text-right py-1">Sal.</th>
                                      <th className="text-right py-1">Pat.</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lignes.map((ligne) => (
                                      <tr key={ligne.code} className="border-t border-gray-800">
                                        <td className="py-1 text-gray-300 pr-2">{ligne.libelle}</td>
                                        <td className="py-1 text-gray-400 text-right">{formatEUR(ligne.base)}</td>
                                        <td className="py-1 text-orange-400 text-right">
                                          {ligne.montantSalarial > 0 ? formatEUR(ligne.montantSalarial) : '-'}
                                          {ligne.tauxSalarial > 0 && (
                                            <span className="text-gray-600 ml-1">({formatPct(ligne.tauxSalarial)})</span>
                                          )}
                                        </td>
                                        <td className="py-1 text-red-400 text-right">
                                          {ligne.montantPatronal > 0 ? formatEUR(ligne.montantPatronal) : '-'}
                                          {ligne.tauxPatronal > 0 && (
                                            <span className="text-gray-600 ml-1">({formatPct(ligne.tauxPatronal)})</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-900 rounded-lg p-8 text-center text-gray-500">
                      Entrez un salaire de base pour voir le calcul
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end space-x-3 border-t border-gray-700 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !resultatPaie}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  {saving ? 'Enregistrement...' : 'Enregistrer le bulletin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
