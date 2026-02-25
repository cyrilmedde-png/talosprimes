'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CurrencyEuroIcon,
  CubeIcon,
  UsersIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  LockClosedIcon,
  LockOpenIcon,
  PlusIcon,
  XMarkIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { apiClient, type PlanWithModules, type ModuleMetier, type ClientModuleData } from '@/lib/api-client';

type TabType = 'plans' | 'modules' | 'attribution';

// ============================================
// Composant principal
// ============================================
export default function PlansPage() {
  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [plans, setPlans] = useState<PlanWithModules[]>([]);
  const [modules, setModules] = useState<ModuleMetier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, modulesRes] = await Promise.all([
        apiClient.plans.listAll(),
        apiClient.plans.modulesAll(),
      ]);
      if (plansRes.success) setPlans(plansRes.data.plans);
      if (modulesRes.success) setModules(modulesRes.data.modules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: Array<{ key: TabType; label: string; icon: typeof CurrencyEuroIcon }> = [
    { key: 'plans', label: 'Plans', icon: CurrencyEuroIcon },
    { key: 'modules', label: 'Modules', icon: CubeIcon },
    { key: 'attribution', label: 'Attribution clients', icon: UsersIcon },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <CurrencyEuroIcon className="h-8 w-8 text-amber-400" />
          Plans & Modules
        </h1>
        <p className="text-gray-400 mt-1">
          Gérez vos plans tarifaires, le catalogue de modules et l&apos;attribution par client.
        </p>
      </div>

      {/* Onglets */}
      <div className="mb-6 border-b border-gray-700/30">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
              }`}
            >
              <tab.icon className="h-5 w-5 inline mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
          <span className="ml-3 text-gray-400">Chargement...</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
          <button onClick={fetchData} className="ml-4 underline hover:text-red-300">
            Réessayer
          </button>
        </div>
      ) : activeTab === 'plans' ? (
        <PlansTab plans={plans} modules={modules} onRefresh={fetchData} />
      ) : activeTab === 'modules' ? (
        <ModulesTab modules={modules} plans={plans} />
      ) : (
        <AttributionTab plans={plans} modules={modules} />
      )}
    </div>
  );
}

// ============================================
// Onglet Plans
// ============================================
function PlansTab({
  plans,
  modules,
  onRefresh,
}: {
  plans: PlanWithModules[];
  modules: ModuleMetier[];
  onRefresh: () => void;
}) {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanWithModules | null>(null);
  const [editForm, setEditForm] = useState({
    nom: '',
    description: '',
    prixMensuel: '',
    prixAnnuel: '',
    essaiJours: '14',
    couleur: '#6366f1',
    selectedModules: [] as string[],
  });
  const [newPlan, setNewPlan] = useState({
    code: '',
    nom: '',
    description: '',
    prixMensuel: '',
    prixAnnuel: '',
    essaiJours: '14',
    couleur: '#6366f1',
    selectedModules: [] as string[],
  });

  const handleToggleActive = async (plan: PlanWithModules) => {
    setSaving(true);
    try {
      await apiClient.plans.update(plan.id, { actif: !plan.actif });
      setMessage({ type: 'success', text: `Plan "${plan.nom}" ${plan.actif ? 'désactivé' : 'activé'}` });
      onRefresh();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (plan: PlanWithModules) => {
    if (!confirm(`Supprimer le plan "${plan.nom}" ? Les abonnements actifs seront conservés.`)) return;
    setSaving(true);
    try {
      await apiClient.plans.delete(plan.id);
      setMessage({ type: 'success', text: `Plan "${plan.nom}" supprimé` });
      onRefresh();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.code || !newPlan.nom || !newPlan.prixMensuel) {
      setMessage({ type: 'error', text: 'Code, nom et prix mensuel sont obligatoires' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload: Parameters<typeof apiClient.plans.create>[0] = {
        code: newPlan.code.toLowerCase().replace(/\s+/g, '_'),
        nom: newPlan.nom,
        prixMensuel: parseFloat(newPlan.prixMensuel),
        essaiJours: parseInt(newPlan.essaiJours) || 14,
        couleur: newPlan.couleur,
        modules: newPlan.selectedModules.map((code) => ({ moduleCode: code })),
      };
      if (newPlan.description) payload.description = newPlan.description;
      if (newPlan.prixAnnuel) payload.prixAnnuel = parseFloat(newPlan.prixAnnuel);
      await apiClient.plans.create(payload);
      setMessage({ type: 'success', text: `Plan "${newPlan.nom}" créé avec succès` });
      setShowCreateModal(false);
      setNewPlan({
        code: '',
        nom: '',
        description: '',
        prixMensuel: '',
        prixAnnuel: '',
        essaiJours: '14',
        couleur: '#6366f1',
        selectedModules: [],
      });
      onRefresh();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur création' });
    } finally {
      setSaving(false);
    }
  };

  const toggleModuleSelection = (code: string) => {
    setNewPlan((prev) => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(code)
        ? prev.selectedModules.filter((c) => c !== code)
        : [...prev.selectedModules, code],
    }));
  };

  const toggleEditModuleSelection = (code: string) => {
    setEditForm((prev) => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(code)
        ? prev.selectedModules.filter((c) => c !== code)
        : [...prev.selectedModules, code],
    }));
  };

  const openEditModal = (plan: PlanWithModules) => {
    setEditingPlan(plan);
    setEditForm({
      nom: plan.nom,
      description: plan.description ?? '',
      prixMensuel: String(Number(plan.prixMensuel)),
      prixAnnuel: plan.prixAnnuel ? String(Number(plan.prixAnnuel)) : '',
      essaiJours: String(plan.essaiJours),
      couleur: plan.couleur ?? '#6366f1',
      selectedModules: plan.planModules.map((pm) => pm.module.code),
    });
    setShowEditModal(true);
  };

  const handleEditPlan = async () => {
    if (!editingPlan || !editForm.nom || !editForm.prixMensuel) {
      setMessage({ type: 'error', text: 'Nom et prix mensuel sont obligatoires' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.plans.update(editingPlan.id, {
        nom: editForm.nom,
        description: editForm.description || undefined,
        prixMensuel: parseFloat(editForm.prixMensuel),
        prixAnnuel: editForm.prixAnnuel ? parseFloat(editForm.prixAnnuel) : undefined,
        essaiJours: parseInt(editForm.essaiJours) || 14,
        couleur: editForm.couleur,
      });
      await apiClient.plans.updateModules(editingPlan.id,
        editForm.selectedModules.map((code) => ({ moduleCode: code })),
      );
      setMessage({ type: 'success', text: `Plan "${editForm.nom}" modifié avec succès` });
      setShowEditModal(false);
      setEditingPlan(null);
      onRefresh();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur modification' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 underline">
            Fermer
          </button>
        </div>
      )}

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{plans.filter((p) => p.actif).length}</div>
          <div className="text-sm text-gray-400">Plans actifs</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-400">
            {plans.reduce((sum, p) => sum + (p._count?.clientSubscriptions ?? 0), 0)}
          </div>
          <div className="text-sm text-gray-400">Abonnements totaux</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {modules.filter((m) => m.actif).length}
          </div>
          <div className="text-sm text-gray-400">Modules disponibles</div>
        </div>
      </div>

      {/* Bouton créer un plan */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Créer un plan
        </button>
      </div>

      {/* Liste des plans */}
      <div className="space-y-4">
        {plans.map((plan) => {
          const isExpanded = expandedPlan === plan.id;
          const moduleCount = plan.planModules.length;

          return (
            <div
              key={plan.id}
              className={`border rounded-lg overflow-hidden transition-all ${
                plan.actif
                  ? 'bg-gray-800/50 border-gray-700/30'
                  : 'bg-gray-900/50 border-gray-800/30 opacity-60'
              }`}
            >
              {/* En-tête du plan */}
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-3 h-12 rounded-full"
                    style={{ backgroundColor: plan.couleur ?? '#6b7280' }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{plan.nom}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 font-mono">
                        {plan.code}
                      </span>
                      {!plan.actif && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                          Inactif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">{plan.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Prix */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      {Number(plan.prixMensuel).toFixed(0)}€
                      <span className="text-sm font-normal text-gray-400">/mois</span>
                    </div>
                    {plan.prixAnnuel && (
                      <div className="text-xs text-gray-500">
                        {Number(plan.prixAnnuel).toFixed(0)}€/an
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-300">{moduleCount}</div>
                    <div className="text-xs text-gray-500">modules</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-300">
                      {plan._count?.clientSubscriptions ?? 0}
                    </div>
                    <div className="text-xs text-gray-500">clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-300">{plan.essaiJours}j</div>
                    <div className="text-xs text-gray-500">essai</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(plan)}
                      disabled={saving}
                      className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-amber-400 transition-colors"
                      title="Modifier"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(plan)}
                      disabled={saving}
                      className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                      title={plan.actif ? 'Désactiver' : 'Activer'}
                    >
                      {plan.actif ? (
                        <LockOpenIcon className="h-5 w-5 text-green-400" />
                      ) : (
                        <LockClosedIcon className="h-5 w-5 text-red-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan)}
                      disabled={saving}
                      className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
                      title="Supprimer"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                      className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUpIcon className="h-5 w-5" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Détails expanded : modules inclus */}
              {isExpanded && (
                <div className="border-t border-gray-700/30 p-5 bg-gray-900/30">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">
                    Modules inclus ({moduleCount})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {plan.planModules.map((pm) => (
                      <div
                        key={pm.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded border border-gray-700/20"
                      >
                        <CheckCircleIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300 truncate">
                          {pm.module.nomAffiche}
                        </span>
                        {pm.limiteUsage && (
                          <span className="text-xs text-amber-400 ml-auto">
                            {pm.limiteUsage}/mois
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Modules NON inclus */}
                  {(() => {
                    const includedCodes = plan.planModules.map((pm) => pm.module.code);
                    const excluded = modules.filter(
                      (m) => m.actif && !includedCodes.includes(m.code)
                    );
                    if (excluded.length === 0) return null;
                    return (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-500 mb-2">
                          Non inclus ({excluded.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {excluded.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 rounded border border-gray-800/20 opacity-50"
                            >
                              <XCircleIcon className="h-4 w-4 text-gray-600 flex-shrink-0" />
                              <span className="text-sm text-gray-500 truncate">
                                {m.nomAffiche}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Stripe IDs */}
                  {(plan.stripeProductId || plan.stripePriceIdMensuel) && (
                    <div className="mt-4 pt-3 border-t border-gray-700/20">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                        Stripe
                      </h4>
                      <div className="flex gap-4 text-xs text-gray-500 font-mono">
                        {plan.stripeProductId && <span>Product: {plan.stripeProductId}</span>}
                        {plan.stripePriceIdMensuel && (
                          <span>Price (mensuel): {plan.stripePriceIdMensuel}</span>
                        )}
                        {plan.stripePriceIdAnnuel && (
                          <span>Price (annuel): {plan.stripePriceIdAnnuel}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Modifier un plan */}
      {showEditModal && editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <PencilSquareIcon className="h-5 w-5 text-amber-400" />
                Modifier le plan : {editingPlan.code}
              </h3>
              <button
                onClick={() => { setShowEditModal(false); setEditingPlan(null); }}
                className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nom du plan <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.nom}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, nom: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                />
              </div>

              {/* Prix + Essai + Couleur */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Prix/mois <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editForm.prixMensuel}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, prixMensuel: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">&euro;</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Prix/an</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editForm.prixAnnuel}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, prixAnnuel: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">&euro;</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Essai (jours)</label>
                  <input
                    type="number"
                    value={editForm.essaiJours}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, essaiJours: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Couleur</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.couleur}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, couleur: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs text-gray-500 font-mono">{editForm.couleur}</span>
                  </div>
                </div>
              </div>

              {/* Sélection modules */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Modules inclus ({editForm.selectedModules.length})
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {modules
                    .filter((m) => m.actif)
                    .map((m) => {
                      const selected = editForm.selectedModules.includes(m.code);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleEditModuleSelection(m.code)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                            selected
                              ? 'bg-amber-500/10 border-amber-500/30 text-white'
                              : 'bg-gray-900/50 border-gray-700/30 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                          }`}
                        >
                          {selected ? (
                            <CheckCircleIcon className="h-4 w-4 text-amber-400 flex-shrink-0" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-gray-600 flex-shrink-0" />
                          )}
                          <span className="truncate">{m.nomAffiche}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div className="flex justify-end gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => { setShowEditModal(false); setEditingPlan(null); }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEditPlan}
                disabled={saving || !editForm.nom || !editForm.prixMensuel}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Créer un plan */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <PlusIcon className="h-5 w-5 text-amber-400" />
                Créer un nouveau plan
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Nom + Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nom du plan <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPlan.nom}
                    onChange={(e) => {
                      const nom = e.target.value;
                      setNewPlan((prev) => ({
                        ...prev,
                        nom,
                        code: prev.code || nom.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                      }));
                    }}
                    placeholder="Ex: Sur Mesure"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPlan.code}
                    onChange={(e) => setNewPlan((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="sur_mesure"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={newPlan.description}
                  onChange={(e) => setNewPlan((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Description du plan..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                />
              </div>

              {/* Prix + Essai + Couleur */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Prix/mois <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={newPlan.prixMensuel}
                      onChange={(e) => setNewPlan((prev) => ({ ...prev, prixMensuel: e.target.value }))}
                      placeholder="59"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">&euro;</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Prix/an</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={newPlan.prixAnnuel}
                      onChange={(e) => setNewPlan((prev) => ({ ...prev, prixAnnuel: e.target.value }))}
                      placeholder="590"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">&euro;</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Essai (jours)</label>
                  <input
                    type="number"
                    value={newPlan.essaiJours}
                    onChange={(e) => setNewPlan((prev) => ({ ...prev, essaiJours: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Couleur</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newPlan.couleur}
                      onChange={(e) => setNewPlan((prev) => ({ ...prev, couleur: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs text-gray-500 font-mono">{newPlan.couleur}</span>
                  </div>
                </div>
              </div>

              {/* Sélection modules */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Modules inclus ({newPlan.selectedModules.length})
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {modules
                    .filter((m) => m.actif)
                    .map((m) => {
                      const selected = newPlan.selectedModules.includes(m.code);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleModuleSelection(m.code)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                            selected
                              ? 'bg-amber-500/10 border-amber-500/30 text-white'
                              : 'bg-gray-900/50 border-gray-700/30 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                          }`}
                        >
                          {selected ? (
                            <CheckCircleIcon className="h-4 w-4 text-amber-400 flex-shrink-0" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-gray-600 flex-shrink-0" />
                          )}
                          <span className="truncate">{m.nomAffiche}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div className="flex justify-end gap-3 p-5 border-t border-gray-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreatePlan}
                disabled={saving || !newPlan.code || !newPlan.nom || !newPlan.prixMensuel}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Création...' : 'Créer le plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Onglet Modules
// ============================================
function ModulesTab({
  modules,
  plans,
}: {
  modules: ModuleMetier[];
  plans: PlanWithModules[];
}) {
  // Grouper par catégorie
  const categories = modules.reduce<Record<string, ModuleMetier[]>>((acc, m) => {
    const cat = m.categorie ?? 'Autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  const getPlansForModule = (moduleCode: string): string[] => {
    return plans
      .filter((p) => p.actif && p.planModules.some((pm) => pm.module.code === moduleCode))
      .map((p) => p.nom);
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-400">
          Catalogue de tous les modules métiers disponibles. Chaque module peut être inclus dans un ou plusieurs plans.
        </p>
      </div>

      {Object.entries(categories).map(([categorie, mods]) => (
        <div key={categorie} className="mb-8">
          <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2 border-b border-gray-700/30 pb-2">
            <CubeIcon className="h-5 w-5 text-amber-400" />
            {categorie}
            <span className="text-sm font-normal text-gray-500 ml-1">({mods.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mods.map((m) => {
              const plansIncluding = getPlansForModule(m.code);
              return (
                <div
                  key={m.id}
                  className={`border rounded-lg p-4 ${
                    m.actif
                      ? 'bg-gray-800/50 border-gray-700/30'
                      : 'bg-gray-900/50 border-gray-800/30 opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white">{m.nomAffiche}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{m.code}</p>
                    </div>
                    <div className="text-right">
                      {Number(m.prixParMois) > 0 ? (
                        <span className="text-sm font-semibold text-amber-400">
                          +{Number(m.prixParMois)}€/mois
                        </span>
                      ) : (
                        <span className="text-xs text-green-400">Inclus</span>
                      )}
                    </div>
                  </div>

                  {m.description && (
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{m.description}</p>
                  )}

                  {/* Plans qui incluent ce module */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {plansIncluding.length > 0 ? (
                      plansIncluding.map((planName) => (
                        <span
                          key={planName}
                          className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        >
                          {planName}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-600">Aucun plan</span>
                    )}
                  </div>

                  {/* Nombre de clients */}
                  {m._count && (
                    <div className="mt-2 text-xs text-gray-500">
                      {m._count.clientModules} client(s) actif(s) · {m._count.planModules} plan(s)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Onglet Attribution
// ============================================
function AttributionTab({
  plans,
  modules,
}: {
  plans: PlanWithModules[];
  modules: ModuleMetier[];
}) {
  const [clients, setClients] = useState<
    Array<{
      id: string;
      email: string;
      nom: string | null;
      prenom: string | null;
      raisonSociale: string | null;
    }>
  >([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientModules, setClientModules] = useState<ClientModuleData[]>([]);
  const [clientSubscription, setClientSubscription] = useState<{
    id: string;
    nomPlan: string;
    statut: string;
    plan: { code: string; nom: string; prixMensuel: number } | null;
  } | null>(null);
  const [modulesActifs, setModulesActifs] = useState<string[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [stats, setStats] = useState<{
    clientsParPlan: Array<{ planCode: string | null; planNom: string | null; count: number }>;
    modulesPopulaires: Array<{ moduleCode: string; moduleNom: string; count: number }>;
  } | null>(null);

  // Charger les clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await apiClient.clients.list();
        if (res.success) {
          setClients(
            (res.data.clients as Array<{
              id: string;
              email: string;
              nom: string | null;
              prenom: string | null;
              raisonSociale: string | null;
            }>)
          );
        }
      } catch {
        // Silently handle error
      } finally {
        setLoadingClients(false);
      }
    };

    const loadStats = async () => {
      try {
        const res = await apiClient.clientModules.stats();
        if (res.success) setStats(res.data);
      } catch {
        // Stats optionnelles
      }
    };

    loadClients();
    loadStats();
  }, []);

  // Charger les modules du client sélectionné
  useEffect(() => {
    if (!selectedClient) {
      setClientModules([]);
      setClientSubscription(null);
      setModulesActifs([]);
      return;
    }

    const loadClientModules = async () => {
      setLoadingModules(true);
      try {
        const res = await apiClient.clientModules.get(selectedClient);
        if (res.success) {
          setClientModules(res.data.clientModules);
          setClientSubscription(res.data.subscription);
          setModulesActifs(res.data.modulesActifs);
        }
      } catch {
        setMessage({ type: 'error', text: 'Erreur de chargement des modules client' });
      } finally {
        setLoadingModules(false);
      }
    };

    loadClientModules();
  }, [selectedClient]);

  const handleActivatePlan = async (planCode: string) => {
    if (!selectedClient) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiClient.clientModules.activate(selectedClient, { planCode });
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Plan activé : ${res.data.count} module(s) attribué(s)`,
        });
        // Recharger
        const updated = await apiClient.clientModules.get(selectedClient);
        if (updated.success) {
          setClientModules(updated.data.clientModules);
          setClientSubscription(updated.data.subscription);
          setModulesActifs(updated.data.modulesActifs);
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleModule = async (moduleCode: string, actif: boolean) => {
    if (!selectedClient) return;
    setSaving(true);
    try {
      await apiClient.clientModules.toggle(selectedClient, moduleCode, actif);
      // Recharger
      const updated = await apiClient.clientModules.get(selectedClient);
      if (updated.success) {
        setClientModules(updated.data.clientModules);
        setModulesActifs(updated.data.modulesActifs);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' });
    } finally {
      setSaving(false);
    }
  };

  const getClientLabel = (c: { email: string; nom: string | null; prenom: string | null; raisonSociale: string | null }) => {
    if (c.raisonSociale) return c.raisonSociale;
    if (c.nom || c.prenom) return `${c.prenom ?? ''} ${c.nom ?? ''}`.trim();
    return c.email;
  };

  return (
    <div>
      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 underline">
            Fermer
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-400 mb-3">Clients par plan</h4>
            {stats.clientsParPlan.length > 0 ? (
              <div className="space-y-2">
                {stats.clientsParPlan.map((s, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">{s.planNom ?? 'Sans plan'}</span>
                    <span className="text-sm font-semibold text-white">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucune donnée</p>
            )}
          </div>
          <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-400 mb-3">Modules populaires</h4>
            {stats.modulesPopulaires.length > 0 ? (
              <div className="space-y-2">
                {stats.modulesPopulaires.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">{s.moduleNom}</span>
                    <span className="text-sm font-semibold text-white">{s.count} clients</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucune donnée</p>
            )}
          </div>
        </div>
      )}

      {/* Sélecteur client */}
      <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-5 mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Sélectionner un client
        </label>
        {loadingClients ? (
          <div className="text-sm text-gray-500">Chargement des clients...</div>
        ) : (
          <select
            value={selectedClient ?? ''}
            onChange={(e) => setSelectedClient(e.target.value || null)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="">-- Choisir un client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {getClientLabel(c)} ({c.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Détails client sélectionné */}
      {selectedClient && (
        <>
          {loadingModules ? (
            <div className="flex items-center justify-center py-10">
              <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin" />
              <span className="ml-2 text-gray-400">Chargement...</span>
            </div>
          ) : (
            <>
              {/* Plan actuel */}
              <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-5 mb-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Plan actuel</h4>
                {clientSubscription ? (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <span className="text-lg font-semibold text-white">
                        {clientSubscription.plan?.nom ?? clientSubscription.nomPlan}
                      </span>
                      <span
                        className={`ml-3 text-xs px-2 py-0.5 rounded ${
                          clientSubscription.statut === 'actif'
                            ? 'bg-green-500/20 text-green-400'
                            : clientSubscription.statut === 'essai'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {clientSubscription.statut}
                      </span>
                      {clientSubscription.plan && (
                        <span className="ml-3 text-sm text-gray-400">
                          {Number(clientSubscription.plan.prixMensuel).toFixed(0)}€/mois
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Aucun abonnement actif</p>
                )}

                {/* Boutons changer de plan */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-sm text-gray-400 self-center mr-2">Attribuer un plan :</span>
                  {plans
                    .filter((p) => p.actif)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleActivatePlan(p.code)}
                        disabled={saving}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                          clientSubscription?.plan?.code === p.code
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                            : 'bg-gray-700/50 border-gray-600/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                        } disabled:opacity-50`}
                        style={{ borderLeftColor: p.couleur ?? undefined, borderLeftWidth: '3px' }}
                      >
                        {p.nom} — {Number(p.prixMensuel).toFixed(0)}€
                      </button>
                    ))}
                </div>
              </div>

              {/* Modules du client */}
              <div className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-5">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">
                  Modules attribués ({modulesActifs.length} actifs sur {modules.filter((m) => m.actif).length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {modules
                    .filter((m) => m.actif)
                    .map((m) => {
                      const cm = clientModules.find((c) => c.module.code === m.code);
                      const isActive = cm?.actif ?? false;

                      return (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                            isActive
                              ? 'bg-green-500/5 border-green-500/20'
                              : 'bg-gray-900/30 border-gray-800/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isActive ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-400" />
                            ) : (
                              <XCircleIcon className="h-5 w-5 text-gray-600" />
                            )}
                            <div>
                              <span
                                className={`text-sm font-medium ${
                                  isActive ? 'text-white' : 'text-gray-500'
                                }`}
                              >
                                {m.nomAffiche}
                              </span>
                              {cm?.limiteUsage && (
                                <span className="ml-2 text-xs text-amber-400">
                                  ({cm.usageActuel}/{cm.limiteUsage})
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleModule(m.code, !isActive)}
                            disabled={saving}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                              isActive
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'
                            }`}
                          >
                            {isActive ? 'Désactiver' : 'Activer'}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
