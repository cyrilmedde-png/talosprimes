'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ChatSession {
  session_id: string;
  message_count: number;
  first_message: string;
  last_message: string;
  has_encrypted: boolean;
}

interface ChatMessage {
  id: number;
  session_id: string;
  message: Record<string, unknown>;
  is_encrypted?: boolean;
  created_at: string;
}

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_URL || 'https://n8n.talosprimes.com';
const CHAT_API_KEY = process.env.NEXT_PUBLIC_CHAT_API_KEY || 'talosprimes-chat-admin-2026';

export default function ConversationsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(false);

  // Charger la liste des sessions
  useEffect(() => {
    const loadSessions = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${N8N_BASE}/webhook/chat-history-list?limit=50`,
          { headers: { 'x-api-key': CHAT_API_KEY } }
        );
        const data = await res.json();
        if (data.success && data.sessions) {
          setSessions(data.sessions);
        }
      } catch (error) {
        console.error('Erreur chargement sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSessions();
  }, []);

  // Charger les messages d'une session
  const loadMessages = async (sessionId: string, decrypt: boolean = false) => {
    setIsLoadingMessages(true);
    setSelectedSession(sessionId);
    setIsDecrypted(decrypt);
    try {
      const res = await fetch(
        `${N8N_BASE}/webhook/chat-history-list?sessionId=${sessionId}&decrypt=${decrypt}`,
        { headers: { 'x-api-key': CHAT_API_KEY } }
      );
      const data = await res.json();
      if (data.success && data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  };

  const formatDuration = (first: string, last: string) => {
    try {
      const diff = new Date(last).getTime() - new Date(first).getTime();
      const min = Math.floor(diff / 60000);
      if (min < 1) return '< 1 min';
      return `${min} min`;
    } catch { return ''; }
  };

  const getMessageContent = (msg: ChatMessage): { role: string; content: string } => {
    const m = msg.message as Record<string, unknown>;
    if (m.encrypted) return { role: 'system', content: '🔒 Message chiffré' };

    const type = (m.type || m.role || '') as string;
    const content = (m.content || m.text || m.data || '') as string;

    if (type === 'human' || type === 'user') return { role: 'client', content: String(content) };
    if (type === 'ai' || type === 'assistant') return { role: 'agent', content: String(content) };
    return { role: 'system', content: JSON.stringify(m).substring(0, 200) };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <Link href="/agent-ia" className="hover:text-cyan-400">Agent IA</Link>
          <span>/</span>
          <span className="text-white">Conversations</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Conversations téléphoniques</h1>
        <p className="text-gray-400 text-sm mt-1">Historique des conversations avec l&apos;agent IA — chiffré RGPD</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Liste des sessions */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 max-h-[75vh] overflow-y-auto">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              📞 Sessions ({sessions.length})
            </h3>
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune conversation enregistrée</p>
              ) : (
                sessions.map(session => (
                  <button
                    key={session.session_id}
                    onClick={() => loadMessages(session.session_id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedSession === session.session_id
                        ? 'bg-cyan-900/30 border border-cyan-700'
                        : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium truncate max-w-[160px]">
                        {session.session_id.substring(0, 16)}...
                      </span>
                      <span className="text-gray-400 text-[10px]">
                        {session.message_count} msg
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">
                        {formatDate(session.last_message)}
                      </span>
                      <div className="flex items-center gap-1">
                        {session.has_encrypted && (
                          <span className="text-amber-400 text-[10px]">🔒</span>
                        )}
                        <span className="text-gray-500 text-[10px]">
                          {formatDuration(session.first_message, session.last_message)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages de la session */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-4 max-h-[75vh] overflow-y-auto">
            {selectedSession ? (
              <>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
                  <h3 className="text-white font-semibold">
                    Conversation {selectedSession.substring(0, 20)}...
                  </h3>
                  <div className="flex items-center gap-2">
                    {!isDecrypted ? (
                      <button
                        onClick={() => loadMessages(selectedSession, true)}
                        className="text-amber-400 hover:text-amber-300 text-xs px-3 py-1.5 rounded-lg bg-amber-900/20 hover:bg-amber-900/40 border border-amber-700/50 transition-colors"
                      >
                        🔓 Déchiffrer
                      </button>
                    ) : (
                      <span className="text-green-400 text-xs px-3 py-1.5 rounded-lg bg-green-900/20 border border-green-700/50">
                        ✅ Déchiffré
                      </span>
                    )}
                  </div>
                </div>

                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-gray-500 text-sm">Aucun message dans cette conversation</p>
                    ) : (
                      messages.map((msg, idx) => {
                        const { role, content } = getMessageContent(msg);
                        return (
                          <div
                            key={msg.id || idx}
                            className={`flex ${role === 'client' ? 'justify-start' : role === 'agent' ? 'justify-end' : 'justify-center'}`}
                          >
                            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                              role === 'client'
                                ? 'bg-gray-700 text-white'
                                : role === 'agent'
                                ? 'bg-cyan-900/40 text-cyan-100 border border-cyan-800/50'
                                : 'bg-gray-700/30 text-gray-400 text-xs'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-medium ${
                                  role === 'client' ? 'text-amber-400' : role === 'agent' ? 'text-cyan-400' : 'text-gray-500'
                                }`}>
                                  {role === 'client' ? '👤 Client' : role === 'agent' ? '🤖 Agent' : '⚙️ Système'}
                                </span>
                                <span className="text-gray-500 text-[10px]">
                                  {formatDate(msg.created_at)}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{content}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center">
                  <p className="text-gray-500 text-4xl mb-3">💬</p>
                  <p className="text-gray-400 text-sm">Sélectionnez une conversation pour voir les messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
