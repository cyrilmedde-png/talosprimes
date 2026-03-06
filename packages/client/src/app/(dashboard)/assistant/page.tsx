'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import { SparklesIcon, PaperAirplaneIcon, MicrophoneIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';

type Message = { role: 'user' | 'assistant'; content: string };
type UploadedFile = { fileId: string; filename: string; size: number };

// Web Speech API (non standard, pas dans les types DOM par défaut)
interface SpeechRecognitionResult {
  length: number;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

export default function AssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      setSpeechSupported(!!SpeechRecognitionAPI);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    // Afficher les noms de fichiers joints dans le message utilisateur
    const fileNames = uploadedFiles.map((f) => f.filename);
    const displayText = fileNames.length > 0
      ? `${trimmed}\n📎 ${fileNames.join(', ')}`
      : trimmed;
    setMessages((prev) => [...prev, { role: 'user', content: displayText }]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const fileIds = uploadedFiles.map((f) => f.fileId);
      const res = await apiClient.agent.chat(trimmed, history, fileIds.length > 0 ? fileIds : undefined);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      if (!res.success && res.error) setError(res.error);
      // Vider les fichiers après envoi
      setUploadedFiles([]);
      return res.reply;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(msg);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Erreur : ${msg}` }]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loading, messages, uploadedFiles]);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const fr = voices.find((v) => v.lang.startsWith('fr'));
    if (fr) u.voice = fr;
    window.speechSynthesis.speak(u);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', () => {});
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const result = await apiClient.agent.upload(Array.from(files));
      setUploadedFiles((prev) => [...prev, ...result.files]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      // Reset le input pour permettre de re-sélectionner le même fichier
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.fileId !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const handleSendClick = () => {
    const text = input.trim();
    setInput('');
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  const startListening = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI || loading) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = async (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      if (!transcript.trim()) return;
      const reply = await sendMessage(transcript);
      if (voiceMode && reply) speak(reply);
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[400px]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-8 w-8 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Assistant IA TalosPrimes</h1>
        </div>
        {speechSupported && (
          <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={voiceMode}
              onChange={(e) => setVoiceMode(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-sm">Mode voix</span>
          </label>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-4">
        Posez vos questions sur les leads, clients, factures, abonnements, emails, agenda, Qonto et logs. Texte ou voix (activer le mode voix puis cliquer sur le micro).
      </p>

      <div className="flex-1 flex flex-col rounded-xl border border-gray-700 bg-gray-800/50 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <SparklesIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Envoyez un message ou parlez pour commencer.</p>
              <p className="text-sm mt-1">Ex. : &quot;Combien de clients ?&quot;, &quot;Derniers emails&quot;, &quot;Entrées et sorties Qonto ce mois&quot;</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-400 rounded-lg px-4 py-2">
                <span className="animate-pulse">Réflexion…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-900/30 text-red-300 text-sm border-t border-gray-700">
            {error}
          </div>
        )}

        {/* Barre de fichiers joints */}
        {uploadedFiles.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-700 flex flex-wrap gap-2">
            {uploadedFiles.map((f) => (
              <div
                key={f.fileId}
                className="flex items-center gap-1.5 bg-gray-700 rounded-md px-2.5 py-1.5 text-sm text-gray-200"
              >
                <PaperClipIcon className="h-3.5 w-3.5 text-gray-400" />
                <span className="max-w-[150px] truncate">{f.filename}</span>
                <span className="text-gray-500 text-xs">({formatFileSize(f.size)})</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.fileId)}
                  className="text-gray-400 hover:text-red-400 ml-0.5"
                  title="Retirer"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 border-t border-gray-700 flex gap-2 items-center">
          {/* Input file caché */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.zip"
          />
          {/* Bouton pièce jointe */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || uploading}
            className={`rounded-lg p-3 flex-shrink-0 ${
              uploading
                ? 'bg-indigo-700 text-white animate-pulse'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={uploading ? 'Upload en cours…' : 'Joindre un fichier'}
          >
            <PaperClipIcon className="h-6 w-6" />
          </button>
          {speechSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={loading}
              className={`rounded-lg p-3 flex-shrink-0 ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={isListening ? 'Arrêter l\'écoute' : 'Parler'}
            >
              <MicrophoneIcon className="h-6 w-6" />
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={uploadedFiles.length > 0 ? `${uploadedFiles.length} fichier(s) joint(s) — votre message…` : 'Votre message…'}
            className="flex-1 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleSendClick}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-indigo-600 text-white px-4 py-3 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
