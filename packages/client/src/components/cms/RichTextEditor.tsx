'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback, useRef, useEffect } from 'react';
import { getAccessToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Toolbar Button ───
function Btn({ active, onClick, children, title }: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-slate-700 mx-1" />;
}

// ─── Image Upload Modal ───
function ImageModal({ onClose, onInsert }: { onClose: () => void; onInsert: (url: string, alt?: string) => void }) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getAccessToken();
      const res = await fetch(`${API}/api/landing/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('Erreur upload');
      const json = await res.json();
      onInsert(json.url || json.data?.url, alt || file.name);
    } catch {
      setError('Erreur lors de l\'upload');
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[460px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">Insérer une image</h3>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 bg-slate-800 rounded-lg">
          <button onClick={() => setTab('upload')} className={`flex-1 py-2 rounded-md text-sm font-medium transition ${tab === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            Upload
          </button>
          <button onClick={() => setTab('url')} className={`flex-1 py-2 rounded-md text-sm font-medium transition ${tab === 'url' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            URL externe
          </button>
        </div>

        {tab === 'upload' ? (
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full py-8 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-blue-500 hover:text-blue-400 transition flex flex-col items-center gap-2"
            >
              {uploading ? (
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-2xl">📁</span>
                  <span className="text-sm">Cliquer pour choisir une image</span>
                  <span className="text-xs text-slate-500">JPG, PNG, GIF, WebP — Max 5 Mo</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="url"
              placeholder="https://exemple.com/image.jpg"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <input
              type="text"
              placeholder="Texte alternatif (optionnel)"
              value={alt}
              onChange={e => setAlt(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={() => { if (url) onInsert(url, alt); }}
              disabled={!url}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition disabled:opacity-40"
            >
              Insérer
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─── Video Modal ───
function VideoModal({ onClose, onInsert }: { onClose: () => void; onInsert: (url: string) => void }) {
  const [url, setUrl] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[460px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">Insérer une vidéo</h3>
        <p className="text-xs text-slate-400 mb-3">Collez un lien YouTube ou Vimeo</p>
        <input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">Annuler</button>
          <button
            onClick={() => { if (url) onInsert(url); }}
            disabled={!url}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition disabled:opacity-40"
          >
            Insérer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Link Modal ───
function LinkModal({ onClose, onInsert, initialUrl }: { onClose: () => void; onInsert: (url: string) => void; initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-[420px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">Insérer un lien</h3>
        <input
          type="url"
          placeholder="https://..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none mb-4"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition">Annuler</button>
          <button
            onClick={() => { if (url) onInsert(url); }}
            disabled={!url}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition disabled:opacity-40"
          >
            Insérer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN EDITOR ───
interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Commencez à écrire...', minHeight = '200px' }: RichTextEditorProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-400 underline' } }),
      Youtube.configure({ width: 640, height: 360 }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
    ],
    content: content || '',
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none px-4 py-3',
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Sync content from outside
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const insertImage = useCallback((url: string, alt?: string) => {
    if (editor && url) {
      editor.chain().focus().setImage({ src: url, alt: alt || '' }).run();
    }
    setShowImageModal(false);
  }, [editor]);

  const insertVideo = useCallback((url: string) => {
    if (editor) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
    setShowVideoModal(false);
  }, [editor]);

  const insertLink = useCallback((url: string) => {
    if (editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setShowLinkModal(false);
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-900/50">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-700 bg-slate-800/50">
        {/* Text format */}
        <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras">
          <strong>B</strong>
        </Btn>
        <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique">
          <em>I</em>
        </Btn>
        <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Souligné">
          <span className="underline">U</span>
        </Btn>
        <Btn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Barré">
          <span className="line-through">S</span>
        </Btn>

        <Divider />

        {/* Headings */}
        <Btn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Titre 1">
          H1
        </Btn>
        <Btn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Titre 2">
          H2
        </Btn>
        <Btn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Titre 3">
          H3
        </Btn>

        <Divider />

        {/* Alignment */}
        <Btn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Aligner à gauche">
          ☰
        </Btn>
        <Btn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Centrer">
          ≡
        </Btn>
        <Btn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Aligner à droite">
          ☰
        </Btn>

        <Divider />

        {/* Lists */}
        <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste à puces">
          • ≡
        </Btn>
        <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numérotée">
          1. ≡
        </Btn>
        <Btn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citation">
          ❝
        </Btn>

        <Divider />

        {/* Insert */}
        <Btn onClick={() => setShowLinkModal(true)} active={editor.isActive('link')} title="Lien">
          🔗
        </Btn>
        <Btn onClick={() => setShowImageModal(true)} title="Image">
          🖼️
        </Btn>
        <Btn onClick={() => setShowVideoModal(true)} title="Vidéo YouTube">
          ▶️
        </Btn>

        <Divider />

        {/* Colors */}
        <div className="relative group">
          <Btn onClick={() => {}} title="Couleur du texte">
            <span className="flex items-center gap-1">A<span className="w-3 h-0.5 bg-blue-400 block" /></span>
          </Btn>
          <div className="absolute top-full left-0 mt-1 p-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl hidden group-hover:grid grid-cols-6 gap-1 z-20 w-36">
            {['#ffffff', '#94a3b8', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#a78bfa'].map(color => (
              <button
                key={color}
                onClick={() => editor.chain().focus().setColor(color).run()}
                className="w-5 h-5 rounded border border-slate-600 hover:scale-110 transition"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <button
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="col-span-6 text-[10px] text-slate-400 hover:text-white mt-1"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="flex-1" />

        {/* Code & Clear */}
        <Btn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Code inline">
          {'</>'}
        </Btn>
        <Btn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Bloc de code">
          {'{ }'}
        </Btn>
        <Btn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Effacer le formatage">
          ✕
        </Btn>
      </div>

      {/* Bubble Menu for links */}
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl flex overflow-hidden">
          <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras">
            <strong>B</strong>
          </Btn>
          <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique">
            <em>I</em>
          </Btn>
          <Btn onClick={() => setShowLinkModal(true)} active={editor.isActive('link')} title="Lien">
            🔗
          </Btn>
        </BubbleMenu>
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Modals */}
      {showImageModal && <ImageModal onClose={() => setShowImageModal(false)} onInsert={insertImage} />}
      {showVideoModal && <VideoModal onClose={() => setShowVideoModal(false)} onInsert={insertVideo} />}
      {showLinkModal && <LinkModal onClose={() => setShowLinkModal(false)} onInsert={insertLink} initialUrl={editor.getAttributes('link').href} />}
    </div>
  );
}
