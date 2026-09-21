import { useState, useRef, useCallback } from 'react';
import { Camera, Image as ImageIcon, FileText, X, Sparkles, Volume2, Brain, Layers, ChevronDown, HelpCircle, Check } from 'lucide-react';
import { useStore } from '@/store';
import { aiService } from '@/lib/ai';
import { PageHeader, LoadingSpinner, ErrorState } from '@/components/ui';
import type { LessonAnalysis, PageId } from '@/types';

export function PhotoLearn({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile, addLesson, addStudySession, upsertProgress, checkAndAwardBadges } = useStore();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<LessonAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [explainingSelection, setExplainingSelection] = useState(false);
  const [simplifiedExplanation, setSimplifiedExplanation] = useState(false);
  const [extraExplanation, setExtraExplanation] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [awardedBadges, setAwardedBadges] = useState<string[]>([]);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    setAnalysis(null);
    setExtraExplanation(null);
    setFileName(file.name);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImagePreview(dataUrl);
        setImageData(dataUrl);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      // For PDFs, we show a file representation
      setImagePreview(null);
      setImageData(null);
      setFileName(file.name);
    }
  }, []);

  const handleCamera = () => cameraInputRef.current?.click();
  const handleGallery = () => galleryInputRef.current?.click();
  const handlePdf = () => pdfInputRef.current?.click();

  const handleAnalyze = async () => {
    if (!profile) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await aiService.analyzeLesson(profile, fileName || ' lecție nouă', imageData || undefined);
      setAnalysis(result);

      // Save to DB
      await addLesson({
        title: result.title,
        subject: result.subject,
        grade: profile.grade,
        short_summary: result.short_summary,
        simple_explanation: result.simple_explanation,
        detailed_explanation: result.detailed_explanation,
        key_ideas: result.key_ideas,
        important_terms: result.important_terms,
        example: result.example,
        raw_content: fileName,
      });

      // Track progress
      if (result.subject) {
        await upsertProgress(result.subject, { lessons_completed: 1, xp_earned: 30 });
        await addStudySession(result.subject, 'lesson', 10);
      }

      const newBadges = await checkAndAwardBadges();
      if (newBadges.length > 0) setAwardedBadges(newBadges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut analiza lecția. Încearcă din nou.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setImageData(null);
    setFileName('');
    setAnalysis(null);
    setError(null);
    setExtraExplanation(null);
    setSelectedText('');
  };

  const handleExplainSimpler = async () => {
    if (!profile || !analysis) return;
    setExplainingSelection(true);
    try {
      const text = selectedText || analysis.simple_explanation;
      const simpler = await aiService.explainSimpler(profile, text);
      setExtraExplanation(simpler);
      setSimplifiedExplanation(true);
    } catch {
      setError('Nu am putut simplifica explicația. Încearcă din nou.');
    } finally {
      setExplainingSelection(false);
    }
  };

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ro-RO';
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';
    setSelectedText(text);
  };

  if (analyzing) {
    return (
      <div className="space-y-4">
        <PageHeader title="Poza & Învață" subtitle="Încarcă o lecție pentru explicație și structurare." />
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <LoadingSpinner size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-800">Brainy analizează lecția...</h3>
          <p className="mt-1 text-xs text-slate-500">Extragem conceptele-cheie, rezumatul și exemplele clare.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Poza & Învață" subtitle="Încarcă o lecție pentru explicație și structurare." />

      {/* Badge notifications */}
      {awardedBadges.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-600" />
            <p className="text-xs font-bold text-amber-800">
              Ai deblocat {awardedBadges.length} {awardedBadges.length === 1 ? 'insignă nouă' : 'insigne noi'}!
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <ErrorState message={error} onRetry={handleAnalyze} />}

      {/* Upload section */}
      {!analysis && (
        <>
          {!imagePreview && !fileName ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <UploadOption
                icon={Camera}
                label="Fă o poză"
                desc="Folosește camera foto"
                iconBg="bg-blue-50 text-blue-600"
                onClick={handleCamera}
              />
              <UploadOption
                icon={ImageIcon}
                label="Galerie foto"
                desc="Alege o imagine din fișiere"
                iconBg="bg-indigo-50 text-indigo-600"
                onClick={handleGallery}
              />
              <UploadOption
                icon={FileText}
                label="Document PDF"
                desc="Încarcă notițe sau curs"
                iconBg="bg-slate-100 text-slate-700"
                onClick={handlePdf}
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 p-3.5">
                <span className="text-xs font-bold text-slate-700">Previzualizare document</span>
                <button onClick={handleReset} className="btn-ghost text-xs p-1">
                  <X size={14} />
                  <span>Elimină</span>
                </button>
              </div>
              {imagePreview ? (
                <img src={imagePreview} alt="Previzualizare lecție" className="max-h-72 w-full object-contain bg-slate-50" />
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText size={36} className="text-slate-400" />
                  <p className="mt-2 text-xs font-medium text-slate-600">{fileName}</p>
                </div>
              )}
              <div className="p-3.5 border-t border-slate-100">
                <button onClick={handleAnalyze} className="btn-primary w-full text-xs">
                  <Sparkles size={16} />
                  Analizează lecția cu Brainy
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Analysis results */}
      {analysis && (
        <div className="space-y-4 animate-slide-up">
          {/* Title */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{analysis.subject}</p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-900">{analysis.title}</h2>
              </div>
              <button onClick={handleReset} className="btn-ghost text-sm">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Pe scurt */}
          <Section title="Pe scurt" icon={Sparkles}>
            <p className="text-sm leading-relaxed text-slate-600" onMouseUp={handleTextSelection}>{analysis.short_summary}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => handleSpeak(analysis.short_summary)} className="btn-ghost text-xs">
                <Volume2 size={14} />
                {speaking ? 'Oprește' : 'Citește'}
              </button>
            </div>
          </Section>

          {/* Explicație simplă */}
          <Section title="Explicație simplă" icon={Brain}>
            <p className="text-sm leading-relaxed text-slate-600" onMouseUp={handleTextSelection}>
              {extraExplanation && simplifiedExplanation ? extraExplanation : analysis.simple_explanation}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={handleExplainSimpler} disabled={explainingSelection} className="btn-ghost text-xs">
                {explainingSelection ? <LoadingSpinner size={14} /> : <HelpCircle size={14} />}
                {selectedText ? 'Explică selecția mai simplu' : 'Explică mai simplu'}
              </button>
              <button onClick={() => handleSpeak(analysis.simple_explanation)} className="btn-ghost text-xs">
                <Volume2 size={14} />
                {speaking ? 'Oprește' : 'Citește'}
              </button>
            </div>
          </Section>

          {/* Explicație detaliată */}
          <CollapsibleSection title="Explicație detaliată" icon={FileText}>
            <p className="text-sm leading-relaxed text-slate-600" onMouseUp={handleTextSelection}>
              {analysis.detailed_explanation}
            </p>
            <button onClick={() => handleSpeak(analysis.detailed_explanation)} className="btn-ghost mt-3 text-xs">
              <Volume2 size={14} />
              {speaking ? 'Oprește' : 'Citește cu voce tare'}
            </button>
          </CollapsibleSection>

          {/* Ideile principale */}
          <Section title="Ideile principale" icon={Check}>
            <ul className="space-y-2">
              {analysis.key_ideas.map((idea, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>
                  {idea.text}
                </li>
              ))}
            </ul>
          </Section>

          {/* Cuvinte importante */}
          <Section title="Cuvinte importante" icon={Sparkles}>
            <div className="space-y-3">
              {analysis.important_terms.map((t, i) => (
                <div key={i} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-bold text-brand-700">{t.term}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{t.definition}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Exemplu */}
          <Section title="Exemplu" icon={Sparkles}>
            <p className="text-sm leading-relaxed text-slate-600">{analysis.example}</p>
          </Section>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onNavigate('quiz')} className="btn-primary text-sm">
              <Brain size={18} />
              Generează quiz
            </button>
            <button onClick={() => onNavigate('flashcards')} className="btn-secondary text-sm">
              <Layers size={18} />
              Creează flashcards
            </button>
            <button onClick={handleExplainSimpler} disabled={explainingSelection} className="btn-secondary text-sm">
              {explainingSelection ? <LoadingSpinner size={16} /> : <HelpCircle size={18} />}
              Explică mai simplu
            </button>
            <button onClick={() => handleSpeak(analysis.simple_explanation)} className="btn-secondary text-sm">
              <Volume2 size={18} />
              {speaking ? 'Oprește' : 'Citește cu voce tare'}
            </button>
          </div>

          {/* Nu înțeleg selection helper */}
          {selectedText && (
            <div className="animate-slide-in-right rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
              <p className="text-xs text-slate-500">Text selectat:</p>
              <p className="mt-1 text-sm italic text-slate-600">"{selectedText.slice(0, 100)}..."</p>
              <button onClick={handleExplainSimpler} disabled={explainingSelection} className="btn-primary mt-3 w-full text-sm">
                {explainingSelection ? <LoadingSpinner size={16} /> : <HelpCircle size={16} />}
                Nu înțeleg — explică-mi asta
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
}

function UploadOption({ icon: Icon, label, desc, iconBg, onClick }: { icon: typeof Camera; label: string; desc: string; iconBg: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card group flex flex-col items-center gap-2 p-4 text-center transition-all hover:border-slate-300 active:scale-[0.99]"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg} mb-1 transition-transform group-hover:scale-105`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-800">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{desc}</p>
      </div>
    </button>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Sparkles; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <Icon size={16} className="text-brand-600" />
        <h3 className="text-xs font-bold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, children }: { title: string; icon: typeof Sparkles; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-brand-600" />
          <h3 className="text-xs font-bold text-slate-800">{title}</h3>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
