'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function headers() {
  const t = getAccessToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

// ─── Types ───
interface EmailLog {
  id: string;
  email_id: string;
  from_address: string;
  to_address: string;
  subject: string;
  body_preview: string;
  classification: { category?: string; priority?: string; sentiment?: string; intention?: string } | null;
  action: string;
  reply_subject: string | null;
  reply_body: string | null;
  reply_confidence: number | null;
  reply_action: string | null;
  reply_sent_at: string | null;
  tokens_used: number | null;
  created_at: string;
}

interface EmailRule {
  id: string;
  nom: string;
  description: string;
  type_rule: string;
  conditions: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  priorite: number;
  actif: boolean;
  created_at: string;
}

interface Stats {
  total: number;
  queue: number;
  autoReplied: number;
  today: number;
  avgConfidence: number;
  byAction: { action: string; count: string }[];
  byCategory: { category: string; count: string }[];
  byDay: { day: string; count: string; auto_count: string }[];
}

type Tab = 'dashboard' | 'inbox' | 'queue' | 'rules';

// ─── Badge helpers ───
const priorityColors: Record<string, string> = {
  haute: 'bg-red-500/20 text-red-400',
  moyenne: 'bg-amber-500/20 text-amber-400',
  basse: 'bg-slate-700 text-slate-400',
};

const actionLabels: Record<string, { label: string; color: string }> = {
  auto_reply: { label: 'Auto-réponse', color: 'bg-emerald-500/20 text-emerald-400' },
  sent_auto: { label: 'Envoyé (auto)', color: 'bg-emerald-500/20 text-emerald-400' },
  sent_approved: { label: 'Approuvé', color: 'bg-blue-500/20 text-blue-400' },
  queue_human: { label: 'En attente', color: 'bg-amber-500/20 text-amber-400' },
  rejected: { label: 'Rejeté', color: 'bg-red-500/20 text-red-400' },
  classified: { label: 'Classifié', color: 'bg-violet-500/20 text-violet-400' },
};

const ruleActionLabels: Record<string, string> = {
  auto_reply: 'Réponse auto',
  queue_human: 'File humaine',
  ignore: 'Ignorer',
  forward: 'Transférer',
  template_reply: 'Template',
};

export default function EmailAgentPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [queue, setQueue] = useState<EmailLog[]>([]);
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [emailTotal, setEmailTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [editReply, setEditReply] = useState('');
  const [showNewRule, setShowNewRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({ nom: '', description: '', action_type: 'queue_human', priorite: 10, conditions: '{}' });
  const [filter, setFilter] = useState({ search: '', action: '', category: '' });

  // ─── Fetchers ───
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/email-agent/stats`, { headers: headers() });
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch { /* */ }
  }, []);

  const fetchEmails = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (filter.search) params.set('search', filter.search);
      if (filter.action) params.set('action', filter.action);
      if (filter.category) params.set('category', filter.category);
      const res = await fetch(`${API}/api/email-agent/logs?${params}`, { headers: headers() });
      const json = await res.json();
      if (json.success) { setEmails(json.data); setEmailTotal(json.total); }
    } catch { /* */ }
  }, [filter]);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/email-agent/queue`, { headers: headers() });
      const json = await res.json();
      if (json.success) setQueue(json.data);
    } catch { /* */ }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/email-agent/rules`, { headers: headers() });
      const json = await res.json();
      if (json.success) setRules(json.data);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      if (tab === 'dashboard') await fetchStats();
      else if (tab === 'inbox') await fetchEmails();
      else if (tab === 'queue') await fetchQueue();
      else if (tab === 'rules') await fetchRules();
      setLoading(false);
    };
    load();
  }, [tab, fetchStats, fetchEmails, fetchQueue, fetchRules]);

  // ─── Actions ───
  const approveEmail = async (id: string) => {
    await fetch(`${API}/api/email-agent/queue/${id}/approve`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ editedReply: editReply || undefined }),
    });
    setSelectedEmail(null);
    setEditReply('');
    fetchQueue();
    fetchStats();
  };

  const rejectEmail = async (id: string) => {
    await fetch(`${API}/api/email-agent/queue/${id}/reject`, { method: 'POST', headers: headers() });
    setSelectedEmail(null);
    fetchQueue();
    fetchStats();
  };

  const createRule = async () => {
    let parsedConditions = {};
    try { parsedConditions = JSON.parse(ruleForm.conditions); } catch { /* */ }
    await fetch(`${API}/api/email-agent/rules`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ ...ruleForm, conditions: parsedConditions, type_rule: 'static' }),
    });
    setShowNewRule(false);
    setRuleForm({ nom: '', description: '', action_type: 'queue_human', priorite: 10, conditions: '{}' });
    fetchRules();
  };

  const toggleRule = async (rule: EmailRule) => {
    await fetch(`${API}/api/email-agent/rules/${rule.id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ actif: !rule.actif }),
    });
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Supprimer cette règle ?')) return;
    await fetch(`${API}/api/email-agent/rules/${id}`, { method: 'DELETE', headers: headers() });
    fetchRules();
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Vue d\'ensemble', icon: '📊' },
    { id: 'inbox', label: 'Emails reçus', icon: '📨', badge: emailTotal },
    { id: 'queue', label: 'File d\'attente', icon: '⏳', badge: stats?.queue || 0 },
    { id: 'rules', label: 'Règles', icon: '⚙️' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">📧</div>
          Agent IA Email
        </h1>
        <p className="text-sm text-slate-500 mt-1">Gestion automatisée de vos emails entrants</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-slate-900 rounded-xl border border-slate-800 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{t.icon}</span> {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-slate-700'}`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ═══ DASHBOARD ═══ */}
          {tab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: "Emails reçus", value: stats.total, icon: "📨", color: "text-blue-400" },
                  { label: "Aujourd'hui", value: stats.today, icon: "📅", color: "text-white" },
                  { label: "Auto-réponses", value: stats.autoReplied, icon: "🤖", color: "text-emerald-400" },
                  { label: "En attente", value: stats.queue, icon: "⏳", color: "text-amber-400" },
                  { label: "Confiance IA", value: `${stats.avgConfidence}%`, icon: "🎯", color: "text-violet-400" },
                ].map((kpi, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">{kpi.label}</span>
                      <span>{kpi.icon}</span>
                    </div>
                    <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Par catégorie */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <h3 className="text-sm font-semibold text-white mb-4">Par catégorie</h3>
                  <div className="space-y-2">
                    {stats.byCategory.map((c, i) => {
                      const pct = stats.total > 0 ? (parseInt(c.count) / stats.total) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 capitalize">{c.category || 'Non classé'}</span>
                            <span className="text-slate-500">{c.count}</span>
                          </div>
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {stats.byCategory.length === 0 && <p className="text-xs text-slate-600">Aucune donnée</p>}
                  </div>
                </div>

                {/* Par action */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <h3 className="text-sm font-semibold text-white mb-4">Par action</h3>
                  <div className="space-y-2">
                    {stats.byAction.map((a, i) => {
                      const info = actionLabels[a.action] || { label: a.action, color: 'bg-slate-700 text-slate-400' };
                      return (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                          <span className={`text-xs px-2 py-1 rounded-lg ${info.color}`}>{info.label}</span>
                          <span className="text-sm font-semibold text-white">{a.count}</span>
                        </div>
                      );
                    })}
                    {stats.byAction.length === 0 && <p className="text-xs text-slate-600">Aucune donnée</p>}
                  </div>
                </div>
              </div>

              {/* Activity timeline */}
              {stats.byDay.length > 0 && (
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <h3 className="text-sm font-semibold text-white mb-4">Activité (14 derniers jours)</h3>
                  <div className="flex items-end gap-1 h-32">
                    {stats.byDay.slice(0, 14).reverse().map((d, i) => {
                      const maxCount = Math.max(...stats.byDay.map(x => parseInt(x.count)));
                      const pct = maxCount > 0 ? (parseInt(d.count) / maxCount) * 100 : 0;
                      const autoPct = maxCount > 0 ? (parseInt(d.auto_count) / maxCount) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.count} emails`}>
                          <div className="w-full flex flex-col items-stretch" style={{ height: '100px' }}>
                            <div className="flex-1" />
                            <div className="bg-blue-500/30 rounded-t" style={{ height: `${pct}%`, minHeight: pct > 0 ? '4px' : '0' }} />
                            <div className="bg-emerald-500/50 rounded-b" style={{ height: `${autoPct}%`, minHeight: autoPct > 0 ? '2px' : '0' }} />
                          </div>
                          <span className="text-[8px] text-slate-600">{new Date(d.day).getDate()}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500/30" /> Total</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500/50" /> Auto-réponses</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ INBOX ═══ */}
          {tab === 'inbox' && (
            <div>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Rechercher (sujet, email)..."
                  value={filter.search}
                  onChange={e => setFilter({ ...filter, search: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && fetchEmails()}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 w-64"
                />
                <select
                  value={filter.action}
                  onChange={e => { setFilter({ ...filter, action: e.target.value }); }}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white outline-none"
                >
                  <option value="">Toutes actions</option>
                  <option value="auto_reply">Auto-réponse</option>
                  <option value="queue_human">En attente</option>
                  <option value="approved">Approuvé</option>
                  <option value="rejected">Rejeté</option>
                </select>
                <button onClick={fetchEmails} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition">
                  Filtrer
                </button>
              </div>

              {/* Email list */}
              <div className="space-y-2">
                {emails.map(email => {
                  const pri = email.classification?.priority || '';
                  const cat = email.classification?.category || '';
                  const actionInfo = actionLabels[email.action] || actionLabels[email.reply_action || ''] || { label: email.action, color: 'bg-slate-700 text-slate-400' };

                  return (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-600 cursor-pointer transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm shrink-0">
                        {email.from_address?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">{email.from_address}</span>
                          {pri && <span className={`text-[10px] px-1.5 py-0.5 rounded ${priorityColors[pri] || 'bg-slate-700 text-slate-400'}`}>{pri}</span>}
                          {cat && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 capitalize">{cat}</span>}
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-0.5">{email.subject}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] px-2 py-1 rounded-lg ${actionInfo.color}`}>{actionInfo.label}</span>
                        {email.reply_confidence !== null && (
                          <span className="text-[10px] text-slate-500">{Math.round(email.reply_confidence * 100)}%</span>
                        )}
                        <span className="text-[10px] text-slate-600">{formatDate(email.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
                {emails.length === 0 && (
                  <div className="text-center py-16 text-slate-500">
                    <span className="text-4xl block mb-3">📭</span>
                    Aucun email reçu
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ QUEUE ═══ */}
          {tab === 'queue' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Queue list */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white mb-3">
                  {queue.length} email{queue.length > 1 ? 's' : ''} en attente de validation
                </h3>
                {queue.map(email => (
                  <div
                    key={email.id}
                    onClick={() => { setSelectedEmail(email); setEditReply(email.reply_body || ''); }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedEmail?.id === email.id
                        ? 'bg-blue-600/10 border-blue-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{email.from_address}</span>
                      <span className="text-[10px] text-slate-500">{formatDate(email.created_at)}</span>
                    </div>
                    <div className="text-xs text-slate-400 truncate">{email.subject}</div>
                    {email.reply_confidence !== null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full">
                          <div
                            className={`h-full rounded-full ${email.reply_confidence >= 0.8 ? 'bg-emerald-500' : email.reply_confidence >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${email.reply_confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500">{Math.round(email.reply_confidence * 100)}%</span>
                      </div>
                    )}
                  </div>
                ))}
                {queue.length === 0 && (
                  <div className="text-center py-16 text-slate-500">
                    <span className="text-4xl block mb-3">✅</span>
                    Aucun email en attente
                  </div>
                )}
              </div>

              {/* Preview / Approve panel */}
              {selectedEmail && (
                <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-700 space-y-4 sticky top-6">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">De : {selectedEmail.from_address}</div>
                    <h3 className="text-base font-semibold text-white">{selectedEmail.subject}</h3>
                  </div>
                  <div className="text-sm text-slate-300 p-3 bg-slate-800/50 rounded-lg max-h-32 overflow-y-auto">
                    {selectedEmail.body_preview || 'Pas de contenu'}
                  </div>

                  {selectedEmail.classification && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedEmail.classification).map(([k, v]) => (
                        <span key={k} className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400">
                          {k}: <span className="text-white">{String(v)}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Réponse proposée par l&apos;IA</label>
                    <textarea
                      value={editReply}
                      onChange={e => setEditReply(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none resize-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => approveEmail(selectedEmail.id)}
                      className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-500 transition"
                    >
                      ✓ Approuver & envoyer
                    </button>
                    <button
                      onClick={() => rejectEmail(selectedEmail.id)}
                      className="flex-1 py-2.5 bg-red-600/20 text-red-400 text-sm font-medium rounded-xl hover:bg-red-600/30 border border-red-500/20 transition"
                    >
                      ✕ Rejeter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ RULES ═══ */}
          {tab === 'rules' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Règles de traitement</h3>
                <button
                  onClick={() => setShowNewRule(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition"
                >
                  + Nouvelle règle
                </button>
              </div>

              {/* Rule creation form */}
              {showNewRule && (
                <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-700 mb-4 space-y-3">
                  <h4 className="text-sm font-semibold text-white">Nouvelle règle</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Nom</label>
                      <input
                        value={ruleForm.nom}
                        onChange={e => setRuleForm({ ...ruleForm, nom: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none"
                        placeholder="Ex: Emails urgents → file humaine"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Action</label>
                      <select
                        value={ruleForm.action_type}
                        onChange={e => setRuleForm({ ...ruleForm, action_type: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none"
                      >
                        <option value="auto_reply">Réponse automatique</option>
                        <option value="queue_human">File humaine</option>
                        <option value="ignore">Ignorer</option>
                        <option value="forward">Transférer</option>
                        <option value="template_reply">Réponse template</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Description</label>
                    <input
                      value={ruleForm.description}
                      onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none"
                      placeholder="Description optionnelle"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Conditions (JSON)</label>
                      <textarea
                        value={ruleForm.conditions}
                        onChange={e => setRuleForm({ ...ruleForm, conditions: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono outline-none resize-none"
                        placeholder='{"from_contains": "@client.com"}'
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Priorité</label>
                      <input
                        type="number"
                        value={ruleForm.priorite}
                        onChange={e => setRuleForm({ ...ruleForm, priorite: parseInt(e.target.value) || 10 })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white outline-none"
                      />
                      <p className="text-[10px] text-slate-600 mt-1">Plus le nombre est bas, plus la priorité est haute</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={createRule} disabled={!ruleForm.nom} className="px-5 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-500 disabled:opacity-40 transition">
                      Créer
                    </button>
                    <button onClick={() => setShowNewRule(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Rules list */}
              <div className="space-y-2">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{rule.nom}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">{ruleActionLabels[rule.action_type] || rule.action_type}</span>
                        <span className="text-[10px] text-slate-600">P{rule.priorite}</span>
                      </div>
                      {rule.description && <div className="text-xs text-slate-500 mt-0.5">{rule.description}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleRule(rule)}
                        className={`w-10 h-5 rounded-full transition-colors ${rule.actif ? 'bg-blue-600' : 'bg-slate-700'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${rule.actif ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
                {rules.length === 0 && !showNewRule && (
                  <div className="text-center py-16 text-slate-500">
                    <span className="text-4xl block mb-3">⚙️</span>
                    Aucune règle. Créez-en une pour personnaliser le tri de vos emails.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Email detail modal (inbox) */}
      {selectedEmail && tab === 'inbox' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEmail(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[600px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{selectedEmail.subject}</h3>
              <button onClick={() => setSelectedEmail(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex gap-4 text-xs text-slate-500">
                <span>De : <span className="text-slate-300">{selectedEmail.from_address}</span></span>
                <span>À : <span className="text-slate-300">{selectedEmail.to_address}</span></span>
                <span>{formatDate(selectedEmail.created_at)}</span>
              </div>

              {selectedEmail.classification && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedEmail.classification).map(([k, v]) => (
                    <span key={k} className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400">
                      {k}: <span className="text-white capitalize">{String(v)}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="p-3 bg-slate-800/50 rounded-lg text-slate-300">
                {selectedEmail.body_preview || 'Pas de contenu'}
              </div>

              {selectedEmail.reply_body && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Réponse IA :</label>
                  <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg text-slate-300">
                    {selectedEmail.reply_body}
                  </div>
                </div>
              )}

              <div className="flex gap-3 text-xs text-slate-500">
                {selectedEmail.reply_confidence !== null && <span>Confiance : {Math.round(selectedEmail.reply_confidence * 100)}%</span>}
                {selectedEmail.tokens_used && <span>Tokens : {selectedEmail.tokens_used}</span>}
                {selectedEmail.reply_action && (
                  <span className={`px-2 py-0.5 rounded ${(actionLabels[selectedEmail.reply_action] || { color: 'bg-slate-700 text-slate-400' }).color}`}>
                    {(actionLabels[selectedEmail.reply_action] || { label: selectedEmail.reply_action }).label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
