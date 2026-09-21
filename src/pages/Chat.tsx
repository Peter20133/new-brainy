import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  FileText,
  Lightbulb,
  Brain,
  HelpCircle,
  Trash2,
  User,
  Image as ImageIcon,
  Camera,
  X,
} from 'lucide-react';
import { useStore } from '@/store';
import { aiService, AINotConfiguredError } from '@/lib/ai';
import { LoadingSpinner } from '@/components/ui';
import { QUICK_PROMPTS, GRADE_LABELS } from '@/constants';

const PROMPT_ICONS: Record<string, typeof BookOpen> = {
  'Explică-mi lecția': BookOpen,
  'Fă-mi un rezumat': FileText,
  'Dă-mi un exemplu': Lightbulb,
  'Testează-mă': Brain,
  'Nu înțeleg': HelpCircle,
};

export function ChatPage() {
  const { profile, chatMessages, addChatMessage, clearChat } = useStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatImage, setChatImage] = useState<string | null>(null);
  const [chatImageName, setChatImageName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, sending]);

  // Handle Ctrl+V paste for screenshots / images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (sending) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processChatImage(file, 'Captură lipită');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [sending]);

  const processChatImage = (file: File, name?: string) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setChatImage(result);
        setChatImageName(name || file.name || 'Imagine');
      }
    };
    reader.readAsDataURL(file);
  };

  const removeChatImage = () => {
    setChatImage(null);
    setChatImageName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSend = async (text?: string) => {
    const message = (text || input).trim();
    if ((!message && !chatImage) || !profile || sending) return;

    const outgoingMessage = message || 'Explică-mi ce este în această imagine și ajută-mă să înțeleg.';
    const outgoingImage = chatImage;

    setInput('');
    removeChatImage();
    setSending(true);

    await addChatMessage('user', outgoingMessage, outgoingImage || undefined);

    try {
      const history = chatMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const response = await aiService.chat(profile, outgoingMessage, history, outgoingImage || undefined);
      await addChatMessage('assistant', response);
    } catch (err) {
      if (err instanceof AINotConfiguredError) {
        await addChatMessage('assistant', err.message);
      } else {
        await addChatMessage('assistant', 'Scuze, a apărut o problemă tehnică. Încearcă din nou!');
      }
    } finally {
      setSending(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Întreabă AI</h1>
          <p className="text-xs text-slate-500">
            Tutor dedicat pentru {GRADE_LABELS[profile.grade]}
          </p>
        </div>
        {chatMessages.length > 0 && (
          <button onClick={clearChat} className="btn-ghost text-xs">
            <Trash2 size={14} />
            <span>Șterge conversația</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {chatMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs">
              <Sparkles size={22} />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-800">
              Salut, {profile.name}! Cu ce te ajut azi?
            </h3>
            <p className="mt-1 max-w-xs text-center text-xs text-slate-500">
              Întreabă-mă despre orice temă, regulă de gramatică, formulă, încarcă o fotografie sau o captură de ecran.
            </p>

            {/* Quick prompts */}
            <div className="mt-5 grid w-full max-w-md grid-cols-1 gap-1.5">
              {QUICK_PROMPTS.map((p) => {
                const Icon = PROMPT_ICONS[p.icon] || BookOpen;
                return (
                  <button
                    key={p.label}
                    onClick={() => handleSend(p.label)}
                    className="card flex items-center gap-2.5 p-3 text-left transition-all hover:border-slate-300 active:scale-[0.99]"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon size={15} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                msg.role === 'user'
                  ? 'bg-slate-200 text-slate-600'
                  : 'bg-slate-900 text-white'
              }`}
            >
              {msg.role === 'user' ? <User size={15} /> : <Sparkles size={14} />}
            </div>
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed sm:text-sm ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200/80 text-slate-800 shadow-xs'
              }`}
            >
              {msg.imageData && (
                <div className="mb-2 max-w-xs overflow-hidden rounded-xl border border-white/20 bg-black/10">
                  <img
                    src={msg.imageData}
                    alt="Poză atașată"
                    className="max-h-48 w-full object-contain"
                  />
                </div>
              )}
              <p className="whitespace-pre-line">{msg.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Sparkles size={14} />
            </div>
            <div className="rounded-2xl bg-white border border-slate-200/80 px-4 py-2.5 shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <LoadingSpinner size={14} className="text-brand-600" />
                <span>Brainy analizează și formulează răspunsul...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200/80 bg-white/95 pt-2.5 backdrop-blur">
        {chatMessages.length > 0 && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {QUICK_PROMPTS.slice(0, 5).map((p) => {
              const Icon = PROMPT_ICONS[p.icon] || BookOpen;
              return (
                <button
                  key={p.label}
                  onClick={() => handleSend(p.label)}
                  disabled={sending}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <Icon size={12} />
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Image preview in input area */}
        {chatImage && (
          <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <img
                src={chatImage}
                alt="Miniatură"
                className="h-9 w-9 rounded-lg object-cover border border-slate-200"
              />
              <span className="font-semibold text-slate-700 truncate">
                {chatImageName || 'Poză atașată'}
              </span>
            </div>
            <button
              onClick={removeChatImage}
              className="text-slate-400 hover:text-red-600 p-1 rounded"
              title="Elimină poza"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-1.5 pb-2">
          {/* Add image button */}
          <div className="flex items-center gap-1 pb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title="Încarcă o poză sau captură de ecran"
            >
              <ImageIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title="Fă o fotografie"
            >
              <Camera size={18} />
            </button>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Scrie o întrebare, lipește o poză (Ctrl+V)..."
            className="input-field max-h-32 min-h-[44px] flex-1 resize-none py-2.5 text-xs sm:text-sm"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && !chatImage) || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-xs transition-colors hover:bg-brand-700 active:scale-95 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processChatImage(f, f.name);
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processChatImage(f, 'Fotografie cameră');
        }}
      />
    </div>
  );
}
