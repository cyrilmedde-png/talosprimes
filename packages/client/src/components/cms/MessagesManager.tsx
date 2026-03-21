'use client';

import type { ContactMessage } from './types';

interface Props {
  messages: ContactMessage[];
  setMessages: (m: ContactMessage[]) => void;
  api: {
    markMessageHandled: (id: string) => Promise<unknown>;
    deleteMessage: (id: string) => Promise<unknown>;
  };
  showToast: (type: 'success' | 'error', message: string) => void;
}

export function MessagesManager({ messages, setMessages, api, showToast }: Props) {
  const handleMark = async (id: string) => {
    try {
      await api.markMessageHandled(id);
      setMessages(messages.map(m => m.id === id ? { ...m, traite: true } : m));
      showToast('success', 'Marqué comme traité');
    } catch { showToast('error', 'Erreur'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await api.deleteMessage(id);
      setMessages(messages.filter(m => m.id !== id));
      showToast('success', 'Message supprimé');
    } catch { showToast('error', 'Erreur'); }
  };

  const unread = messages.filter(m => !m.traite).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Messages de contact</h2>
          <p className="text-sm text-slate-500">{messages.length} messages • {unread} non traités</p>
        </div>
      </div>

      <div className="space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`p-4 rounded-xl border transition ${msg.traite ? 'bg-slate-900/30 border-slate-800/50 opacity-60' : 'bg-slate-900/50 border-slate-800'}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {msg.prenom[0]}{msg.nom[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{msg.prenom} {msg.nom}</div>
                  <div className="text-xs text-slate-500">{msg.email} {msg.telephone && `• ${msg.telephone}`}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">{new Date(msg.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                {!msg.traite && (
                  <button onClick={() => handleMark(msg.id)} className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition">
                    ✓ Traiter
                  </button>
                )}
                <button onClick={() => handleDelete(msg.id)} className="text-xs p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">🗑️</button>
              </div>
            </div>
            {msg.entreprise && <div className="text-xs text-slate-500 mb-1">🏢 {msg.entreprise}</div>}
            <p className="text-sm text-slate-300 leading-relaxed">{msg.message}</p>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3">✉️</div>
            <p>Aucun message reçu</p>
          </div>
        )}
      </div>
    </div>
  );
}
