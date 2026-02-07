'use client';

import { useState } from 'react';
import { apiClient, type Subscription } from '@/lib/api-client';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  clientName: string;
  onSuccess?: () => void;
}

export default function SubscriptionModal({ isOpen, onClose, subscription, clientName, onSuccess }: SubscriptionModalProps) {
  const [action, setAction] = useState<'renew' | 'upgrade' | 'cancel' | 'suspend' | 'reactivate' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [cancelReason, setCancelReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [newPlan, setNewPlan] = useState({
    nomPlan: '',
    montantMensuel: 0,
    modulesInclus: [] as string[],
  });

  if (!isOpen || !subscription) return null;

  const handleRenew = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await apiClient.subscriptions.renew(subscription.id);
      setSuccess(response.message);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du renouvellement');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError('Veuillez indiquer une raison');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await apiClient.subscriptions.cancel(subscription.id, cancelReason);
      setSuccess(response.message);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'annulation');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      setError('Veuillez indiquer une raison');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await apiClient.subscriptions.suspend(subscription.id, suspendReason);
      setSuccess(response.message);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suspension');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await apiClient.subscriptions.reactivate(subscription.id);
      setSuccess(response.message);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réactivation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!newPlan.nomPlan || newPlan.montantMensuel <= 0) {
      setError('Veuillez remplir tous les champs du nouveau plan');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await apiClient.subscriptions.upgrade(subscription.id, newPlan);
      setSuccess(response.message);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du changement de plan');
    } finally {
      setLoading(false);
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'suspendu': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'annule': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'expire': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const renderActionForm = () => {
    switch (action) {
      case 'renew':
        return (
          <div className="space-y-4">
            <p className="text-gray-300">Voulez-vous renouveler cet abonnement pour une nouvelle période ?</p>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-400">Nouvelle date de renouvellement :</p>
              <p className="text-white font-medium">
                {new Date(new Date(subscription.dateProchainRenouvellement).setMonth(new Date(subscription.dateProchainRenouvellement).getMonth() + 1)).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRenew}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Renouvellement...' : 'Confirmer le renouvellement'}
              </button>
              <button
                onClick={() => setAction(null)}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        );

      case 'cancel':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Raison de l'annulation
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                rows={3}
                placeholder="Ex: Le client ne souhaite plus utiliser le service..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Annulation...' : 'Confirmer l\'annulation'}
              </button>
              <button
                onClick={() => setAction(null)}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        );

      case 'suspend':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Raison de la suspension
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                rows={3}
                placeholder="Ex: Paiement en retard de 30 jours..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSuspend}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Suspension...' : 'Confirmer la suspension'}
              </button>
              <button
                onClick={() => setAction(null)}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        );

      case 'reactivate':
        return (
          <div className="space-y-4">
            <p className="text-gray-300">Voulez-vous réactiver cet abonnement suspendu ?</p>
            <div className="flex gap-3">
              <button
                onClick={handleReactivate}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Réactivation...' : 'Confirmer la réactivation'}
              </button>
              <button
                onClick={() => setAction(null)}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        );

      case 'upgrade':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nom du nouveau plan
              </label>
              <input
                type="text"
                value={newPlan.nomPlan}
                onChange={(e) => setNewPlan({ ...newPlan, nomPlan: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Ex: Plan Premium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Montant mensuel (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={newPlan.montantMensuel || ''}
                onChange={(e) => setNewPlan({ ...newPlan, montantMensuel: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Ex: 49.99"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Modules inclus (séparés par des virgules)
              </label>
              <input
                type="text"
                value={newPlan.modulesInclus.join(', ')}
                onChange={(e) => setNewPlan({ ...newPlan, modulesInclus: e.target.value.split(',').map(m => m.trim()).filter(Boolean) })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Ex: gestion_clients, facturation, analytics"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Mise à jour...' : 'Changer de plan'}
              </button>
              <button
                onClick={() => setAction(null)}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Gestion de l'abonnement</h2>
              <p className="text-gray-400 mt-1">{clientName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informations de l'abonnement */}
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Informations</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Plan</p>
                <p className="text-white font-medium">{subscription.nomPlan}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Montant</p>
                <p className="text-white font-medium">{subscription.montantMensuel}€/mois</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Statut</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatutColor(subscription.statut)}`}>
                  {subscription.statut}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Prochain renouvellement</p>
                <p className="text-white font-medium">
                  {new Date(subscription.dateProchainRenouvellement).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            {subscription.modulesInclus && subscription.modulesInclus.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Modules inclus</p>
                <div className="flex flex-wrap gap-2">
                  {subscription.modulesInclus.map((module, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm border border-blue-500/30">
                      {module}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Actions ou formulaire */}
          {action ? (
            <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                {action === 'renew' && 'Renouvellement'}
                {action === 'cancel' && 'Annulation'}
                {action === 'suspend' && 'Suspension'}
                {action === 'reactivate' && 'Réactivation'}
                {action === 'upgrade' && 'Changement de plan'}
              </h3>
              {renderActionForm()}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {subscription.statut === 'actif' && (
                <>
                  <button
                    onClick={() => setAction('renew')}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    🔄 Renouveler
                  </button>
                  <button
                    onClick={() => setAction('upgrade')}
                    className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    ⬆️ Changer de plan
                  </button>
                  <button
                    onClick={() => setAction('suspend')}
                    className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                  >
                    ⏸️ Suspendre
                  </button>
                  <button
                    onClick={() => setAction('cancel')}
                    className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    ❌ Annuler
                  </button>
                </>
              )}
              
              {subscription.statut === 'suspendu' && (
                <>
                  <button
                    onClick={() => setAction('reactivate')}
                    className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium col-span-2"
                  >
                    ✅ Réactiver
                  </button>
                  <button
                    onClick={() => setAction('cancel')}
                    className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium col-span-2"
                  >
                    ❌ Annuler définitivement
                  </button>
                </>
              )}
              
              {(subscription.statut === 'annule' || subscription.statut === 'expire') && (
                <div className="col-span-2 text-center text-gray-400 py-4">
                  Cet abonnement est {subscription.statut}. Créez un nouvel abonnement si nécessaire.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

