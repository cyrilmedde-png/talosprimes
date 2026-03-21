'use client';

import { useState, useRef } from 'react';
import type { LandingSection } from './types';
import { SECTION_TYPES } from './types';
import { SectionConfigEditor } from './SectionConfigEditor';

interface Props {
  sections: LandingSection[];
  setSections: (s: LandingSection[]) => void;
  api: {
    createSection: (data: Partial<LandingSection>) => Promise<unknown>;
    updateSection: (id: string, data: Partial<LandingSection>) => Promise<unknown>;
    deleteSection: (id: string) => Promise<unknown>;
    reorderSections: (ordered: { id: string; ordre: number }[]) => Promise<unknown>;
  };
  showToast: (type: 'success' | 'error', message: string) => void;
  refreshPreview: () => void;
}

export function SectionsManager({ sections, setSections, api, showToast, refreshPreview }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newType, setNewType] = useState('');
  const [saving, setSaving] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const editingSection = sections.find(s => s.id === editingId);

  // Drag & drop handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverItem.current = index;
  };

  const handleDrop = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const items = [...sections];
    const dragged = items.splice(dragItem.current, 1)[0];
    items.splice(dragOverItem.current, 0, dragged);

    const reordered = items.map((s, i) => ({ ...s, ordre: i + 1 }));
    setSections(reordered);

    try {
      await api.reorderSections(reordered.map((s, i) => ({ id: s.id, ordre: i + 1 })));
      showToast('success', 'Ordre mis à jour');
      refreshPreview();
    } catch {
      showToast('error', 'Erreur réordonnancement');
    }

    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Toggle active
  const toggleActive = async (section: LandingSection) => {
    try {
      await api.updateSection(section.id, { actif: !section.actif });
      setSections(sections.map(s => s.id === section.id ? { ...s, actif: !s.actif } : s));
      showToast('success', section.actif ? 'Section masquée' : 'Section activée');
      refreshPreview();
    } catch {
      showToast('error', 'Erreur');
    }
  };

  // Save section config
  const saveSection = async (id: string, config: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.updateSection(id, { config });
      setSections(sections.map(s => s.id === id ? { ...s, config } : s));
      showToast('success', 'Section sauvegardée');
      refreshPreview();
    } catch {
      showToast('error', 'Erreur sauvegarde');
    }
    setSaving(false);
  };

  // Delete section
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette section ?')) return;
    try {
      await api.deleteSection(id);
      setSections(sections.filter(s => s.id !== id));
      setEditingId(null);
      showToast('success', 'Section supprimée');
      refreshPreview();
    } catch {
      showToast('error', 'Erreur suppression');
    }
  };

  // Create section
  const handleCreate = async () => {
    if (!newType) return;
    try {
      const res = await api.createSection({
        type: newType,
        titre: SECTION_TYPES[newType]?.label || newType,
        config: {},
        ordre: sections.length + 1,
        actif: true,
      }) as { data?: LandingSection };
      if (res.data) {
        setSections([...sections, res.data]);
      }
      setShowNewModal(false);
      setNewType('');
      showToast('success', 'Section créée');
      refreshPreview();
    } catch {
      showToast('error', 'Erreur création');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Sections</h2>
          <p className="text-sm text-slate-500">Glissez-déposez pour réorganiser. Cliquez pour éditer.</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
        >
          + Nouvelle section
        </button>
      </div>

      {/* Section list */}
      <div className="space-y-2">
        {sections.map((section, index) => {
          const typeInfo = SECTION_TYPES[section.type] || { label: section.type, icon: '📋', description: '' };
          const isEditing = editingId === section.id;

          return (
            <div key={section.id}>
              {/* Section card */}
              <div
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                onClick={() => setEditingId(isEditing ? null : section.id)}
                className={`group flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  isEditing
                    ? 'bg-blue-600/10 border-blue-500/30 shadow-lg shadow-blue-500/5'
                    : section.actif
                      ? 'bg-slate-900/50 border-slate-800 hover:border-slate-600 hover:shadow-md'
                      : 'bg-slate-900/20 border-slate-800/50 opacity-50'
                }`}
              >
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeWidth="2" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" strokeLinecap="round" />
                  </svg>
                </div>

                {/* Type icon */}
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shrink-0">
                  {typeInfo.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{typeInfo.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 font-mono">{section.type}</span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{section.titre || typeInfo.description}</div>
                </div>

                {/* Order badge */}
                <div className="text-xs text-slate-600 font-mono w-6 text-center">#{section.ordre}</div>

                {/* Controls */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleActive(section)}
                    className={`p-1.5 rounded-lg transition text-xs ${
                      section.actif
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                    title={section.actif ? 'Masquer' : 'Activer'}
                  >
                    {section.actif ? '👁️' : '🚫'}
                  </button>
                  <button
                    onClick={() => handleDelete(section.id)}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-xs"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Expanded editor */}
              {isEditing && editingSection && (
                <div className="mt-2 p-5 rounded-xl bg-slate-900/80 border border-slate-700 animate-slide-down">
                  <SectionConfigEditor
                    section={editingSection}
                    onSave={(config) => saveSection(editingSection.id, config)}
                    saving={saving}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sections.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <div className="text-4xl mb-3">📐</div>
          <p>Aucune section. Cliquez sur &quot;Nouvelle section&quot; pour commencer.</p>
        </div>
      )}

      {/* New section modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Ajouter une section</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(SECTION_TYPES).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setNewType(type)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    newType === type
                      ? 'bg-blue-600/20 border-blue-500/40 text-white'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{info.icon}</span>
                    <span className="text-sm font-medium">{info.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{info.description}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={!newType}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition disabled:opacity-30"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
