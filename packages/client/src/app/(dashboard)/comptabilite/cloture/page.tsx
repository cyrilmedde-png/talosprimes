'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  LockClosedIcon,
  LockOpenIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  CurrencyEuroIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

type Exercice = {
  id: string;
  tenantId: string;
  code: string;
  dateDebut: string;
  dateFin: string;
  cloture: boolean;
  dateCloture: string | null;
  resultatNet: number | null;
};

type PreCheckVerification = {
  resultatNet: number;
  benefice: boolean;
  equilibre: boolean;
  nbBrouillon: number;
  avertissements: string[];
  peutCloturer: boolean;
};

type PreCheckData = {
  cloture: boolean;
  verification?: PreCheckVerification;
  message?: string;
};

type IaAnalysis = {
  resultat?: Record<string, unknown> | string;
  action?: string;
  metadata?: Record<string, unknown>;
};

export default function CloturePage() {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | null>(null);
  const [preCheck, setPreCheck] = useState<PreCheckData | null>(null);
  const [iaAnalysis, setIaAnalysis] = useState<IaAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [preCheckLoading, setPreCheckLoading] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [closureLoading, setClosureLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fmt = (n: number | null | undefined) =>
    n != null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n) : '—';

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
    } catch {
      return d;
    }
  };

  // Charger les exercices
  const loadExercices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.comptabilite.exercices();
      if (res.success && res.data?.exercices) {
        setExercices(res.data.exercices);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur chargement exercices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadExercices(); }, [loadExercices]);

  // Sélectionner un exercice → lance le pré-check
  const selectExercice = async (exercice: Exercice) => {
    if (exercice.cloture) {
      setSelectedExercice(exercice);
      setPreCheck(null);
      setIaAnalysis(null);
      return;
    }

    setSelectedExercice(exercice);
    setPreCheck(null);
    setIaAnalysis(null);
    setError('');
    setSuccess('');

    try {
      setPreCheckLoading(true);
      const res = await apiClient.comptabilite.cloture({ exerciceId: exercice.id, confirme: false });
      if (res.success && res.data) {
        setPreCheck(res.data as PreCheckData);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur pré-vérification');
    } finally {
      setPreCheckLoading(false);
    }
  };

  // Analyse IA
  const runIaAnalysis = async () => {
    if (!selectedExercice) return;
    try {
      setIaLoading(true);
      setIaAnalysis(null);
      setError('');
      const res = await apiClient.comptabilite.iaAgent({
        action: 'analyser',
        dateFrom: selectedExercice.dateDebut,
        dateTo: selectedExercice.dateFin,
      });
      if (res.success && res.data) {
        setIaAnalysis(res.data as IaAnalysis);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur analyse IA');
    } finally {
      setIaLoading(false);
    }
  };

  // Clôture automatique IA
  const autoCloseWithIa = async () => {
    if (!selectedExercice || !preCheck?.verification?.peutCloturer) return;
    try {
      setClosureLoading(true);
      setError('');

      // Étape 1 : Analyse IA
      const iaRes = await apiClient.comptabilite.iaAgent({
        action: 'analyser',
        dateFrom: selectedExercice.dateDebut,
        dateTo: selectedExercice.dateFin,
      });

      if (iaRes.success && iaRes.data) {
        setIaAnalysis(iaRes.data as IaAnalysis);
      }

      // Étape 2 : Clôture
      const res = await apiClient.comptabilite.cloture({ exerciceId: selectedExercice.id, confirme: true });
      if (res.success) {
        const data = res.data as PreCheckData;
        if (data.cloture) {
          setSuccess(`Exercice ${selectedExercice.code} clôturé avec succès ! Résultat net : ${fmt(preCheck.verification.resultatNet)}`);
          setSelectedExercice(null);
          setPreCheck(null);
          await loadExercices();
        } else {
          setError('La clôture a échoué. Vérifiez les conditions.');
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur clôture automatique');
    } finally {
      setClosureLoading(false);
    }
  };

  // Clôture manuelle
  const manualClose = async () => {
    if (!selectedExercice) return;
    try {
      setClosureLoading(true);
      setError('');
      setShowConfirmModal(false);

      const res = await apiClient.comptabilite.cloture({ exerciceId: selectedExercice.id, confirme: true });
      if (res.success) {
        const data = res.data as PreCheckData;
        if (data.cloture) {
          setSuccess(`Exercice ${selectedExercice.code} clôturé manuellement avec succès !`);
          setSelectedExercice(null);
          setPreCheck(null);
          await loadExercices();
        } else {
          setError(data.message || 'La clôture a échoué.');
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur clôture manuelle');
    } finally {
      setClosureLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const verification = preCheck?.verification;
  const exercicesOuverts = exercices.filter(e => !e.cloture);
  const exercicesClotures = exercices.filter(e => e.cloture);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ClipboardDocumentCheckIcon className="h-8 w-8 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Clôture d&apos;exercice</h1>
          <p className="text-gray-400 text-sm">Analysez, vérifiez et clôturez vos exercices comptables</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircleIcon className="h-5 w-5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">&times;</button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-300">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Sélecteur d'exercice */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-amber-400" />
              Exercices
            </h2>

            {/* Exercices ouverts */}
            {exercicesOuverts.length > 0 && (
              <div className="mb-4">
                <p className="text-gray-400 text-xs font-medium uppercase mb-2">Ouverts</p>
                <div className="space-y-2">
                  {exercicesOuverts.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => selectExercice(ex)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedExercice?.id === ex.id
                          ? 'bg-amber-500/20 border-amber-500/50'
                          : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{ex.code}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                          <LockOpenIcon className="h-3 w-3" /> Ouvert
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">
                        Du {fmtDate(ex.dateDebut)} au {fmtDate(ex.dateFin)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Exercices clôturés */}
            {exercicesClotures.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase mb-2">Clôturés</p>
                <div className="space-y-2">
                  {exercicesClotures.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => selectExercice(ex)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors opacity-60 ${
                        selectedExercice?.id === ex.id
                          ? 'bg-gray-700/50 border-gray-600'
                          : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 font-medium">{ex.code}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600/30 text-gray-400 flex items-center gap-1">
                          <LockClosedIcon className="h-3 w-3" /> Clôturé
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        Clôturé le {fmtDate(ex.dateCloture)} — {fmt(ex.resultatNet)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {exercices.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">Aucun exercice trouvé</p>
            )}
          </div>
        </div>

        {/* Colonne droite : Détails */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pas d'exercice sélectionné */}
          {!selectedExercice && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
              <ClipboardDocumentCheckIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Sélectionnez un exercice pour commencer les vérifications</p>
            </div>
          )}

          {/* Exercice clôturé sélectionné */}
          {selectedExercice?.cloture && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <LockClosedIcon className="h-6 w-6 text-gray-400" />
                <h3 className="text-lg font-semibold text-white">Exercice {selectedExercice.code}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Période</p>
                  <p className="text-white text-sm">{fmtDate(selectedExercice.dateDebut)} — {fmtDate(selectedExercice.dateFin)}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Date de clôture</p>
                  <p className="text-white text-sm">{fmtDate(selectedExercice.dateCloture)}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Résultat net</p>
                  <p className={`text-sm font-semibold ${(selectedExercice.resultatNet ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {fmt(selectedExercice.resultatNet)}
                  </p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-gray-400 text-xs">Statut</p>
                  <p className="text-gray-300 text-sm flex items-center gap-1">
                    <LockClosedIcon className="h-4 w-4" /> Clôturé définitivement
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Exercice ouvert : Pré-vérifications */}
          {selectedExercice && !selectedExercice.cloture && (
            <>
              {/* Loading pré-check */}
              {preCheckLoading && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 text-center">
                  <ArrowPathIcon className="h-8 w-8 text-amber-400 mx-auto mb-2 animate-spin" />
                  <p className="text-gray-400">Vérifications en cours...</p>
                </div>
              )}

              {/* Résultats pré-check */}
              {verification && !preCheckLoading && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-amber-400" />
                    Pré-vérifications — Exercice {selectedExercice.code}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {/* Écritures brouillon */}
                    <div className={`rounded-lg p-3 border ${verification.nbBrouillon === 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {verification.nbBrouillon === 0 ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-400" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                        )}
                        <span className="text-sm font-medium text-white">Écritures brouillon</span>
                      </div>
                      <p className={`text-sm ${verification.nbBrouillon === 0 ? 'text-green-300' : 'text-red-300'}`}>
                        {verification.nbBrouillon === 0 ? 'Aucune écriture en brouillon' : `${verification.nbBrouillon} écriture(s) en brouillon`}
                      </p>
                      {verification.nbBrouillon > 0 && (
                        <a href="/comptabilite/ecritures?statut=brouillon" className="text-amber-400 text-xs hover:underline mt-1 inline-block">
                          Voir les écritures &rarr;
                        </a>
                      )}
                    </div>

                    {/* Équilibre */}
                    <div className={`rounded-lg p-3 border ${verification.equilibre ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {verification.equilibre ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-400" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-red-400" />
                        )}
                        <span className="text-sm font-medium text-white">Équilibre comptable</span>
                      </div>
                      <p className={`text-sm ${verification.equilibre ? 'text-green-300' : 'text-red-300'}`}>
                        {verification.equilibre ? 'Débit = Crédit (équilibré)' : 'Déséquilibre détecté'}
                      </p>
                    </div>

                    {/* Résultat net */}
                    <div className="rounded-lg p-3 border bg-gray-900 border-gray-700">
                      <div className="flex items-center gap-2 mb-1">
                        <CurrencyEuroIcon className="h-5 w-5 text-amber-400" />
                        <span className="text-sm font-medium text-white">Résultat net</span>
                      </div>
                      <p className={`text-lg font-bold ${verification.benefice ? 'text-green-400' : 'text-red-400'}`}>
                        {fmt(verification.resultatNet)}
                      </p>
                      <p className="text-xs text-gray-400">{verification.benefice ? 'Bénéfice' : 'Déficit'}</p>
                    </div>

                    {/* Statut global */}
                    <div className={`rounded-lg p-3 border ${verification.peutCloturer ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {verification.peutCloturer ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-400" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                        )}
                        <span className="text-sm font-medium text-white">Prêt à clôturer</span>
                      </div>
                      <p className={`text-sm ${verification.peutCloturer ? 'text-green-300' : 'text-yellow-300'}`}>
                        {verification.peutCloturer ? 'Toutes les conditions sont remplies' : 'Des corrections sont nécessaires'}
                      </p>
                    </div>
                  </div>

                  {/* Avertissements */}
                  {verification.avertissements.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                      <p className="text-yellow-400 text-sm font-medium mb-1">Avertissements :</p>
                      <ul className="space-y-1">
                        {verification.avertissements.map((a, i) => (
                          <li key={i} className="text-yellow-300 text-sm flex items-start gap-1">
                            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Boutons d'action */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={runIaAnalysis}
                      disabled={iaLoading}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <SparklesIcon className="h-4 w-4 text-amber-400" />
                      {iaLoading ? 'Analyse en cours...' : 'Analyser avec l\'IA'}
                    </button>

                    <button
                      onClick={autoCloseWithIa}
                      disabled={closureLoading || !verification.peutCloturer}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <SparklesIcon className="h-4 w-4" />
                      {closureLoading ? 'Clôture en cours...' : 'Clôture automatique IA'}
                    </button>

                    <button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={closureLoading || !verification.peutCloturer}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <LockClosedIcon className="h-4 w-4" />
                      Clôturer manuellement
                    </button>
                  </div>
                </div>
              )}

              {/* Analyse IA */}
              {iaAnalysis && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-amber-400" />
                    Analyse IA — Exercice {selectedExercice.code}
                  </h3>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap overflow-x-auto">
                      {typeof iaAnalysis.resultat === 'string'
                        ? iaAnalysis.resultat
                        : JSON.stringify(iaAnalysis.resultat || iaAnalysis, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de confirmation manuelle */}
      {showConfirmModal && selectedExercice && verification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
              Confirmer la clôture
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Vous êtes sur le point de clôturer l&apos;exercice <strong className="text-white">{selectedExercice.code}</strong> ({fmtDate(selectedExercice.dateDebut)} — {fmtDate(selectedExercice.dateFin)}).
            </p>
            <div className="bg-gray-900 rounded-lg p-3 mb-4 space-y-1">
              <p className="text-sm text-gray-300">
                Résultat net : <span className={`font-semibold ${verification.benefice ? 'text-green-400' : 'text-red-400'}`}>{fmt(verification.resultatNet)}</span>
              </p>
              <p className="text-sm text-gray-300">
                Équilibre : {verification.equilibre ? <span className="text-green-400">OK</span> : <span className="text-red-400">NON</span>}
              </p>
              <p className="text-sm text-gray-300">
                Brouillons : <span className={verification.nbBrouillon === 0 ? 'text-green-400' : 'text-red-400'}>{verification.nbBrouillon}</span>
              </p>
            </div>
            <p className="text-yellow-300 text-xs mb-4">
              Cette action est irréversible. L&apos;exercice ne pourra plus être modifié après clôture.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={manualClose}
                disabled={closureLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {closureLoading ? 'Clôture...' : 'Confirmer la clôture'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
