'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  ChartBarIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// ============================================================
// TYPES
// ============================================================

interface LigneCA {
  id: string;
  libelle: string;
  montantsMensuels: number[];
}

interface LigneCharge {
  id: string;
  libelle: string;
  categorie: 'fixe' | 'variable' | 'personnel';
  montantsMensuels: number[];
}

interface LigneFinancement {
  id: string;
  libelle: string;
  type: 'apport' | 'emprunt' | 'subvention' | 'autre';
  montant: number;
  tauxInteret: number;
  dureeMois: number;
}

interface LigneInvestissement {
  id: string;
  libelle: string;
  montantHT: number;
  tva: number;
  dureeAmortissement: number;
  moisAcquisition: number;
}

interface PrevisionnelDonnees {
  lignesCA: LigneCA[];
  lignesCharges: LigneCharge[];
  investissements: LigneInvestissement[];
  financements: LigneFinancement[];
  parametres: { tauxTVA: number };
}

interface PrevisionnelItem {
  id: string;
  clientFinalId: string | null;
  clientLabel: string | null;
  nom: string;
  description: string | null;
  annee: number;
  statut: 'brouillon' | 'valide' | 'archive';
  donnees: PrevisionnelDonnees;
  caAnnuel: number;
  chargesAnnuelles: number;
  resultatExploitation: number;
  seuilRentabilite: number;
  tresorerieFinale: number;
  createdAt: string;
  updatedAt: string;
}

interface ClientOption {
  id: string;
  raisonSociale: string | null;
  nom: string | null;
  prenom: string | null;
}

// ============================================================
// HELPERS
// ============================================================

const moisCourts = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const moisComplets = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const newId = () => Math.random().toString(36).slice(2, 9);
const formatEUR = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const zeroMois = (): number[] => Array(12).fill(0);

const categorieChargeLabels: Record<string, string> = {
  fixe: 'Charges fixes',
  variable: 'Charges variables',
  personnel: 'Charges de personnel',
};

const emptyDonnees = (): PrevisionnelDonnees => ({
  lignesCA: [
    { id: newId(), libelle: 'Source de CA 1', montantsMensuels: zeroMois() },
  ],
  lignesCharges: [
    { id: newId(), libelle: 'Loyer / Hébergement', categorie: 'fixe', montantsMensuels: zeroMois() },
    { id: newId(), libelle: 'Marketing', categorie: 'variable', montantsMensuels: zeroMois() },
    { id: newId(), libelle: 'Salaires', categorie: 'personnel', montantsMensuels: zeroMois() },
  ],
  investissements: [],
  financements: [],
  parametres: { tauxTVA: 20 },
});

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function PrevisionnelPage(): JSX.Element {
  // --- État liste ---
  const [previsionnels, setPrevisionnels] = useState<PrevisionnelItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- État édition ---
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // --- Formulaire ---
  const [nom, setNom] = useState('Prévisionnel');
  const [description, setDescription] = useState('');
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [clientFinalId, setClientFinalId] = useState<string>('');
  const [lignesCA, setLignesCA] = useState<LigneCA[]>(emptyDonnees().lignesCA);
  const [lignesCharges, setLignesCharges] = useState<LigneCharge[]>(emptyDonnees().lignesCharges);
  const [lignesInvestissement, setLignesInvestissement] = useState<LigneInvestissement[]>([]);
  const [lignesFinancement, setLignesFinancement] = useState<LigneFinancement[]>([]);
  const [tauxTVA] = useState(20);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['ca', 'charges', 'financement', 'investissement', 'resultat', 'tresorerie'])
  );

  // ============================================================
  // CHARGEMENT
  // ============================================================

  const fetchPrevisionnels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.comptabilite.previsionnels.list();
      const raw = response?.data as unknown as { success: boolean; data: PrevisionnelItem[] };
      setPrevisionnels(raw.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const response = await apiClient.clients.list();
      const raw = response?.data as unknown as { success: boolean; data: { clients: ClientOption[] } };
      setClients(raw.data?.clients || []);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchPrevisionnels();
    fetchClients();
  }, [fetchPrevisionnels, fetchClients]);

  // ============================================================
  // CALCULS
  // ============================================================

  const caMensuels = useMemo(() => {
    const totaux = zeroMois();
    lignesCA.forEach(l => l.montantsMensuels.forEach((m, i) => totaux[i] += m));
    return totaux;
  }, [lignesCA]);

  const caAnnuel = useMemo(() => caMensuels.reduce((s, v) => s + v, 0), [caMensuels]);

  const chargesTotalesMensuelles = useMemo(() => {
    const totaux = zeroMois();
    lignesCharges.forEach(l => l.montantsMensuels.forEach((m, i) => totaux[i] += m));
    return totaux;
  }, [lignesCharges]);

  const chargesAnnuelles = useMemo(() => chargesTotalesMensuelles.reduce((s, v) => s + v, 0), [chargesTotalesMensuelles]);

  const amortissementsMensuels = useMemo(() => {
    const totaux = zeroMois();
    lignesInvestissement.forEach(inv => {
      const amortMensuel = inv.montantHT / (inv.dureeAmortissement * 12);
      for (let i = inv.moisAcquisition; i < 12; i++) {
        totaux[i] += amortMensuel;
      }
    });
    return totaux.map(v => Math.round(v));
  }, [lignesInvestissement]);

  const remboursementsMensuels = useMemo(() => {
    let total = 0;
    lignesFinancement.filter(f => f.type === 'emprunt').forEach(f => {
      if (f.dureeMois > 0) {
        total += f.montant / f.dureeMois;
        total += (f.montant * (f.tauxInteret / 100)) / 12;
      }
    });
    return Math.round(total);
  }, [lignesFinancement]);

  const resultatExploitationMensuel = useMemo(() => {
    return caMensuels.map((ca, i) => ca - chargesTotalesMensuelles[i] - amortissementsMensuels[i]);
  }, [caMensuels, chargesTotalesMensuelles, amortissementsMensuels]);

  const resultatExploitationAnnuel = useMemo(() =>
    resultatExploitationMensuel.reduce((s, v) => s + v, 0), [resultatExploitationMensuel]);

  const tvaMensuelle = useMemo(() => {
    return caMensuels.map((ca, i) => {
      const collectee = Math.round(ca * tauxTVA / 100);
      const deductible = Math.round(chargesTotalesMensuelles[i] * tauxTVA / 100 * 0.6);
      return { collectee, deductible, aPayer: collectee - deductible };
    });
  }, [caMensuels, chargesTotalesMensuelles, tauxTVA]);

  const tresorerieMensuelle = useMemo(() => {
    const tresorerie: number[] = [];
    let solde = lignesFinancement.reduce((s, f) => s + f.montant, 0)
      - lignesInvestissement.reduce((s, inv) => s + inv.montantHT * (1 + inv.tva / 100), 0);
    for (let i = 0; i < 12; i++) {
      const encaissements = caMensuels[i] * (1 + tauxTVA / 100);
      const decaissements = chargesTotalesMensuelles[i] * (1 + tauxTVA / 100 * 0.6);
      const tvaAPayer = i > 0 ? tvaMensuelle[i - 1].aPayer : 0;
      solde += encaissements - decaissements - tvaAPayer - remboursementsMensuels;
      tresorerie.push(Math.round(solde));
    }
    return tresorerie;
  }, [caMensuels, chargesTotalesMensuelles, tvaMensuelle, remboursementsMensuels, lignesFinancement, lignesInvestissement, tauxTVA]);

  const seuilRentabilite = useMemo(() => {
    const chargesFixes = lignesCharges
      .filter(l => l.categorie === 'fixe' || l.categorie === 'personnel')
      .reduce((s, l) => s + l.montantsMensuels.reduce((a, b) => a + b, 0), 0);
    const chargesVar = lignesCharges
      .filter(l => l.categorie === 'variable')
      .reduce((s, l) => s + l.montantsMensuels.reduce((a, b) => a + b, 0), 0);
    const tauxMargeVariable = caAnnuel > 0 ? (caAnnuel - chargesVar) / caAnnuel : 0;
    return tauxMargeVariable > 0 ? Math.round(chargesFixes / tauxMargeVariable) : 0;
  }, [lignesCharges, caAnnuel]);

  const pointMort = useMemo(() => {
    let cumul = 0;
    for (let i = 0; i < 12; i++) {
      cumul += resultatExploitationMensuel[i];
      if (cumul > 0) return i + 1;
    }
    return null;
  }, [resultatExploitationMensuel]);

  // ============================================================
  // HANDLERS CRUD
  // ============================================================

  const updateLigneCA = (id: string, mois: number, val: number) => {
    setLignesCA(prev => prev.map(l => l.id === id ? { ...l, montantsMensuels: l.montantsMensuels.map((v, i) => i === mois ? val : v) } : l));
  };
  const updateLigneCharge = (id: string, mois: number, val: number) => {
    setLignesCharges(prev => prev.map(l => l.id === id ? { ...l, montantsMensuels: l.montantsMensuels.map((v, i) => i === mois ? val : v) } : l));
  };
  const fillAllMonths = (id: string, val: number, type: 'ca' | 'charge') => {
    if (type === 'ca') {
      setLignesCA(prev => prev.map(l => l.id === id ? { ...l, montantsMensuels: Array(12).fill(val) } : l));
    } else {
      setLignesCharges(prev => prev.map(l => l.id === id ? { ...l, montantsMensuels: Array(12).fill(val) } : l));
    }
  };
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  };

  // --- Ouvrir un prévisionnel existant ---
  const handleOpen = async (prev: PrevisionnelItem) => {
    try {
      const response = await apiClient.comptabilite.previsionnels.get(prev.id);
      const raw = response?.data as unknown as { success: boolean; data: PrevisionnelItem };
      const data = raw.data;
      if (!data) return;
      setEditingId(data.id);
      setNom(data.nom);
      setDescription(data.description || '');
      setAnnee(data.annee);
      setClientFinalId(data.clientFinalId || '');
      const d = data.donnees || emptyDonnees();
      setLignesCA(d.lignesCA || emptyDonnees().lignesCA);
      setLignesCharges(d.lignesCharges || emptyDonnees().lignesCharges);
      setLignesInvestissement(d.investissements || []);
      setLignesFinancement(d.financements || []);
      setEditMode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement');
    }
  };

  // --- Nouveau prévisionnel ---
  const handleNew = () => {
    setEditingId(null);
    setNom('Prévisionnel');
    setDescription('');
    setAnnee(new Date().getFullYear());
    setClientFinalId('');
    const d = emptyDonnees();
    setLignesCA(d.lignesCA);
    setLignesCharges(d.lignesCharges);
    setLignesInvestissement([]);
    setLignesFinancement([]);
    setEditMode(true);
  };

  // --- Dupliquer ---
  const handleDuplicate = async (prev: PrevisionnelItem) => {
    try {
      const response = await apiClient.comptabilite.previsionnels.get(prev.id);
      const raw = response?.data as unknown as { success: boolean; data: PrevisionnelItem };
      const data = raw.data;
      if (!data) return;
      await apiClient.comptabilite.previsionnels.create({
        nom: data.nom + ' (copie)',
        description: data.description,
        annee: data.annee,
        clientFinalId: data.clientFinalId,
        donnees: data.donnees,
      });
      setSuccessMsg('Prévisionnel dupliqué');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchPrevisionnels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur duplication');
    }
  };

  // --- Supprimer ---
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce prévisionnel ?')) return;
    try {
      await apiClient.comptabilite.previsionnels.delete(id);
      await fetchPrevisionnels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression');
    }
  };

  // --- Sauvegarder ---
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const donnees: PrevisionnelDonnees = {
        lignesCA,
        lignesCharges,
        investissements: lignesInvestissement,
        financements: lignesFinancement,
        parametres: { tauxTVA },
      };
      const payload = {
        nom,
        description,
        annee,
        clientFinalId: clientFinalId || null,
        donnees,
      };
      if (editingId) {
        await apiClient.comptabilite.previsionnels.update(editingId, payload);
        setSuccessMsg('Prévisionnel sauvegardé');
      } else {
        await apiClient.comptabilite.previsionnels.create(payload);
        setSuccessMsg('Prévisionnel créé');
      }
      setTimeout(() => setSuccessMsg(null), 3000);
      setEditMode(false);
      await fetchPrevisionnels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getClientLabel = (c: ClientOption) => c.raisonSociale || `${c.prenom || ''} ${c.nom || ''}`.trim();

  // ============================================================
  // RENDU — VUE LISTE
  // ============================================================

  const SectionHeader = ({ id, title, color = 'text-indigo-400' }: { id: string; title: string; color?: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between py-3 px-4 bg-gray-800 rounded-t-lg hover:bg-gray-700/50 transition"
    >
      <h2 className={`text-lg font-bold ${color}`}>{title}</h2>
      {expandedSections.has(id) ? <ChevronUpIcon className="h-5 w-5 text-gray-500" /> : <ChevronDownIcon className="h-5 w-5 text-gray-500" />}
    </button>
  );

  if (!editMode) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="h-8 w-8 text-indigo-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Prévisionnels Financiers</h1>
              <p className="mt-1 text-sm text-gray-400">Créez des prévisionnels pour vos clients ou votre entreprise</p>
            </div>
          </div>
          <button onClick={handleNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition">
            <PlusIcon className="h-5 w-5" />
            Nouveau prévisionnel
          </button>
        </div>

        {error && <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded">{error}</div>}
        {successMsg && <div className="mb-4 bg-green-900/20 border border-green-700/30 text-green-300 px-4 py-3 rounded">{successMsg}</div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : previsionnels.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
            <ChartBarIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Aucun prévisionnel</p>
            <p className="text-gray-500 text-sm mt-2">Créez votre premier prévisionnel pour un client ou pour votre entreprise</p>
            <button onClick={handleNew} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md transition">
              Créer un prévisionnel
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {previsionnels.map((prev) => (
              <div key={prev.id} className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-indigo-600/50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => handleOpen(prev)}>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{prev.nom}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        prev.statut === 'valide' ? 'bg-green-600/20 text-green-400' :
                        prev.statut === 'archive' ? 'bg-gray-600/20 text-gray-400' :
                        'bg-amber-600/20 text-amber-400'
                      }`}>
                        {prev.statut}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                      {prev.clientLabel && <span className="text-indigo-300">Client : {prev.clientLabel}</span>}
                      <span>Année {prev.annee}</span>
                      <span>Modifié le {new Date(prev.updatedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpen(prev)} className="text-indigo-400 hover:text-indigo-300" title="Modifier">
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDuplicate(prev)} className="text-gray-400 hover:text-white" title="Dupliquer">
                      <DocumentDuplicateIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(prev.id)} className="text-red-400 hover:text-red-300" title="Supprimer">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                  <div className="bg-gray-900 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">CA Annuel</p>
                    <p className="text-sm font-bold text-green-400">{formatEUR(prev.caAnnuel)}</p>
                  </div>
                  <div className="bg-gray-900 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Charges</p>
                    <p className="text-sm font-bold text-red-400">{formatEUR(prev.chargesAnnuelles)}</p>
                  </div>
                  <div className="bg-gray-900 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Résultat</p>
                    <p className={`text-sm font-bold ${prev.resultatExploitation >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatEUR(prev.resultatExploitation)}
                    </p>
                  </div>
                  <div className="bg-gray-900 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Seuil rentabilité</p>
                    <p className="text-sm font-bold text-amber-400">{formatEUR(prev.seuilRentabilite)}</p>
                  </div>
                  <div className="bg-gray-900 rounded p-2 text-center">
                    <p className="text-xs text-gray-500">Trésorerie</p>
                    <p className={`text-sm font-bold ${prev.tresorerieFinale >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {formatEUR(prev.tresorerieFinale)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDU — VUE ÉDITION
  // ============================================================

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12">
      {/* Header édition */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setEditMode(false)} className="text-gray-400 hover:text-white text-sm">&larr; Retour</button>
          <ChartBarIcon className="h-8 w-8 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">{editingId ? 'Modifier' : 'Nouveau'} prévisionnel</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setEditMode(false)} className="text-gray-400 hover:text-white px-4 py-2">Annuler</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-md transition"
          >
            <ArrowPathIcon className={`h-5 w-5 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 bg-red-900/20 border border-red-700/30 text-red-300 px-4 py-3 rounded">{error}</div>}
      {successMsg && <div className="mb-4 bg-green-900/20 border border-green-700/30 text-green-300 px-4 py-3 rounded">{successMsg}</div>}

      {/* Métadonnées */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nom du prévisionnel</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Client (optionnel)</label>
            <select value={clientFinalId} onChange={(e) => setClientFinalId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— Interne (pas de client) —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{getClientLabel(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Année</label>
            <select value={annee} onChange={(e) => setAnnee(parseInt(e.target.value))}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {[2025, 2026, 2027, 2028, 2029].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes..."
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase">CA Annuel HT</p>
          <p className="text-xl font-bold text-white mt-1">{formatEUR(caAnnuel)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase">Charges Totales</p>
          <p className="text-xl font-bold text-red-400 mt-1">{formatEUR(chargesAnnuelles)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase">Résultat Net</p>
          <p className={`text-xl font-bold mt-1 ${resultatExploitationAnnuel >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatEUR(resultatExploitationAnnuel)}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase">Seuil de rentabilité</p>
          <p className="text-xl font-bold text-amber-400 mt-1">{formatEUR(seuilRentabilite)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase">Point mort</p>
          <p className="text-xl font-bold text-indigo-400 mt-1">{pointMort ? `Mois ${pointMort}` : 'Non atteint'}</p>
        </div>
      </div>

      {/* CHIFFRE D'AFFAIRES */}
      <div className="mb-6">
        <SectionHeader id="ca" title={`Chiffre d'affaires HT — ${formatEUR(caAnnuel)}`} color="text-green-400" />
        {expandedSections.has('ca') && (
          <div className="bg-gray-800 border border-gray-700 border-t-0 rounded-b-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700/50">
                  <th className="px-3 py-2 text-left text-xs text-gray-400 min-w-[200px]">Source</th>
                  {moisCourts.map(m => <th key={m} className="px-2 py-2 text-right text-xs text-gray-400 min-w-[80px]">{m}</th>)}
                  <th className="px-3 py-2 text-right text-xs text-gray-400 font-bold">Total</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lignesCA.map(ligne => (
                  <tr key={ligne.id} className="border-t border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-3 py-1">
                      <input value={ligne.libelle}
                        onChange={(e) => setLignesCA(prev => prev.map(l => l.id === ligne.id ? { ...l, libelle: e.target.value } : l))}
                        className="bg-transparent text-white w-full focus:outline-none" />
                    </td>
                    {ligne.montantsMensuels.map((val, i) => (
                      <td key={i} className="px-1 py-1">
                        <input type="number" value={val}
                          onChange={(e) => updateLigneCA(ligne.id, i, parseFloat(e.target.value) || 0)}
                          onDoubleClick={() => fillAllMonths(ligne.id, val, 'ca')}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-white text-xs focus:outline-none focus:border-green-500" />
                      </td>
                    ))}
                    <td className="px-3 py-1 text-right text-green-400 font-medium">{formatEUR(ligne.montantsMensuels.reduce((s, v) => s + v, 0))}</td>
                    <td className="px-2 py-1">
                      <button onClick={() => setLignesCA(prev => prev.filter(l => l.id !== ligne.id))} className="text-red-500 hover:text-red-400">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-green-800 bg-green-900/10 font-bold">
                  <td className="px-3 py-2 text-green-400">TOTAL CA HT</td>
                  {caMensuels.map((v, i) => <td key={i} className="px-2 py-2 text-right text-green-400">{formatEUR(v)}</td>)}
                  <td className="px-3 py-2 text-right text-green-300 text-base">{formatEUR(caAnnuel)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            <div className="px-4 py-2">
              <button onClick={() => setLignesCA(prev => [...prev, { id: newId(), libelle: 'Nouvelle source', montantsMensuels: zeroMois() }])}
                className="text-xs text-green-500 hover:text-green-400 flex items-center gap-1">
                <PlusIcon className="h-4 w-4" /> Ajouter une source de CA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CHARGES */}
      <div className="mb-6">
        <SectionHeader id="charges" title={`Charges d'exploitation — ${formatEUR(chargesAnnuelles)}`} color="text-red-400" />
        {expandedSections.has('charges') && (
          <div className="bg-gray-800 border border-gray-700 border-t-0 rounded-b-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700/50">
                  <th className="px-3 py-2 text-left text-xs text-gray-400 min-w-[200px]">Poste</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-400 min-w-[100px]">Catégorie</th>
                  {moisCourts.map(m => <th key={m} className="px-2 py-2 text-right text-xs text-gray-400 min-w-[80px]">{m}</th>)}
                  <th className="px-3 py-2 text-right text-xs text-gray-400 font-bold">Total</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {(['fixe', 'variable', 'personnel'] as const).map(cat => (
                  <Fragment key={`cat-${cat}`}>
                    <tr className="bg-gray-700/20">
                      <td colSpan={15} className="px-3 py-1.5 text-xs font-semibold text-indigo-300 uppercase">
                        {categorieChargeLabels[cat]}
                      </td>
                    </tr>
                    {lignesCharges.filter(l => l.categorie === cat).map(ligne => (
                      <tr key={ligne.id} className="border-t border-gray-700/30 hover:bg-gray-700/30">
                        <td className="px-3 py-1">
                          <input value={ligne.libelle}
                            onChange={(e) => setLignesCharges(prev => prev.map(l => l.id === ligne.id ? { ...l, libelle: e.target.value } : l))}
                            className="bg-transparent text-white w-full focus:outline-none text-xs" />
                        </td>
                        <td className="px-2 py-1">
                          <select value={ligne.categorie}
                            onChange={(e) => setLignesCharges(prev => prev.map(l => l.id === ligne.id ? { ...l, categorie: e.target.value as LigneCharge['categorie'] } : l))}
                            className="bg-gray-900 text-white text-xs border border-gray-700 rounded px-1 py-1 focus:outline-none">
                            <option value="fixe">Fixe</option>
                            <option value="variable">Variable</option>
                            <option value="personnel">Personnel</option>
                          </select>
                        </td>
                        {ligne.montantsMensuels.map((val, i) => (
                          <td key={i} className="px-1 py-1">
                            <input type="number" value={val}
                              onChange={(e) => updateLigneCharge(ligne.id, i, parseFloat(e.target.value) || 0)}
                              onDoubleClick={() => fillAllMonths(ligne.id, val, 'charge')}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-white text-xs focus:outline-none focus:border-red-500" />
                          </td>
                        ))}
                        <td className="px-3 py-1 text-right text-red-400 font-medium text-xs">{formatEUR(ligne.montantsMensuels.reduce((s, v) => s + v, 0))}</td>
                        <td className="px-2 py-1">
                          <button onClick={() => setLignesCharges(prev => prev.filter(l => l.id !== ligne.id))} className="text-red-500 hover:text-red-400">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr className="border-t-2 border-red-800 bg-red-900/10 font-bold">
                  <td className="px-3 py-2 text-red-400" colSpan={2}>TOTAL CHARGES</td>
                  {chargesTotalesMensuelles.map((v, i) => <td key={i} className="px-2 py-2 text-right text-red-400 text-xs">{formatEUR(v)}</td>)}
                  <td className="px-3 py-2 text-right text-red-300 text-base">{formatEUR(chargesAnnuelles)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            <div className="px-4 py-2 flex gap-4">
              <button onClick={() => setLignesCharges(prev => [...prev, { id: newId(), libelle: 'Nouvelle charge', categorie: 'fixe', montantsMensuels: zeroMois() }])}
                className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
                <PlusIcon className="h-4 w-4" /> Charge fixe
              </button>
              <button onClick={() => setLignesCharges(prev => [...prev, { id: newId(), libelle: 'Nouvelle charge', categorie: 'variable', montantsMensuels: zeroMois() }])}
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
                <PlusIcon className="h-4 w-4" /> Charge variable
              </button>
              <button onClick={() => setLignesCharges(prev => [...prev, { id: newId(), libelle: 'Nouvelle charge', categorie: 'personnel', montantsMensuels: zeroMois() }])}
                className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1">
                <PlusIcon className="h-4 w-4" /> Personnel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COMPTE DE RÉSULTAT */}
      <div className="mb-6">
        <SectionHeader id="resultat" title={`Compte de résultat — ${formatEUR(resultatExploitationAnnuel)}`} color={resultatExploitationAnnuel >= 0 ? 'text-green-400' : 'text-red-400'} />
        {expandedSections.has('resultat') && (
          <div className="bg-gray-800 border border-gray-700 border-t-0 rounded-b-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700/50">
                  <th className="px-3 py-2 text-left text-xs text-gray-400 min-w-[200px]">Poste</th>
                  {moisCourts.map(m => <th key={m} className="px-2 py-2 text-right text-xs text-gray-400">{m}</th>)}
                  <th className="px-3 py-2 text-right text-xs text-gray-400 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-900/10">
                  <td className="px-3 py-2 text-green-400 font-medium">Chiffre d&apos;affaires HT</td>
                  {caMensuels.map((v, i) => <td key={i} className="px-2 py-2 text-right text-green-400 text-xs">{formatEUR(v)}</td>)}
                  <td className="px-3 py-2 text-right text-green-300 font-bold">{formatEUR(caAnnuel)}</td>
                </tr>
                <tr className="bg-red-900/10">
                  <td className="px-3 py-2 text-red-400 font-medium">Charges d&apos;exploitation</td>
                  {chargesTotalesMensuelles.map((v, i) => <td key={i} className="px-2 py-2 text-right text-red-400 text-xs">-{formatEUR(v)}</td>)}
                  <td className="px-3 py-2 text-right text-red-300 font-bold">-{formatEUR(chargesAnnuelles)}</td>
                </tr>
                <tr className="bg-gray-700/20">
                  <td className="px-3 py-2 text-gray-300 font-medium">Amortissements</td>
                  {amortissementsMensuels.map((v, i) => <td key={i} className="px-2 py-2 text-right text-gray-400 text-xs">-{formatEUR(v)}</td>)}
                  <td className="px-3 py-2 text-right text-gray-300 font-bold">-{formatEUR(amortissementsMensuels.reduce((s, v) => s + v, 0))}</td>
                </tr>
                <tr className="border-t-2 border-indigo-700 font-bold text-base">
                  <td className={`px-3 py-3 ${resultatExploitationAnnuel >= 0 ? 'text-green-300' : 'text-red-300'}`}>RÉSULTAT D&apos;EXPLOITATION</td>
                  {resultatExploitationMensuel.map((v, i) => (
                    <td key={i} className={`px-2 py-3 text-right text-xs ${v >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatEUR(v)}</td>
                  ))}
                  <td className={`px-3 py-3 text-right ${resultatExploitationAnnuel >= 0 ? 'text-green-300' : 'text-red-300'}`}>{formatEUR(resultatExploitationAnnuel)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TRÉSORERIE */}
      <div className="mb-6">
        <SectionHeader id="tresorerie" title="Plan de trésorerie" color="text-blue-400" />
        {expandedSections.has('tresorerie') && (
          <div className="bg-gray-800 border border-gray-700 border-t-0 rounded-b-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700/50">
                  <th className="px-3 py-2 text-left text-xs text-gray-400 min-w-[200px]">Poste</th>
                  {moisCourts.map(m => <th key={m} className="px-2 py-2 text-right text-xs text-gray-400">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-900/10">
                  <td className="px-3 py-2 text-green-400">Encaissements TTC</td>
                  {caMensuels.map((v, i) => <td key={i} className="px-2 py-2 text-right text-green-400 text-xs">{formatEUR(Math.round(v * 1.2))}</td>)}
                </tr>
                <tr className="bg-red-900/10">
                  <td className="px-3 py-2 text-red-400">Décaissements</td>
                  {chargesTotalesMensuelles.map((v, i) => <td key={i} className="px-2 py-2 text-right text-red-400 text-xs">-{formatEUR(Math.round(v * 1.12))}</td>)}
                </tr>
                <tr className="bg-amber-900/10">
                  <td className="px-3 py-2 text-amber-400">TVA à payer</td>
                  {tvaMensuelle.map((v, i) => <td key={i} className="px-2 py-2 text-right text-amber-400 text-xs">{formatEUR(v.aPayer)}</td>)}
                </tr>
                <tr className="bg-gray-700/20">
                  <td className="px-3 py-2 text-gray-300">Remboursement emprunts</td>
                  {zeroMois().map((_, i) => <td key={i} className="px-2 py-2 text-right text-gray-400 text-xs">-{formatEUR(remboursementsMensuels)}</td>)}
                </tr>
                <tr className="border-t-2 border-blue-700 font-bold">
                  <td className="px-3 py-3 text-blue-300">SOLDE DE TRÉSORERIE</td>
                  {tresorerieMensuelle.map((v, i) => (
                    <td key={i} className={`px-2 py-3 text-right text-xs font-bold ${v >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{formatEUR(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INVESTISSEMENTS & FINANCEMENTS */}
      <div className="mb-6">
        <SectionHeader id="investissement" title="Investissements & Financements" color="text-purple-400" />
        {expandedSections.has('investissement') && (
          <div className="bg-gray-800 border border-gray-700 border-t-0 rounded-b-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Investissements */}
              <div>
                <h3 className="text-sm font-semibold text-purple-300 uppercase mb-3">Investissements</h3>
                <div className="space-y-3">
                  {lignesInvestissement.map(inv => (
                    <div key={inv.id} className="bg-gray-900 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <input value={inv.libelle}
                          onChange={(e) => setLignesInvestissement(prev => prev.map(i => i.id === inv.id ? { ...i, libelle: e.target.value } : i))}
                          className="bg-transparent text-white text-sm focus:outline-none flex-1" />
                        <button onClick={() => setLignesInvestissement(prev => prev.filter(i => i.id !== inv.id))} className="text-red-500">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-gray-500">Montant HT</label>
                          <input type="number" value={inv.montantHT}
                            onChange={(e) => setLignesInvestissement(prev => prev.map(i => i.id === inv.id ? { ...i, montantHT: parseFloat(e.target.value) || 0 } : i))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" />
                        </div>
                        <div>
                          <label className="text-gray-500">Amort. (ans)</label>
                          <input type="number" value={inv.dureeAmortissement}
                            onChange={(e) => setLignesInvestissement(prev => prev.map(i => i.id === inv.id ? { ...i, dureeAmortissement: parseInt(e.target.value) || 1 } : i))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" />
                        </div>
                        <div>
                          <label className="text-gray-500">Mois achat</label>
                          <select value={inv.moisAcquisition}
                            onChange={(e) => setLignesInvestissement(prev => prev.map(i => i.id === inv.id ? { ...i, moisAcquisition: parseInt(e.target.value) } : i))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white">
                            {moisComplets.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setLignesInvestissement(prev => [...prev, { id: newId(), libelle: 'Nouvel investissement', montantHT: 0, tva: 20, dureeAmortissement: 3, moisAcquisition: 0 }])}
                    className="text-xs text-purple-500 hover:text-purple-400 flex items-center gap-1">
                    <PlusIcon className="h-4 w-4" /> Ajouter
                  </button>
                </div>
              </div>
              {/* Financements */}
              <div>
                <h3 className="text-sm font-semibold text-blue-300 uppercase mb-3">Financements</h3>
                <div className="space-y-3">
                  {lignesFinancement.map(fin => (
                    <div key={fin.id} className="bg-gray-900 rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <input value={fin.libelle}
                          onChange={(e) => setLignesFinancement(prev => prev.map(f => f.id === fin.id ? { ...f, libelle: e.target.value } : f))}
                          className="bg-transparent text-white text-sm focus:outline-none flex-1" />
                        <button onClick={() => setLignesFinancement(prev => prev.filter(f => f.id !== fin.id))} className="text-red-500">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-gray-500">Type</label>
                          <select value={fin.type}
                            onChange={(e) => setLignesFinancement(prev => prev.map(f => f.id === fin.id ? { ...f, type: e.target.value as LigneFinancement['type'] } : f))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white">
                            <option value="apport">Apport</option>
                            <option value="emprunt">Emprunt</option>
                            <option value="subvention">Subvention</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-gray-500">Montant</label>
                          <input type="number" value={fin.montant}
                            onChange={(e) => setLignesFinancement(prev => prev.map(f => f.id === fin.id ? { ...f, montant: parseFloat(e.target.value) || 0 } : f))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" />
                        </div>
                        <div>
                          <label className="text-gray-500">Taux (%)</label>
                          <input type="number" step="0.1" value={fin.tauxInteret}
                            onChange={(e) => setLignesFinancement(prev => prev.map(f => f.id === fin.id ? { ...f, tauxInteret: parseFloat(e.target.value) || 0 } : f))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" />
                        </div>
                        <div>
                          <label className="text-gray-500">Durée (mois)</label>
                          <input type="number" value={fin.dureeMois}
                            onChange={(e) => setLignesFinancement(prev => prev.map(f => f.id === fin.id ? { ...f, dureeMois: parseInt(e.target.value) || 0 } : f))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setLignesFinancement(prev => [...prev, { id: newId(), libelle: 'Nouveau financement', type: 'emprunt', montant: 0, tauxInteret: 0, dureeMois: 0 }])}
                    className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1">
                    <PlusIcon className="h-4 w-4" /> Ajouter
                  </button>
                </div>
              </div>
            </div>
            {/* Résumé */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-xs text-gray-400">Total Investissements</p>
                <p className="text-lg font-bold text-purple-400">{formatEUR(lignesInvestissement.reduce((s, i) => s + i.montantHT, 0))}</p>
              </div>
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-xs text-gray-400">Total Financements</p>
                <p className="text-lg font-bold text-blue-400">{formatEUR(lignesFinancement.reduce((s, f) => s + f.montant, 0))}</p>
              </div>
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-xs text-gray-400">Remboursement mensuel</p>
                <p className="text-lg font-bold text-amber-400">{formatEUR(remboursementsMensuels)}/mois</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-600 mt-4">
        Astuce : double-cliquez sur une cellule pour remplir tous les mois avec la même valeur
      </div>
    </div>
  );
}

