'use client';

import { useState, useMemo } from 'react';
import {
  ChartBarIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

// ============================================================
// TYPES
// ============================================================

interface LigneCA {
  id: string;
  libelle: string;
  montantsMensuels: number[]; // 12 mois
}

interface LigneCharge {
  id: string;
  libelle: string;
  categorie: 'fixe' | 'variable' | 'personnel' | 'investissement';
  montantsMensuels: number[]; // 12 mois
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
  dureeAmortissement: number; // en années
  moisAcquisition: number;   // 0-11
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
  investissement: 'Amortissements',
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function PrevisionnelPage(): JSX.Element {
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());
  const [nomProjet, setNomProjet] = useState<string>('Prévisionnel TalosPrimes');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['ca', 'charges', 'financement', 'investissement', 'resultat', 'tresorerie', 'bfr'])
  );

  // ============================================================
  // DONNÉES
  // ============================================================

  // Chiffre d'affaires
  const [lignesCA, setLignesCA] = useState<LigneCA[]>([
    { id: newId(), libelle: 'Abonnements SaaS', montantsMensuels: [5000, 6000, 7500, 8000, 9000, 10000, 11000, 12000, 13500, 15000, 16500, 18000] },
    { id: newId(), libelle: 'Prestations / Setup', montantsMensuels: [2000, 1500, 3000, 2000, 2500, 3500, 2000, 3000, 4000, 3000, 3500, 5000] },
  ]);

  // Charges
  const [lignesCharges, setLignesCharges] = useState<LigneCharge[]>([
    { id: newId(), libelle: 'Hébergement & Infra (serveurs, domaines)', categorie: 'fixe', montantsMensuels: Array(12).fill(500) },
    { id: newId(), libelle: 'Logiciels & SaaS (outils, licences)', categorie: 'fixe', montantsMensuels: Array(12).fill(300) },
    { id: newId(), libelle: 'Assurances', categorie: 'fixe', montantsMensuels: Array(12).fill(150) },
    { id: newId(), libelle: 'Comptabilité / Expert-comptable', categorie: 'fixe', montantsMensuels: Array(12).fill(400) },
    { id: newId(), libelle: 'Marketing & Publicité', categorie: 'variable', montantsMensuels: [800, 800, 1000, 1000, 1200, 1200, 1500, 1500, 1800, 1800, 2000, 2000] },
    { id: newId(), libelle: 'Frais bancaires & commissions', categorie: 'variable', montantsMensuels: Array(12).fill(100) },
    { id: newId(), libelle: 'Salaires bruts', categorie: 'personnel', montantsMensuels: Array(12).fill(4500) },
    { id: newId(), libelle: 'Charges sociales (~45%)', categorie: 'personnel', montantsMensuels: Array(12).fill(2025) },
    { id: newId(), libelle: 'Rémunération dirigeant', categorie: 'personnel', montantsMensuels: Array(12).fill(3000) },
  ]);

  // Financements
  const [lignesFinancement, setLignesFinancement] = useState<LigneFinancement[]>([
    { id: newId(), libelle: 'Apport en capital', type: 'apport', montant: 10000, tauxInteret: 0, dureeMois: 0 },
    { id: newId(), libelle: 'Prêt bancaire', type: 'emprunt', montant: 30000, tauxInteret: 4.5, dureeMois: 60 },
  ]);

  // Investissements
  const [lignesInvestissement, setLignesInvestissement] = useState<LigneInvestissement[]>([
    { id: newId(), libelle: 'Matériel informatique', montantHT: 5000, tva: 20, dureeAmortissement: 3, moisAcquisition: 0 },
    { id: newId(), libelle: 'Développement logiciel (immobilisation)', montantHT: 15000, tva: 20, dureeAmortissement: 5, moisAcquisition: 0 },
  ]);

  // TVA
  const [tauxTVA] = useState<number>(20);

  // ============================================================
  // CALCULS
  // ============================================================

  // CA mensuel et annuel
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

  // Amortissements mensuels
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

  // Remboursements d'emprunt mensuels
  const remboursementsMensuels = useMemo(() => {
    let total = 0;
    lignesFinancement.filter(f => f.type === 'emprunt').forEach(f => {
      if (f.dureeMois > 0) {
        total += f.montant / f.dureeMois; // Capital
        total += (f.montant * (f.tauxInteret / 100)) / 12; // Intérêts (simplifié)
      }
    });
    return Math.round(total);
  }, [lignesFinancement]);

  // Résultat d'exploitation mensuel
  const resultatExploitationMensuel = useMemo(() => {
    return caMensuels.map((ca, i) => ca - chargesTotalesMensuelles[i] - amortissementsMensuels[i]);
  }, [caMensuels, chargesTotalesMensuelles, amortissementsMensuels]);

  const resultatExploitationAnnuel = useMemo(() =>
    resultatExploitationMensuel.reduce((s, v) => s + v, 0), [resultatExploitationMensuel]);

  // TVA collectée / déductible / à payer
  const tvaMensuelle = useMemo(() => {
    return caMensuels.map((ca, i) => {
      const collectee = Math.round(ca * tauxTVA / 100);
      const deductible = Math.round(chargesTotalesMensuelles[i] * tauxTVA / 100 * 0.6); // ~60% des charges soumises à TVA
      return { collectee, deductible, aPayer: collectee - deductible };
    });
  }, [caMensuels, chargesTotalesMensuelles, tauxTVA]);

  // Trésorerie
  const tresorerieMensuelle = useMemo(() => {
    const tresorerie: number[] = [];
    // Solde initial = apports + emprunts - investissements TTC
    let solde = lignesFinancement.reduce((s, f) => s + f.montant, 0)
      - lignesInvestissement.reduce((s, inv) => s + inv.montantHT * (1 + inv.tva / 100), 0);

    for (let i = 0; i < 12; i++) {
      const encaissements = caMensuels[i] * (1 + tauxTVA / 100); // TTC
      const decaissements = chargesTotalesMensuelles[i] * (1 + tauxTVA / 100 * 0.6);
      const tvaAPayer = i > 0 ? tvaMensuelle[i - 1].aPayer : 0; // Décalé d'un mois
      const remboursement = remboursementsMensuels;

      solde += encaissements - decaissements - tvaAPayer - remboursement;
      tresorerie.push(Math.round(solde));
    }
    return tresorerie;
  }, [caMensuels, chargesTotalesMensuelles, tvaMensuelle, remboursementsMensuels, lignesFinancement, lignesInvestissement, tauxTVA]);

  // Seuil de rentabilité
  const seuilRentabilite = useMemo(() => {
    const chargesFixes = lignesCharges
      .filter(l => l.categorie === 'fixe' || l.categorie === 'personnel')
      .reduce((s, l) => s + l.montantsMensuels.reduce((a, b) => a + b, 0), 0);
    const chargesVariables = lignesCharges
      .filter(l => l.categorie === 'variable')
      .reduce((s, l) => s + l.montantsMensuels.reduce((a, b) => a + b, 0), 0);
    const tauxMargeVariable = caAnnuel > 0 ? (caAnnuel - chargesVariables) / caAnnuel : 0;
    return tauxMargeVariable > 0 ? Math.round(chargesFixes / tauxMargeVariable) : 0;
  }, [lignesCharges, caAnnuel]);

  // Point mort en mois
  const pointMort = useMemo(() => {
    let cumul = 0;
    for (let i = 0; i < 12; i++) {
      cumul += resultatExploitationMensuel[i];
      if (cumul > 0) return i + 1;
    }
    return null; // Pas atteint dans l'année
  }, [resultatExploitationMensuel]);

  // ============================================================
  // HANDLERS CRUD
  // ============================================================

  const addLigneCA = () => setLignesCA([...lignesCA, { id: newId(), libelle: 'Nouvelle source de CA', montantsMensuels: zeroMois() }]);
  const removeLigneCA = (id: string) => setLignesCA(lignesCA.filter(l => l.id !== id));
  const updateLigneCA = (id: string, mois: number, val: number) => {
    setLignesCA(lignesCA.map(l => l.id === id ? { ...l, montantsMensuels: l.montantsMensuels.map((v, i) => i === mois ? val : v) } : l));
  };

  const addLigneCharge = (categorie: LigneCharge['categorie'] = 'fixe') =>
    setLignesCharges([...lignesCharges, { id: newId(), libelle: 'Nouvelle charge', categorie, montantsMensuels: zeroMois() }]);
  const removeLigneCharge = (id: string) => setLignesCharges(lignesCharges.filter(l => l.id !== id));
  const updateLigneCharge = (id: string, mois: number, val: number) => {
    setLignesCharges(lignesCharges.map(l => l.id === id ? { ...l, montantsMensuels: l.montantsMensuels.map((v, i) => i === mois ? val : v) } : l));
  };
  const fillAllMonths = (id: string, val: number, type: 'ca' | 'charge') => {
    if (type === 'ca') {
      setLignesCA(lignesCA.map(l => l.id === id ? { ...l, montantsMensuels: Array(12).fill(val) } : l));
    } else {
      setLignesCharges(lignesCharges.map(l => l.id === id ? { ...l, montantsMensuels: Array(12).fill(val) } : l));
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  };

  // ============================================================
  // RENDU
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-8 w-8 text-indigo-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Prévisionnel Financier</h1>
            <p className="mt-1 text-sm text-gray-400">Business plan et projections sur 12 mois</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={nomProjet}
            onChange={(e) => setNomProjet(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={annee}
            onChange={(e) => setAnnee(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-md text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
          <p className="text-xl font-bold text-indigo-400 mt-1">
            {pointMort ? `Mois ${pointMort}` : 'Non atteint'}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CHIFFRE D'AFFAIRES                                           */}
      {/* ============================================================ */}
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
                      <input
                        value={ligne.libelle}
                        onChange={(e) => setLignesCA(lignesCA.map(l => l.id === ligne.id ? { ...l, libelle: e.target.value } : l))}
                        className="bg-transparent text-white w-full focus:outline-none"
                      />
                    </td>
                    {ligne.montantsMensuels.map((val, i) => (
                      <td key={i} className="px-1 py-1">
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => updateLigneCA(ligne.id, i, parseFloat(e.target.value) || 0)}
                          onDoubleClick={() => fillAllMonths(ligne.id, val, 'ca')}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-white text-xs focus:outline-none focus:border-green-500"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1 text-right text-green-400 font-medium">
                      {formatEUR(ligne.montantsMensuels.reduce((s, v) => s + v, 0))}
                    </td>
                    <td className="px-2 py-1">
                      <button onClick={() => removeLigneCA(ligne.id)} className="text-red-500 hover:text-red-400">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Total CA */}
                <tr className="border-t-2 border-green-800 bg-green-900/10 font-bold">
                  <td className="px-3 py-2 text-green-400">TOTAL CA HT</td>
                  {caMensuels.map((v, i) => (
                    <td key={i} className="px-2 py-2 text-right text-green-400">{formatEUR(v)}</td>
                  ))}
                  <td className="px-3 py-2 text-right text-green-300 text-base">{formatEUR(caAnnuel)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            <div className="px-4 py-2">
              <button onClick={addLigneCA} className="text-xs text-green-500 hover:text-green-400 flex items-center gap-1">
                <PlusIcon className="h-4 w-4" /> Ajouter une source de CA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* CHARGES                                                       */}
      {/* ============================================================ */}
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
                {['fixe', 'variable', 'personnel'].map(cat => (
                  <>
                    <tr key={`cat-${cat}`} className="bg-gray-700/20">
                      <td colSpan={15} className="px-3 py-1.5 text-xs font-semibold text-indigo-300 uppercase">
                        {categorieChargeLabels[cat]}
                      </td>
                    </tr>
                    {lignesCharges.filter(l => l.categorie === cat).map(ligne => (
                      <tr key={ligne.id} className="border-t border-gray-700/30 hover:bg-gray-700/30">
                        <td className="px-3 py-1">
                          <input
                            value={ligne.libelle}
                            onChange={(e) => setLignesCharges(lignesCharges.map(l => l.id === ligne.id ? { ...l, libelle: e.target.value } : l))}
                            className="bg-transparent text-white w-full focus:outline-none text-xs"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={ligne.categorie}
                            onChange={(e) => setLignesCharges(lignesCharges.map(l => l.id === ligne.id ? { ...l, categorie: e.target.value as LigneCharge['categorie'] } : l))}
                            className="bg-gray-900 text-white text-xs border border-gray-700 rounded px-1 py-1 focus:outline-none"
                          >
                            <option value="fixe">Fixe</option>
                            <option value="variable">Variable</option>
                            <option value="personnel">Personnel</option>
                          </select>
                        </td>
                        {ligne.montantsMensuels.map((val, i) => (
                          <td key={i} className="px-1 py-1">
                            <input
                              type="number"
                              value={val}
                              onChange={(e) => updateLigneCharge(ligne.id, i, parseFloat(e.target.value) || 0)}
                              onDoubleClick={() => fillAllMonths(ligne.id, val, 'charge')}
                              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-white text-xs focus:outline-none focus:border-red-500"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-1 text-right text-red-400 font-medium text-xs">
                          {formatEUR(ligne.montantsMensuels.reduce((s, v) => s + v, 0))}
                        </td>
                        <td className="px-2 py-1">
                          <button onClick={() => removeLigneCharge(ligne.id)} className="text-red-500 hover:text-red-400">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
                {/* Total Charges */}
                <tr className="border-t-2 border-red-800 bg-red-900/10 font-bold">
                  <td className="px-3 py-2 text-red-400" colSpan={2}>TOTAL CHARGES</td>
                  {chargesTotalesMensuelles.map((v, i) => (
                    <td key={i} className="px-2 py-2 text-right text-red-400 text-xs">{formatEUR(v)}</td>
                  ))}
                  <td className="px-3 py-2 text-right text-red-300 text-base">{formatEUR(chargesAnnuelles)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
            <div className="px-4 py-2 flex gap-4">
              <button onClick={() => addLigneCharge('fixe')} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
                <PlusIcon className="h-4 w-4" /> Charge fixe
              </button>
              <button onClick={() => addLigneCharge('variable')} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
                <PlusIcon className="h-4 w-4" /> Charge variable
              </button>
              <button onClick={() => addLigneCharge('personnel')} className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1">
                <PlusIcon className="h-4 w-4" /> Personnel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* COMPTE DE RÉSULTAT                                            */}
      {/* ============================================================ */}
      <div className="mb-6">
        <SectionHeader id="resultat" title={`Compte de résultat prévisionnel — ${formatEUR(resultatExploitationAnnuel)}`} color={resultatExploitationAnnuel >= 0 ? 'text-green-400' : 'text-red-400'} />
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
                  <td className={`px-3 py-3 ${resultatExploitationAnnuel >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    RÉSULTAT D&apos;EXPLOITATION
                  </td>
                  {resultatExploitationMensuel.map((v, i) => (
                    <td key={i} className={`px-2 py-3 text-right text-xs ${v >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatEUR(v)}
                    </td>
                  ))}
                  <td className={`px-3 py-3 text-right ${resultatExploitationAnnuel >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {formatEUR(resultatExploitationAnnuel)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* PLAN DE TRÉSORERIE                                            */}
      {/* ============================================================ */}
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
                    <td key={i} className={`px-2 py-3 text-right text-xs font-bold ${v >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {formatEUR(v)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* INVESTISSEMENTS & FINANCEMENTS                                */}
      {/* ============================================================ */}
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
                        <input
                          value={inv.libelle}
                          onChange={(e) => setLignesInvestissement(prev => prev.map(i => i.id === inv.id ? { ...i, libelle: e.target.value } : i))}
                          className="bg-transparent text-white text-sm focus:outline-none flex-1"
                        />
                        <button onClick={() => setLignesInvestissement(prev => prev.filter(i => i.id !== inv.id))} className="text-red-500">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-gray-500">Montant HT</label>
                          <input
                            type="number"
                            value={inv.montantHT}
                            onChange={(e) => setLignesInvestissement(prev => prev.map(i => i.id === inv.id ? { ...i, montantHT: parseFloat(e.target.value) || 0 } : i))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500">Amort. (ans)</label>
                          <input
                            type="number"
                            value={inv.dureeAmortissement}
                            onChange={(e) => setLignesInvestissement(prev => prev.map(i => i.id === inv.id ? { ...i, dureeAmortissement: parseInt(e.target.value) || 1 } : i))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500">Mois achat</label>
                          <select
                            value={inv.moisAcquisition}
                            onChange={(e) => setLignesInvestissement(prev => prev.map(i => i.id === inv.id ? { ...i, moisAcquisition: parseInt(e.target.value) } : i))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                          >
                            {moisComplets.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setLignesInvestissement([...lignesInvestissement, { id: newId(), libelle: 'Nouvel investissement', montantHT: 0, tva: 20, dureeAmortissement: 3, moisAcquisition: 0 }])}
                    className="text-xs text-purple-500 hover:text-purple-400 flex items-center gap-1"
                  >
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
                        <input
                          value={fin.libelle}
                          onChange={(e) => setLignesFinancement(prev => prev.map(f => f.id === fin.id ? { ...f, libelle: e.target.value } : f))}
                          className="bg-transparent text-white text-sm focus:outline-none flex-1"
                        />
                        <button onClick={() => setLignesFinancement(prev => prev.filter(f => f.id !== fin.id))} className="text-red-500">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-gray-500">Type</label>
                          <select
                            value={fin.type}
                            onChange={(e) => setLignesFinancement(prev => prev.map(f => f.id === fin.id ? { ...f, type: e.target.value as LigneFinancement['type'] } : f))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                          >
                            <option value="apport">Apport</option>
                            <option value="emprunt">Emprunt</option>
                            <option value="subvention">Subvention</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-gray-500">Montant</label>
                          <input
                            type="number"
                            value={fin.montant}
                            onChange={(e) => setLignesFinancement(prev => prev.map(f => f.id === fin.id ? { ...f, montant: parseFloat(e.target.value) || 0 } : f))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500">Taux (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={fin.tauxInteret}
                            onChange={(e) => setLignesFinancement(prev => prev.map(f => f.id === fin.id ? { ...f, tauxInteret: parseFloat(e.target.value) || 0 } : f))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500">Durée (mois)</label>
                          <input
                            type="number"
                            value={fin.dureeMois}
                            onChange={(e) => setLignesFinancement(prev => prev.map(f => f.id === fin.id ? { ...f, dureeMois: parseInt(e.target.value) || 0 } : f))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setLignesFinancement([...lignesFinancement, { id: newId(), libelle: 'Nouveau financement', type: 'emprunt', montant: 0, tauxInteret: 0, dureeMois: 0 }])}
                    className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
                  >
                    <PlusIcon className="h-4 w-4" /> Ajouter
                  </button>
                </div>
              </div>
            </div>

            {/* Résumé financements */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-xs text-gray-400">Total Investissements</p>
                <p className="text-lg font-bold text-purple-400">
                  {formatEUR(lignesInvestissement.reduce((s, i) => s + i.montantHT, 0))}
                </p>
              </div>
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-xs text-gray-400">Total Financements</p>
                <p className="text-lg font-bold text-blue-400">
                  {formatEUR(lignesFinancement.reduce((s, f) => s + f.montant, 0))}
                </p>
              </div>
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-xs text-gray-400">Remboursement mensuel</p>
                <p className="text-lg font-bold text-amber-400">{formatEUR(remboursementsMensuels)}/mois</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tip double-click */}
      <div className="text-center text-xs text-gray-600 mt-4">
        Astuce : double-cliquez sur une cellule pour remplir tous les mois avec la même valeur
      </div>
    </div>
  );
}
