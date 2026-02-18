'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  CalculatorIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  DocumentTextIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

type DashboardData = {
  kpis?: {
    chiffreAffaires?: number;
    resultatNet?: number;
    tresorerie?: number;
    bfr?: number;
    totalCharges?: number;
    totalProduits?: number;
    ratioEndettement?: number;
    margeNette?: number;
  };
  evolutionMensuelle?: { mois: string; produits: number; charges: number; resultat: number }[];
  topComptes?: { numero_compte: string; libelle: string; montant: number }[];
  alertes?: string[];
  initialized?: boolean;
};

export default function ComptabilitePage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initializing, setInitializing] = useState(false);
  const [iaQuestion, setIaQuestion] = useState('');
  const [iaResponse, setIaResponse] = useState<any>(null);
  const [iaLoading, setIaLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.comptabilite.dashboard();
      if (res.success && res.data) {
        // Si le backend renvoie success, la compta est initialisée
        setDashboard({ initialized: true, ...res.data });
      } else {
        setDashboard({ initialized: false });
      }
    } catch (e: any) {
      // Si pas initialisé, proposer l'initialisation
      setDashboard({ initialized: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleInit = async () => {
    try {
      setInitializing(true);
      setError('');
      const res = await apiClient.comptabilite.init();
      if (res.success) {
        setSuccess('Comptabilité initialisée ! Plan comptable PCG, journaux et exercice créés.');
        // Forcer initialized pour basculer immédiatement vers le dashboard
        setDashboard(prev => ({ ...prev, initialized: true, kpis: res.data?.kpis || prev?.kpis }));
        await loadDashboard();
      }
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'initialisation');
    } finally {
      setInitializing(false);
    }
  };

  const handleIaQuestion = async () => {
    if (!iaQuestion.trim()) return;
    try {
      setIaLoading(true);
      setIaResponse(null);
      const res = await apiClient.comptabilite.iaAgent({ action: 'question', question: iaQuestion });
      if (res.success && res.data) {
        setIaResponse(res.data);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur IA');
    } finally {
      setIaLoading(false);
    }
  };

  const handleIaAnalyse = async () => {
    try {
      setIaLoading(true);
      setIaResponse(null);
      const res = await apiClient.comptabilite.iaAgent({ action: 'analyser' });
      if (res.success && res.data) {
        setIaResponse(res.data);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur IA');
    } finally {
      setIaLoading(false);
    }
  };

  const fmt = (n?: number) => n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n) : '—';
  const fmtPct = (n?: number) => n != null ? `${(n * 100).toFixed(1)}%` : '—';

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  // Pas encore initialisé
  if (!dashboard?.initialized && !dashboard?.kpis) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <CalculatorIcon className="h-8 w-8 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Comptabilité</h1>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">{error}</div>
        )}
        {success && (
          <div className="mb-4 bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg">{success}</div>
        )}

        <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
          <CalculatorIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Comptabilité non initialisée</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Initialisez votre comptabilité pour créer automatiquement le Plan Comptable Général (PCG),
            les journaux comptables (Ventes, Achats, Banque, OD) et l&apos;exercice en cours.
          </p>
          <button
            onClick={handleInit}
            disabled={initializing}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {initializing ? 'Initialisation en cours...' : 'Initialiser la comptabilité PCG'}
          </button>
          <p className="text-gray-500 text-sm mt-4">
            65+ comptes PCG standards · 4 journaux · Exercice {new Date().getFullYear()}
          </p>
        </div>
      </div>
    );
  }

  const kpis = dashboard?.kpis || {};

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalculatorIcon className="h-8 w-8 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Comptabilité</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg">{success}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Chiffre d&apos;affaires</span>
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">{fmt(kpis.chiffreAffaires)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Résultat Net</span>
            {(kpis.resultatNet ?? 0) >= 0 ? (
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            )}
          </div>
          <p className={`text-2xl font-bold ${(kpis.resultatNet ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmt(kpis.resultatNet)}
          </p>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Trésorerie</span>
            <BanknotesIcon className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{fmt(kpis.tresorerie)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Marge Nette</span>
            <ChartBarIcon className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{fmtPct(kpis.margeNette)}</p>
        </div>
      </div>

      {/* Second row KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
          <span className="text-gray-500 text-xs">Total Produits</span>
          <p className="text-lg font-semibold text-green-400">{fmt(kpis.totalProduits)}</p>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
          <span className="text-gray-500 text-xs">Total Charges</span>
          <p className="text-lg font-semibold text-red-400">{fmt(kpis.totalCharges)}</p>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
          <span className="text-gray-500 text-xs">BFR</span>
          <p className="text-lg font-semibold text-white">{fmt(kpis.bfr)}</p>
        </div>
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/50">
          <span className="text-gray-500 text-xs">Ratio Endettement</span>
          <p className="text-lg font-semibold text-white">{fmtPct(kpis.ratioEndettement)}</p>
        </div>
      </div>

      {/* Alertes */}
      {dashboard?.alertes && dashboard.alertes.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" /> Alertes
          </h3>
          <ul className="space-y-1">
            {dashboard.alertes.map((a, i) => (
              <li key={i} className="text-yellow-300 text-sm">• {a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Évolution mensuelle */}
      {dashboard?.evolutionMensuelle && dashboard.evolutionMensuelle.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-amber-400" /> Évolution mensuelle
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 px-3">Mois</th>
                  <th className="text-right py-2 px-3">Produits</th>
                  <th className="text-right py-2 px-3">Charges</th>
                  <th className="text-right py-2 px-3">Résultat</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.evolutionMensuelle.map((m, i) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-2 px-3 text-white">{m.mois}</td>
                    <td className="py-2 px-3 text-right text-green-400">{fmt(m.produits)}</td>
                    <td className="py-2 px-3 text-right text-red-400">{fmt(m.charges)}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${m.resultat >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmt(m.resultat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Agent IA Comptable */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-amber-400" /> Agent IA Comptable
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Posez une question comptable, demandez une analyse ou un rapport. L&apos;IA utilise GPT-4o avec le contexte de votre plan comptable et balance.
        </p>
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            value={iaQuestion}
            onChange={(e) => setIaQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleIaQuestion()}
            placeholder="Ex: Quel est mon taux de marge brute ? / Comment comptabiliser un amortissement ?"
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
          />
          <button
            onClick={handleIaQuestion}
            disabled={iaLoading || !iaQuestion.trim()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {iaLoading ? '...' : 'Demander'}
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleIaAnalyse}
            disabled={iaLoading}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            Analyser les anomalies
          </button>
          <button
            onClick={() => {
              setIaQuestion('');
              apiClient.comptabilite.iaAgent({ action: 'rapport' }).then(res => {
                if (res.success) setIaResponse(res.data);
              });
            }}
            disabled={iaLoading}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            Générer un rapport
          </button>
        </div>

        {iaResponse && (
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <pre className="text-gray-300 text-sm whitespace-pre-wrap overflow-x-auto">
              {typeof iaResponse === 'string' ? iaResponse : JSON.stringify(iaResponse?.resultat || iaResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name: 'Écritures', href: '/comptabilite/ecritures', icon: DocumentTextIcon, color: 'text-blue-400' },
          { name: 'Grand Livre', href: '/comptabilite/grand-livre', icon: DocumentTextIcon, color: 'text-green-400' },
          { name: 'Balance', href: '/comptabilite/balance', icon: BanknotesIcon, color: 'text-purple-400' },
          { name: 'Bilan', href: '/comptabilite/bilan', icon: ChartBarIcon, color: 'text-amber-400' },
          { name: 'Compte de Résultat', href: '/comptabilite/compte-resultat', icon: ArrowTrendingUpIcon, color: 'text-emerald-400' },
          { name: 'TVA', href: '/comptabilite/tva', icon: CurrencyEuroIcon, color: 'text-red-400' },
          { name: 'Agent IA', href: '/comptabilite/ia', icon: SparklesIcon, color: 'text-yellow-400' },
        ].map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-4 transition-colors group"
          >
            <link.icon className={`h-6 w-6 ${link.color} mb-2 group-hover:scale-110 transition-transform`} />
            <span className="text-white text-sm font-medium">{link.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
