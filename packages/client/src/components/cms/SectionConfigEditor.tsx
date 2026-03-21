'use client';

import { useState } from 'react';
import { SECTION_TYPES } from './types';
import type { LandingSection } from './types';
import { RichTextEditor } from './RichTextEditor';

interface Props {
  section: LandingSection;
  onSave: (config: Record<string, unknown>) => void;
  saving: boolean;
}

// Reusable field components
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none resize-none"
    />
  );
}

// Toggle between simple text and rich editor
function RichField({ label, value, onChange, placeholder, minHeight = '120px' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; minHeight?: string;
}) {
  const [mode, setMode] = useState<'rich' | 'code'>('rich');
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400">{label}</label>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('rich')}
            className={`text-[10px] px-2 py-0.5 rounded ${mode === 'rich' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}
          >
            Visuel
          </button>
          <button
            onClick={() => setMode('code')}
            className={`text-[10px] px-2 py-0.5 rounded ${mode === 'code' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}
          >
            HTML
          </button>
        </div>
      </div>
      {mode === 'rich' ? (
        <RichTextEditor content={value || ''} onChange={onChange} placeholder={placeholder} minHeight={minHeight} />
      ) : (
        <TextArea value={value || ''} onChange={onChange} placeholder={placeholder} rows={6} />
      )}
    </div>
  );
}

// Image field with preview
function ImageField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <div className="flex gap-2">
        <TextInput value={value} onChange={onChange} placeholder={placeholder || 'URL de l\'image'} />
      </div>
      {value && (
        <div className="mt-1 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 p-1">
          <img src={value} alt="preview" className="max-h-20 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
    </div>
  );
}

// Array item management
function ArrayManager<T extends Record<string, unknown>>({
  items,
  onChange,
  renderItem,
  defaultItem,
  label,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, update: (key: string, value: unknown) => void) => React.ReactNode;
  defaultItem: T;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <button
          onClick={() => onChange([...items, { ...defaultItem }])}
          className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition"
        >
          + Ajouter
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="relative p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 group">
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="absolute top-2 right-2 w-5 h-5 rounded bg-red-500/20 text-red-400 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              ✕
            </button>
            {renderItem(item, i, (key, value) => {
              const updated = [...items];
              updated[i] = { ...updated[i], [key]: value };
              onChange(updated);
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Editor ───
export function SectionConfigEditor({ section, onSave, saving }: Props) {
  const [config, setConfig] = useState<Record<string, unknown>>({ ...section.config });

  const set = (key: string, value: unknown) => setConfig({ ...config, [key]: value });
  const get = (key: string, def: unknown = '') => (config[key] as string) ?? def;
  const getArr = (key: string): Record<string, unknown>[] => (config[key] as Record<string, unknown>[]) || [];

  const renderEditor = () => {
    switch (section.type) {
      case 'hero':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Titre principal"><TextInput value={get('title') as string} onChange={(v) => set('title', v)} /></Field>
              <Field label="Titre en surbrillance"><TextInput value={get('titleHighlight') as string} onChange={(v) => set('titleHighlight', v)} /></Field>
            </div>
            <RichField label="Sous-titre" value={get('subtitle') as string} onChange={(v) => set('subtitle', v)} placeholder="Description du hero..." />
            <ImageField label="Image d'arrière-plan" value={get('bgImage') as string} onChange={(v) => set('bgImage', v)} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Badge texte"><TextInput value={(config.badge as Record<string, string>)?.text || ''} onChange={(v) => set('badge', { ...(config.badge as Record<string, unknown> || {}), text: v })} /></Field>
              <Field label="Gradient fond"><TextInput value={get('bgGradient') as string} onChange={(v) => set('bgGradient', v)} placeholder="from-slate-950 via-purple-950/50 to-slate-950" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="text-xs font-medium text-slate-400 block mb-2">CTA Principal</span>
                <div className="space-y-2">
                  <TextInput value={(config.ctaPrimary as Record<string, string>)?.text || ''} onChange={(v) => set('ctaPrimary', { ...(config.ctaPrimary as Record<string, unknown> || {}), text: v })} placeholder="Texte du bouton" />
                  <TextInput value={(config.ctaPrimary as Record<string, string>)?.link || ''} onChange={(v) => set('ctaPrimary', { ...(config.ctaPrimary as Record<string, unknown> || {}), link: v })} placeholder="/inscription" />
                </div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="text-xs font-medium text-slate-400 block mb-2">CTA Secondaire</span>
                <div className="space-y-2">
                  <TextInput value={(config.ctaSecondary as Record<string, string>)?.text || ''} onChange={(v) => set('ctaSecondary', { ...(config.ctaSecondary as Record<string, unknown> || {}), text: v })} placeholder="Texte du bouton" />
                  <TextInput value={(config.ctaSecondary as Record<string, string>)?.link || ''} onChange={(v) => set('ctaSecondary', { ...(config.ctaSecondary as Record<string, unknown> || {}), link: v })} placeholder="#demo" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'stats':
        return (
          <ArrayManager
            items={getArr('stats')}
            onChange={(items) => set('stats', items)}
            defaultItem={{ value: '', label: '', suffix: '' }}
            label="Statistiques"
            renderItem={(item, _i, update) => (
              <div className="grid grid-cols-3 gap-2">
                <TextInput value={(item.value as string) || ''} onChange={(v) => update('value', v)} placeholder="Valeur (ex: 500+)" />
                <TextInput value={(item.label as string) || ''} onChange={(v) => update('label', v)} placeholder="Label" />
                <TextInput value={(item.suffix as string) || ''} onChange={(v) => update('suffix', v)} placeholder="Suffixe" />
              </div>
            )}
          />
        );

      case 'modules':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Titre"><TextInput value={get('title') as string} onChange={(v) => set('title', v)} /></Field>
              <Field label="Sous-titre"><TextInput value={get('subtitle') as string} onChange={(v) => set('subtitle', v)} /></Field>
            </div>
            <ArrayManager
              items={getArr('modules')}
              onChange={(items) => set('modules', items)}
              defaultItem={{ icon: 'Zap', titre: '', description: '', features: [], image: '' }}
              label="Modules"
              renderItem={(item, _i, update) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <TextInput value={(item.icon as string) || ''} onChange={(v) => update('icon', v)} placeholder="Icône" />
                    <TextInput value={(item.titre as string) || ''} onChange={(v) => update('titre', v)} placeholder="Titre" />
                    <TextInput value={(item.couleur as string) || ''} onChange={(v) => update('couleur', v)} placeholder="Couleur" />
                  </div>
                  <RichField label="Description" value={(item.description as string) || ''} onChange={(v) => update('description', v)} placeholder="Description du module..." minHeight="80px" />
                  <ImageField label="Image du module" value={(item.image as string) || ''} onChange={(v) => update('image', v)} />
                  <TextInput value={((item.features as string[]) || []).join(', ')} onChange={(v) => update('features', v.split(',').map(s => s.trim()).filter(Boolean))} placeholder="Features (séparées par virgule)" />
                </div>
              )}
            />
          </div>
        );

      case 'how_it_works':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Titre"><TextInput value={get('title') as string} onChange={(v) => set('title', v)} /></Field>
              <Field label="Sous-titre"><TextInput value={get('subtitle') as string} onChange={(v) => set('subtitle', v)} /></Field>
            </div>
            <ArrayManager
              items={getArr('steps')}
              onChange={(items) => set('steps', items)}
              defaultItem={{ title: '', description: '', icon: 'Zap', image: '' }}
              label="Étapes"
              renderItem={(item, _i, update) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput value={(item.title as string) || ''} onChange={(v) => update('title', v)} placeholder="Titre de l'étape" />
                    <TextInput value={(item.icon as string) || ''} onChange={(v) => update('icon', v)} placeholder="Icône" />
                  </div>
                  <RichField label="Description" value={(item.description as string) || ''} onChange={(v) => update('description', v)} placeholder="Description de l'étape..." minHeight="80px" />
                  <ImageField label="Image" value={(item.image as string) || ''} onChange={(v) => update('image', v)} />
                </div>
              )}
            />
          </div>
        );

      case 'testimonials':
        return (
          <div className="space-y-4">
            <Field label="Titre"><TextInput value={get('title') as string} onChange={(v) => set('title', v)} /></Field>
            <RichField label="Sous-titre" value={get('subtitle') as string} onChange={(v) => set('subtitle', v)} />
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <Field label="Titre"><TextInput value={get('title') as string} onChange={(v) => set('title', v)} /></Field>
            <RichField label="Sous-titre" value={get('subtitle') as string} onChange={(v) => set('subtitle', v)} />
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400">Rappel IA activé</label>
              <button
                onClick={() => set('showCallback', !config.showCallback)}
                className={`w-10 h-5 rounded-full transition-colors ${config.showCallback ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${config.showCallback ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="space-y-4">
            <Field label="Titre"><TextInput value={get('title') as string} onChange={(v) => set('title', v)} /></Field>
            <RichField label="Sous-titre" value={get('subtitle') as string} onChange={(v) => set('subtitle', v)} />
            <Field label="Gradient fond"><TextInput value={get('bgGradient') as string} onChange={(v) => set('bgGradient', v)} placeholder="from-slate-950 via-slate-900 to-slate-950" /></Field>
            <ImageField label="Image de fond" value={get('bgImage') as string} onChange={(v) => set('bgImage', v)} />
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="text-xs font-medium text-slate-400 block mb-2">CTA Principal</span>
                <div className="space-y-2">
                  <TextInput value={(config.ctaPrimary as Record<string, string>)?.text || ''} onChange={(v) => set('ctaPrimary', { ...(config.ctaPrimary as Record<string, unknown> || {}), text: v })} placeholder="Texte" />
                  <TextInput value={(config.ctaPrimary as Record<string, string>)?.link || ''} onChange={(v) => set('ctaPrimary', { ...(config.ctaPrimary as Record<string, unknown> || {}), link: v })} placeholder="Lien" />
                </div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <span className="text-xs font-medium text-slate-400 block mb-2">CTA Secondaire</span>
                <div className="space-y-2">
                  <TextInput value={(config.ctaSecondary as Record<string, string>)?.text || ''} onChange={(v) => set('ctaSecondary', { ...(config.ctaSecondary as Record<string, unknown> || {}), text: v })} placeholder="Texte" />
                  <TextInput value={(config.ctaSecondary as Record<string, string>)?.link || ''} onChange={(v) => set('ctaSecondary', { ...(config.ctaSecondary as Record<string, unknown> || {}), link: v })} placeholder="Lien" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'agent_ia':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Titre"><TextInput value={get('title') as string} onChange={(v) => set('title', v)} /></Field>
              <Field label="Titre en surbrillance"><TextInput value={get('titleHighlight') as string} onChange={(v) => set('titleHighlight', v)} /></Field>
            </div>
            <RichField label="Sous-titre" value={get('subtitle') as string} onChange={(v) => set('subtitle', v)} />
            <Field label="Gradient fond"><TextInput value={get('bgGradient') as string} onChange={(v) => set('bgGradient', v)} /></Field>
            <ArrayManager
              items={getArr('features')}
              onChange={(items) => set('features', items)}
              defaultItem={{ icon: 'Brain', text: '' }}
              label="Fonctionnalités"
              renderItem={(item, _i, update) => (
                <div className="grid grid-cols-4 gap-2">
                  <TextInput value={(item.icon as string) || ''} onChange={(v) => update('icon', v)} placeholder="Icône" />
                  <div className="col-span-3">
                    <TextInput value={(item.text as string) || ''} onChange={(v) => update('text', v)} placeholder="Texte" />
                  </div>
                </div>
              )}
            />
            <ArrayManager
              items={getArr('chatMessages')}
              onChange={(items) => set('chatMessages', items)}
              defaultItem={{ role: 'user', text: '' }}
              label="Messages chat démo"
              renderItem={(item, _i, update) => (
                <div className="grid grid-cols-4 gap-2">
                  <select
                    value={(item.role as string) || 'user'}
                    onChange={(e) => update('role', e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-white px-2 py-2 outline-none"
                  >
                    <option value="user">Client</option>
                    <option value="assistant">IA</option>
                  </select>
                  <div className="col-span-3">
                    <TextInput value={(item.text as string) || ''} onChange={(v) => update('text', v)} placeholder="Message" />
                  </div>
                </div>
              )}
            />
          </div>
        );

      case 'trust_badges':
        return (
          <ArrayManager
            items={getArr('badges')}
            onChange={(items) => set('badges', items)}
            defaultItem={{ icon: 'Shield', text: '' }}
            label="Badges de confiance"
            renderItem={(item, _i, update) => (
              <div className="grid grid-cols-3 gap-2">
                <TextInput value={(item.icon as string) || ''} onChange={(v) => update('icon', v)} placeholder="Icône" />
                <div className="col-span-2">
                  <TextInput value={(item.text as string) || ''} onChange={(v) => update('text', v)} placeholder="Texte" />
                </div>
              </div>
            )}
          />
        );

      case 'dashboard_showcase':
        return (
          <div className="space-y-4">
            <Field label="Titre"><TextInput value={get('title') as string} onChange={(v) => set('title', v)} /></Field>
            <RichField label="Sous-titre" value={get('subtitle') as string} onChange={(v) => set('subtitle', v)} />
            <ImageField label="Image de la démo" value={get('demoImage') as string} onChange={(v) => set('demoImage', v)} />
          </div>
        );

      case 'upcoming':
        return (
          <div className="space-y-4">
            <Field label="Titre"><TextInput value={get('title') as string} onChange={(v) => set('title', v)} /></Field>
            <RichField label="Sous-titre" value={get('subtitle') as string} onChange={(v) => set('subtitle', v)} />
            <ArrayManager
              items={getArr('items')}
              onChange={(items) => set('items', items)}
              defaultItem={{ icon: 'Zap', title: '', description: '' }}
              label="Éléments à venir"
              renderItem={(item, _i, update) => (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput value={(item.title as string) || ''} onChange={(v) => update('title', v)} placeholder="Titre" />
                    <TextInput value={(item.icon as string) || ''} onChange={(v) => update('icon', v)} placeholder="Icône" />
                  </div>
                  <RichField label="Description" value={(item.description as string) || ''} onChange={(v) => update('description', v)} minHeight="60px" />
                </div>
              )}
            />
          </div>
        );

      case 'carousel':
        return (
          <div className="space-y-4">
            <Field label="Titre"><TextInput value={get('title') as string} onChange={(v) => set('title', v)} /></Field>
            <RichField label="Sous-titre" value={get('subtitle') as string} onChange={(v) => set('subtitle', v)} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Autoplay">
                <select className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white" value={String(get('autoplay')) === 'false' ? 'false' : 'true'} onChange={(e) => set('autoplay', e.target.value === 'true')}>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </Field>
              <Field label="Intervalle (ms)"><TextInput value={String(get('interval') || 5000)} onChange={(v) => set('interval', parseInt(v) || 5000)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cadre navigateur">
                <select className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white" value={String(get('showBrowserFrame')) === 'false' ? 'false' : 'true'} onChange={(e) => set('showBrowserFrame', e.target.value === 'true')}>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </Field>
              <Field label="URL affichée"><TextInput value={(get('browserUrl') as string) || ''} onChange={(v) => set('browserUrl', v)} placeholder="app.talosprimes.com" /></Field>
            </div>
            <ArrayManager
              items={getArr('slides')}
              onChange={(items) => set('slides', items)}
              defaultItem={{ image: '', title: '', subtitle: '' }}
              label="Slides (images)"
              renderItem={(item, _i, update) => (
                <div className="space-y-2">
                  <ImageField label="Image du slide" value={(item.image as string) || ''} onChange={(v) => update('image', v)} />
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput value={(item.title as string) || ''} onChange={(v) => update('title', v)} placeholder="Titre (optionnel)" />
                    <TextInput value={(item.subtitle as string) || ''} onChange={(v) => update('subtitle', v)} placeholder="Sous-titre (optionnel)" />
                  </div>
                </div>
              )}
            />
          </div>
        );

      case 'custom_html':
        return (
          <div className="space-y-4">
            <RichField label="Contenu" value={get('html') as string} onChange={(v) => set('html', v)} minHeight="300px" placeholder="Contenu de la section..." />
            <Field label="Couleur de fond"><TextInput value={get('bgColor') as string} onChange={(v) => set('bgColor', v)} placeholder="#1e293b" /></Field>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <Field label="Configuration JSON">
              <TextArea
                value={JSON.stringify(config, null, 2)}
                onChange={(v) => { try { setConfig(JSON.parse(v)); } catch { /* ignore */ } }}
                rows={12}
                placeholder="{}"
              />
            </Field>
          </div>
        );
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{SECTION_TYPES[section.type]?.icon || '📋'}</span>
        <h3 className="text-base font-semibold text-white">{SECTION_TYPES[section.type]?.label || section.type}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 font-mono">{section.type}</span>
      </div>

      {renderEditor()}

      <div className="flex justify-end mt-5 pt-4 border-t border-slate-800">
        <button
          onClick={() => onSave(config)}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition disabled:opacity-50 shadow-lg shadow-blue-600/20"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : '💾'}
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
}
