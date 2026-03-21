'use client';

import { useState } from 'react';
import type { GlobalConfig, NavbarConfig, FooterConfig, ThemeConfig } from './types';

interface Props {
  globalConfig: GlobalConfig;
  setGlobalConfig: (c: GlobalConfig) => void;
  api: {
    updateGlobalConfig: (section: string, config: Record<string, unknown>) => Promise<unknown>;
  };
  showToast: (type: 'success' | 'error', message: string) => void;
  refreshPreview: () => void;
}

const PRESETS = [
  { name: 'Dark Slate', bg: '#020617', text: '#e2e8f0', primary: '#2563eb', accent: '#8b5cf6' },
  { name: 'Dark Blue', bg: '#0f172a', text: '#cbd5e1', primary: '#3b82f6', accent: '#06b6d4' },
  { name: 'Midnight', bg: '#0a0a0a', text: '#d4d4d4', primary: '#6366f1', accent: '#ec4899' },
  { name: 'Forest', bg: '#022c22', text: '#d1fae5', primary: '#10b981', accent: '#f59e0b' },
];

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

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value || '#2563eb'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
      />
      <div className="flex-1">
        <div className="text-xs text-slate-400 mb-0.5">{label}</div>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono outline-none"
        />
      </div>
    </div>
  );
}

export function DesignManager({ globalConfig, setGlobalConfig, api, showToast, refreshPreview }: Props) {
  const [activePanel, setActivePanel] = useState<'theme' | 'navbar' | 'footer'>('theme');
  const [saving, setSaving] = useState(false);
  const [navbar, setNavbar] = useState<NavbarConfig>(globalConfig.navbar || {});
  const [footer, setFooter] = useState<FooterConfig>(globalConfig.footer || {});
  const [theme, setTheme] = useState<ThemeConfig>(globalConfig.theme || {});

  const save = async (section: string, config: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.updateGlobalConfig(section, config);
      setGlobalConfig({ ...globalConfig, [section]: config });
      showToast('success', 'Design sauvegardé');
      refreshPreview();
    } catch {
      showToast('error', 'Erreur sauvegarde');
    }
    setSaving(false);
  };

  const panels = [
    { id: 'theme' as const, label: 'Thème', icon: '🎨' },
    { id: 'navbar' as const, label: 'Navbar', icon: '🧭' },
    { id: 'footer' as const, label: 'Footer', icon: '🦶' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Design & Branding</h2>
          <p className="text-sm text-slate-500">Personnalisez l&apos;apparence de votre site</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        {panels.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePanel(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activePanel === p.id ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'bg-slate-800/50 text-slate-400 hover:text-white'
            }`}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Theme panel */}
      {activePanel === 'theme' && (
        <div className="space-y-6">
          {/* Presets */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-2">Thèmes prédéfinis</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setTheme({ bgColor: preset.bg, textColor: preset.text, primaryColor: preset.primary, accentColor: preset.accent })}
                  className="p-3 rounded-xl border border-slate-700 hover:border-slate-500 transition text-left"
                  style={{ background: preset.bg }}
                >
                  <div className="flex gap-1 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: preset.primary }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: preset.accent }} />
                  </div>
                  <div className="text-xs font-medium" style={{ color: preset.text }}>{preset.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom colors */}
          <div className="grid grid-cols-2 gap-4">
            <ColorInput label="Couleur principale" value={theme.primaryColor || ''} onChange={(v) => setTheme({ ...theme, primaryColor: v })} />
            <ColorInput label="Couleur d'accent" value={theme.accentColor || ''} onChange={(v) => setTheme({ ...theme, accentColor: v })} />
            <ColorInput label="Fond" value={theme.bgColor || ''} onChange={(v) => setTheme({ ...theme, bgColor: v })} />
            <ColorInput label="Texte" value={theme.textColor || ''} onChange={(v) => setTheme({ ...theme, textColor: v })} />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">Police</label>
            <TextInput value={theme.fontFamily || ''} onChange={(v) => setTheme({ ...theme, fontFamily: v })} placeholder="Inter, sans-serif" />
          </div>

          <button onClick={() => save('theme', theme as unknown as Record<string, unknown>)} disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition disabled:opacity-50 shadow-lg shadow-blue-600/20">
            {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder le thème'}
          </button>
        </div>
      )}

      {/* Navbar panel */}
      {activePanel === 'navbar' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Texte du logo</label>
              <TextInput value={navbar.logoText || ''} onChange={(v) => setNavbar({ ...navbar, logoText: v })} placeholder="TalosPrimes" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">URL image logo</label>
              <TextInput value={navbar.logo || ''} onChange={(v) => setNavbar({ ...navbar, logo: v })} placeholder="https://..." />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400">Liens de navigation</label>
              <button
                onClick={() => setNavbar({ ...navbar, links: [...(navbar.links || []), { text: '', href: '' }] })}
                className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30"
              >
                + Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {(navbar.links || []).map((link, i) => (
                <div key={i} className="flex gap-2 items-center group">
                  <TextInput value={link.text} onChange={(v) => {
                    const links = [...(navbar.links || [])];
                    links[i] = { ...links[i], text: v };
                    setNavbar({ ...navbar, links });
                  }} placeholder="Texte" />
                  <TextInput value={link.href} onChange={(v) => {
                    const links = [...(navbar.links || [])];
                    links[i] = { ...links[i], href: v };
                    setNavbar({ ...navbar, links });
                  }} placeholder="Lien (/catalogue, #contact)" />
                  <button
                    onClick={() => setNavbar({ ...navbar, links: (navbar.links || []).filter((_, idx) => idx !== i) })}
                    className="w-8 h-8 shrink-0 rounded-lg bg-red-500/10 text-red-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <label className="text-xs font-medium text-slate-400 block mb-2">Bouton CTA</label>
            <div className="grid grid-cols-2 gap-2">
              <TextInput value={navbar.ctaButton?.text || ''} onChange={(v) => setNavbar({ ...navbar, ctaButton: { ...(navbar.ctaButton || { text: '', href: '' }), text: v } })} placeholder="Texte" />
              <TextInput value={navbar.ctaButton?.href || ''} onChange={(v) => setNavbar({ ...navbar, ctaButton: { ...(navbar.ctaButton || { text: '', href: '' }), href: v } })} placeholder="Lien" />
            </div>
          </div>

          <button onClick={() => save('navbar', navbar as unknown as Record<string, unknown>)} disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition disabled:opacity-50 shadow-lg shadow-blue-600/20">
            {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder la navbar'}
          </button>
        </div>
      )}

      {/* Footer panel */}
      {activePanel === 'footer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Nom entreprise</label>
              <TextInput value={footer.companyName || ''} onChange={(v) => setFooter({ ...footer, companyName: v })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Description</label>
              <TextInput value={footer.description || ''} onChange={(v) => setFooter({ ...footer, description: v })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400">Colonnes du footer</label>
              <button
                onClick={() => setFooter({ ...footer, columns: [...(footer.columns || []), { title: '', links: [] }] })}
                className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30"
              >
                + Colonne
              </button>
            </div>
            {(footer.columns || []).map((col, ci) => (
              <div key={ci} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <TextInput value={col.title} onChange={(v) => {
                    const cols = [...(footer.columns || [])];
                    cols[ci] = { ...cols[ci], title: v };
                    setFooter({ ...footer, columns: cols });
                  }} placeholder="Titre colonne" />
                  <button onClick={() => setFooter({ ...footer, columns: (footer.columns || []).filter((_, i) => i !== ci) })} className="ml-2 text-red-400 text-xs">✕</button>
                </div>
                {col.links.map((link, li) => (
                  <div key={li} className="flex gap-2 mb-1">
                    <TextInput value={link.text} onChange={(v) => {
                      const cols = [...(footer.columns || [])];
                      cols[ci].links[li] = { ...cols[ci].links[li], text: v };
                      setFooter({ ...footer, columns: cols });
                    }} placeholder="Texte" />
                    <TextInput value={link.href} onChange={(v) => {
                      const cols = [...(footer.columns || [])];
                      cols[ci].links[li] = { ...cols[ci].links[li], href: v };
                      setFooter({ ...footer, columns: cols });
                    }} placeholder="Lien" />
                  </div>
                ))}
                <button
                  onClick={() => {
                    const cols = [...(footer.columns || [])];
                    cols[ci] = { ...cols[ci], links: [...cols[ci].links, { text: '', href: '' }] };
                    setFooter({ ...footer, columns: cols });
                  }}
                  className="text-xs text-blue-400 mt-1"
                >
                  + Lien
                </button>
              </div>
            ))}
          </div>

          <button onClick={() => save('footer', footer as unknown as Record<string, unknown>)} disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition disabled:opacity-50 shadow-lg shadow-blue-600/20">
            {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder le footer'}
          </button>
        </div>
      )}
    </div>
  );
}
