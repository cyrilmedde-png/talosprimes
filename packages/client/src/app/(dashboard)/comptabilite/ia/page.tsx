'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { SparklesIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export default function IAComptablePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async (action: string, question?: string) => {
    try {
      setLoading(true);
      setError('');

      if (question) {
        setMessages(prev => [...prev, { role: 'user', content: question, timestamp: new Date() }]);
      }

      const res = await apiClient.comptabilite.iaAgent({
        action,
        ...(question ? { question } : {}),
      });

      if (res.success && res.data) {
        const content = typeof res.data === 'string'
          ? res.data
          : res.data.resultat || res.data.reponse || res.data.rapport || JSON.stringify(res.data, null, 2);
        setMessages(prev => [...prev, { role: 'assistant', content, timestamp: new Date() }]);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    const q = input;
    setInput('');
    sendMessage('question', q);
  };

  const quickActions = [
    { label: 'Analyser les anomalies', action: 'analyser', description: 'Détecte les écritures déséquilibrées, comptes suspects, etc.' },
    { label: 'Générer un rapport', action: 'rapport', description: 'Rapport de synthèse comptable avec KPIs et recommandations' },
    { label: 'Vérifier la TVA', action: 'question', question: 'Peux-tu vérifier la cohérence de ma TVA collectée vs déductible ?' },
    { label: 'Conseils clôture', action: 'question', question: 'Quels points vérifier avant la clôture de l\'exercice ?' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center gap-3 mb-4">
        <SparklesIcon className="h-8 w-8 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Agent IA Comptable</h1>
          <p className="text-gray-400 text-sm">Posez vos questions comptables, demandez des analyses ou rapports. Propulsé par GPT-4o.</p>
        </div>
      </div>

      {error && <div className="mb-3 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg text-sm">{error}</div>}

      {/* Actions rapides */}
      {messages.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {quickActions.map((qa, i) => (
            <button
              key={i}
              onClick={() => sendMessage(qa.action, qa.question)}
              disabled={loading}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-4 text-left transition-colors disabled:opacity-50"
            >
              <span className="text-amber-400 font-medium text-sm">{qa.label}</span>
              <p className="text-gray-400 text-xs mt-1">{qa.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 bg-gray-900/50 rounded-xl border border-gray-700 p-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <SparklesIcon className="h-12 w-12 mx-auto mb-3 text-gray-600" />
            <p>Posez une question ou utilisez une action rapide ci-dessus</p>
            <p className="text-xs mt-1">L&apos;IA a accès à votre plan comptable, balance et écritures</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-amber-500/20 border border-amber-500/30 text-white'
                : 'bg-gray-800 border border-gray-700 text-gray-200'
            }`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <SparklesIcon className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-400 text-xs font-medium">Agent IA</span>
                </div>
              )}
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{msg.content}</pre>
              <span className="text-gray-500 text-xs block mt-1.5">
                {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full" />
                <span className="text-gray-400 text-sm">Analyse en cours...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          placeholder="Posez votre question comptable..."
          disabled={loading}
          className="flex-1 bg-gray-800 border border-gray-600 text-white rounded-xl px-4 py-3 placeholder-gray-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
