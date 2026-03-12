'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

type Exercice = {
  id: string;
  code: string;
  dateDebut: string;
  dateFin: string;
  cloture: boolean;
};

type FecItem = {
  id: string;
  nomFichier: string;
  siren: string;
  dateGeneration: string;
  dateDebut: string;
  dateFin: string;
  nbEcritures: number;
  nbLignes: number;
  hashSha256: string;
  tailleFichier: number;
  statut: 'genere' | 'valide' | 'exporte';
};

export default function FecPage() {
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [fecs, setFecs] = useState<FecItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedExerciceId, setSelectedExerciceId] = useState('');
  const [siren, setSiren] = useState('');
  const [generating, setGenerating] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [exercicesRes, fecsRes] = await Promise.all([
        apiClient.comptabilite.exercices(),
        apiClient.conformite.fec.liste(),
      ]);

      if (exercicesRes.success && exercicesRes.data) {
        setExercices(exercicesRes.data);
        if (exercicesRes.data.length > 0) {
          setSelectedExerciceId(exercicesRes.data[0].id);
        }
      }

      if (fecsRes.success && fecsRes.data) {
        setFecs(fecsRes.data);
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Erreur lors du chargement';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const validateSiren = (value: string): boolean => {
    return /^\d{9}$/.test(value);
  };

  const handleGenerateFec = async () => {
    if (!selectedExerciceId) {
      setError('Veuillez sélectionner un exercice');
      return;
    }

    if (!siren || !validateSiren(siren)) {
      setError('Veuillez entrer un SIREN valide (9 chiffres)');
      return;
    }

    try {
      setGenerating(true);
      setError('');
      setSuccess('');

      const res = await apiClient.conformite.fec.generer({
        exerciceId: selectedExerciceId,
        siren,
      });

      if (res.success) {
        setSuccess('FEC généré avec succès');
        setSiren('');
        await loadData();
      } else {
        const errorMsg = (res as Record<string, unknown>)?.error || 'Erreur lors de la génération';
        setError(typeof errorMsg === 'string' ? errorMsg : 'Erreur lors de la génération');
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Erreur lors de la génération';
      setError(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleValider = async (fecId: string) => {
    try {
      setActionInProgress(fecId);
      setError('');
      setSuccess('');

      const res = await apiClient.conformite.fec.valider(fecId);

      if (res.success) {
        setSuccess('FEC validé avec succès');
        await loadData();
      } else {
        const errorMsg = (res as Record<string, unknown>)?.error || 'Erreur lors de la validation';
        setError(typeof errorMsg === 'string' ? errorMsg : 'Erreur lors de la validation');
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Erreur lors de la validation';
      setError(errorMsg);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExporter = async (fecId: string) => {
    try {
      setActionInProgress(fecId);
      setError('');
      setSuccess('');

      const res = await apiClient.conformite.fec.exporter(fecId);

      if (res.success) {
        setSuccess('FEC exporté avec succès');
        await loadData();
      } else {
        const errorMsg = (res as Record<string, unknown>)?.error || 'Erreur lors de l\'export';
        setError(typeof errorMsg === 'string' ? errorMsg : 'Erreur lors de l\'export');
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Erreur lors de l\'export';
      setError(errorMsg);
    } finally {
      setActionInProgress(null);
    }
  };

  const getStatutBadge = (statut: FecItem['statut']) => {
    switch (statut) {
      case 'genere':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'valide':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'exporte':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatutLabel = (statut: FecItem['statut']): string => {
    switch (statut) {
      case 'genere':
        return 'Généré';
      case 'valide':
        return 'Validé';
      case 'exporte':
        return 'Exporté';
      default:
        return statut;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-800 rounded-xl" />
          <div className="h-96 bg-gray-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <a
          href="/conformite"
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Retour à la Conformité"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-400 hover:text-white" />
        </a>
        <DocumentTextIcon className="h-8 w-8 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Fichier des Écritures Comptables (FEC)</h1>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* FEC Information Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
        <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5" /> Obligation FEC
        </h3>
        <p className="text-amber-300/90 text-sm">
          Le Fichier des Écritures Comptables (FEC) est obligatoire pour les entreprises soumises à la TVA.
          Vous devez pouvoir le produire lors d&apos;un contrôle fiscal.
          <strong className="block mt-1">Non-respect : amende de 5 000€ (Article L. 47 A-I du Livre des Procédures Fiscales)</strong>
        </p>
      </div>

      {/* Generate FEC Form */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
        <h2 className="text-white font-semibold mb-4 text-lg">Générer un nouveau FEC</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Exercice Select */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Exercice comptable</label>
            <select
              value={selectedExerciceId}
              onChange={(e) => setSelectedExerciceId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
            >
              <option value="">-- Sélectionner un exercice --</option>
              {exercices.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.code} ({formatDate(ex.dateDebut)} - {formatDate(ex.dateFin)})
                </option>
              ))}
            </select>
          </div>

          {/* SIREN Input */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">SIREN (9 chiffres)</label>
            <input
              type="text"
              value={siren}
              onChange={(e) => setSiren(e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="123456789"
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
            />
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={handleGenerateFec}
              disabled={generating || !selectedExerciceId || !validateSiren(siren)}
              className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors"
            >
              {generating ? 'Génération en cours...' : 'Générer le FEC'}
            </button>
          </div>
        </div>
      </div>

      {/* FEC List Table */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-white font-semibold mb-4 text-lg">FECs générés</h2>

        {fecs.length === 0 ? (
          <div className="text-center py-8">
            <DocumentTextIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Aucun FEC généré pour le moment</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-3 px-4">Nom fichier</th>
                  <th className="text-left py-3 px-4">Exercice</th>
                  <th className="text-center py-3 px-4">Date génération</th>
                  <th className="text-right py-3 px-4">Écritures</th>
                  <th className="text-right py-3 px-4">Lignes</th>
                  <th className="text-right py-3 px-4">Taille</th>
                  <th className="text-center py-3 px-4">Statut</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fecs.map((fec) => (
                  <tr key={fec.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{fec.nomFichier}</td>
                    <td className="py-3 px-4 text-gray-300">{fec.siren}</td>
                    <td className="py-3 px-4 text-gray-300 text-center">{formatDate(fec.dateGeneration)}</td>
                    <td className="py-3 px-4 text-gray-300 text-right">{fec.nbEcritures.toLocaleString('fr-FR')}</td>
                    <td className="py-3 px-4 text-gray-300 text-right">{fec.nbLignes.toLocaleString('fr-FR')}</td>
                    <td className="py-3 px-4 text-gray-300 text-right">{formatFileSize(fec.tailleFichier)}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatutBadge(fec.statut)}`}
                      >
                        {getStatutLabel(fec.statut)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex gap-2 justify-center">
                        {fec.statut === 'genere' && (
                          <button
                            onClick={() => handleValider(fec.id)}
                            disabled={actionInProgress === fec.id}
                            className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 text-green-300 text-xs font-medium rounded transition-colors flex items-center gap-1"
                          >
                            <CheckIcon className="h-3 w-3" />
                            Valider
                          </button>
                        )}
                        {(fec.statut === 'valide' || fec.statut === 'exporte') && (
                          <button
                            onClick={() => handleExporter(fec.id)}
                            disabled={actionInProgress === fec.id}
                            className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 text-blue-300 text-xs font-medium rounded transition-colors flex items-center gap-1"
                          >
                            <ArrowDownTrayIcon className="h-3 w-3" />
                            Exporter
                          </button>
                        )}
                        {fec.statut === 'exporte' && (
                          <div className="px-3 py-1 text-blue-300 text-xs font-medium flex items-center gap-1">
                            <CheckCircleIcon className="h-3 w-3" />
                            Exporté
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
