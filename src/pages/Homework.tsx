import { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Monitor,
  X,
  Sparkles,
  ChevronRight,
  HelpCircle,
  CheckCircle,
  RotateCcw,
  ArrowRight,
  Calculator,
  BookOpen,
  Languages,
  Zap,
  FlaskConical,
  Leaf,
  Landmark,
  Globe,
  Code,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '@/store';
import { aiService } from '@/lib/ai';
import { PageHeader, LoadingSpinner } from '@/components/ui';
import type { HomeworkSolution, PageId } from '@/types';

interface SubjectOption {
  id: string;
  name: string;
  icon: typeof Calculator;
  color: string;
}

const HOMEWORK_SUBJECTS: SubjectOption[] = [
  { id: 'matematica', name: 'Matematică', icon: Calculator, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'limba-romana', name: 'Română', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'engleza', name: 'Engleză', icon: Languages, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { id: 'fizica', name: 'Fizică', icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'chimie', name: 'Chimie', icon: FlaskConical, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'biologie', name: 'Biologie', icon: Leaf, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'istorie', name: 'Istorie', icon: Landmark, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'geografie', name: 'Geografie', icon: Globe, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { id: 'informatica', name: 'Informatică', icon: Code, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { id: 'alte-materii', name: 'Alte materii', icon: Sparkles, color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

export function Homework({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile, addStudySession, upsertProgress, checkAndAwardBadges } = useStore();

  const [selectedSubject, setSelectedSubject] = useState<string>('matematica');
  const [exerciseText, setExerciseText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const [solving, setSolving] = useState(false);
  const [solution, setSolution] = useState<HomeworkSolution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [revealedSteps, setRevealedSteps] = useState(1);
  const [showAnswer, setShowAnswer] = useState(false);
  const [copied, setCopied] = useState(false);

  const [simplifying, setSimplifying] = useState(false);
  const [similarExercise, setSimilarExercise] = useState<string | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [verifyQuestion, setVerifyQuestion] = useState<string | null>(null);
  const [loadingVerify, setLoadingVerify] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Keyboard navigation for computer arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!solution) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (revealedSteps < solution.steps.length) {
          setRevealedSteps((s) => s + 1);
        } else if (!showAnswer) {
          setShowAnswer(true);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (showAnswer) {
          setShowAnswer(false);
        } else if (revealedSteps > 1) {
          setRevealedSteps((s) => s - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [solution, revealedSteps, showAnswer]);

  // Support pasting images directly (Ctrl+V screenshot)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (solution || solving) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleProcessFile(file, 'Captură de ecran (lipită)');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [solution, solving]);

  const handleProcessFile = (file: File, customName?: string) => {
    setError(null);
    setValidationError(null);

    if (!file.type.startsWith('image/')) {
      setError('Fișierul selectat nu este o imagine validă. Te rugăm să încarci o poză JPG, PNG sau WEBP.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Imaginea este prea mare (maximum 20MB). Te rugăm să încarci o imagine cu dimensiune mai mică.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (url) {
        setImagePreview(url);
        setImageData(url);
        setImageName(customName || file.name || 'Imagine temă');
      } else {
        setError('Nu s-a putut citi imaginea. Te rugăm să încerci din nou.');
      }
    };
    reader.onerror = () => {
      setError('Eroare la încărcarea imaginii. Verifică fișierul și încearcă din nou.');
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageData(null);
    setImageName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (screenshotInputRef.current) screenshotInputRef.current.value = '';
  };

  const handleSolve = async () => {
    const trimmed = exerciseText.trim();
    if (!trimmed && !imageData) {
      setValidationError('Scrie problema sau încarcă o fotografie pentru a primi ajutor.');
      return;
    }

    setValidationError(null);
    setError(null);
    setSolving(true);
    setSolution(null);
    setRevealedSteps(1);
    setShowAnswer(false);
    setSimilarExercise(null);
    setVerifyQuestion(null);

    const activeSubject = HOMEWORK_SUBJECTS.find((s) => s.id === selectedSubject)?.name || 'Matematică';
    const inputContent = trimmed || (imageData ? 'Rezolvă cerința din imaginea atașată' : '');

    try {
      const result = await aiService.solveHomework(
        profile,
        inputContent,
        imageData || undefined,
        activeSubject
      );

      setSolution(result);

      if (profile && result.subject) {
        await upsertProgress(result.subject.toLowerCase(), { xp_earned: 25 });
        await addStudySession(result.subject.toLowerCase(), 'homework', 15);
      }
      await checkAndAwardBadges();
    } catch (err) {
      console.error('Homework solver error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Nu am putut rezolva exercițiul în acest moment. Te rugăm să reîncerci.'
      );
    } finally {
      setSolving(false);
    }
  };

  const handleExplainSimpler = async () => {
    if (!profile || !solution) return;
    setSimplifying(true);
    try {
      const simpler = await aiService.explainSimpler(
        profile,
        solution.steps[revealedSteps - 1]?.detail || solution.goal
      );
      setSolution({
        ...solution,
        steps: solution.steps.map((s, i) =>
          i === revealedSteps - 1 ? { ...s, detail: s.detail + '\n\n💡 Explicație simplificată: ' + simpler } : s
        ),
      });
    } catch {
      setError('Nu am putut genera explicația simplificată.');
    } finally {
      setSimplifying(false);
    }
  };

  const handleSimilar = async () => {
    if (!profile || !solution) return;
    setLoadingSimilar(true);
    try {
      const result = await aiService.similarExercise(profile, solution.goal);
      setSimilarExercise(result);
    } catch {
      setError('Nu am putut genera un exercițiu similar.');
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleVerify = async () => {
    if (!profile || !solution) return;
    setLoadingVerify(true);
    try {
      const result = await aiService.verifyUnderstanding(profile, solution.goal);
      setVerifyQuestion(result);
    } catch {
      setError('Nu am putut genera întrebarea de verificare.');
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleCopySolution = () => {
    if (!solution) return;
    const textToCopy = [
      `Enunț: ${solution.goal}`,
      solution.method ? `Metodă / Formulă: ${solution.method}` : '',
      `Pași de rezolvare:`,
      ...solution.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.detail}`),
      `Răspuns final: ${solution.answer}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetProblem = () => {
    setSolution(null);
    setExerciseText('');
    removeImage();
    setError(null);
    setValidationError(null);
    setSimilarExercise(null);
    setVerifyQuestion(null);
    setShowAnswer(false);
    setRevealedSteps(1);
  };

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="Ajutor la teme"
        subtitle="Explicații pas cu pas, metode clare și rezolvări pe înțelesul tău."
      />

      {/* Quick link to Rezolvă tema with camera */}
      <button
        type="button"
        onClick={() => onNavigate('solve-homework')}
        className="card group flex items-center justify-between p-3.5 border-rose-200 bg-rose-50/40 hover:bg-rose-50 hover:border-rose-300 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 group-hover:scale-105 transition-transform">
            <Camera size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Nou: Rezolvă tema direct din poză</span>
              <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">Instant</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Fă poză cu camera sau încarcă din galerie pentru analiză automată AI.
            </p>
          </div>
        </div>
        <ArrowRight size={16} className="text-rose-600 transition-transform group-hover:translate-x-1" />
      </button>

      {/* Loading state */}
      {solving && (
        <div className="card flex flex-col items-center justify-center p-10 text-center shadow-card">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <LoadingSpinner size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800">Analizez problema...</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Brainy identifică cerința, formulele specifice și construiește explicația ghidată pas cu pas.
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
            <Sparkles size={13} className="text-brand-600 animate-pulse" />
            <span>Verificare logică și redactare pas cu pas</span>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-3">
          <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">A apărut o problemă</p>
            <p className="mt-0.5">{error}</p>
            <button
              onClick={handleSolve}
              className="mt-2 font-semibold text-red-800 underline hover:text-red-900"
            >
              Încearcă din nou
            </button>
          </div>
        </div>
      )}

      {/* Input Form (when not viewing a solution and not loading) */}
      {!solution && !solving && (
        <div className="space-y-4">
          {/* Step 1: Subject Selection */}
          <div className="card p-4">
            <label className="text-xs font-bold text-slate-800 mb-2 block">
              1. Alege materia
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {HOMEWORK_SUBJECTS.map((sub) => {
                const Icon = sub.icon;
                const isSelected = selectedSubject === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(sub.id);
                      setValidationError(null);
                    }}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/70 text-brand-900 shadow-2xs font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <span className="truncate">{sub.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Problem Text & Image Upload */}
          <div className="card p-4 space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-800 block">
                2. Scrie problema sau atașează o poză
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Poți scrie textul exercițiului, fotografia tema din caiet sau încărca o captură de ecran.
              </p>
            </div>

            <textarea
              id="homework-problem-input"
              value={exerciseText}
              onChange={(e) => {
                setExerciseText(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Ex: Într-un triunghi dreptunghic ABC cu ipotenuza BC = 10 cm și cateta AB = 6 cm, află lungimea catetei AC..."
              className="input-field min-h-[110px] resize-none text-xs sm:text-sm leading-relaxed"
              rows={4}
            />

            {/* Attached image preview */}
            {imagePreview && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <ImageIcon size={15} className="text-brand-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {imageName || 'Poză atașată'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg px-2 py-1 transition-colors"
                  >
                    <X size={13} />
                    <span>Elimină</span>
                  </button>
                </div>
                <div className="flex justify-center bg-white rounded-lg p-2 border border-slate-200/80">
                  <img
                    src={imagePreview}
                    alt="Poză problemă"
                    className="max-h-60 max-w-full rounded-md object-contain"
                  />
                </div>
              </div>
            )}

            {/* Upload buttons toolbar */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                id="btn-upload-photo"
                onClick={() => cameraInputRef.current?.click()}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Camera size={15} className="text-blue-600" />
                <span>Fotografiază</span>
              </button>

              <button
                type="button"
                id="btn-upload-gallery"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <ImageIcon size={15} className="text-indigo-600" />
                <span>Încarcă fotografie</span>
              </button>

              <button
                type="button"
                id="btn-upload-screenshot"
                onClick={() => screenshotInputRef.current?.click()}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              >
                <Monitor size={15} className="text-slate-600" />
                <span>Captură de ecran</span>
              </button>

              <span className="hidden sm:inline text-[11px] text-slate-400 ml-auto">
                Poți apăsa și <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] text-slate-600">Ctrl + V</kbd> pentru captură
              </span>
            </div>

            {/* Validation warning */}
            {validationError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-amber-600" />
                <span className="font-medium">{validationError}</span>
              </div>
            )}

            {/* Primary Action Button: "Rezolvă problema" */}
            <div className="pt-2">
              <button
                type="button"
                id="btn-solve-homework"
                onClick={handleSolve}
                className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
              >
                <Sparkles size={17} />
                <span>Rezolvă problema</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Solution Display */}
      {solution && !solving && (
        <div className="space-y-4 animate-fade-in">
          {/* Header Card: Problem & Subject */}
          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 border border-brand-200">
                    <Sparkles size={12} />
                    {solution.subject || 'Rezolvare ghidată'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                  Enunțul problemei
                </p>
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {solution.goal}
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetProblem}
                title="Problemă nouă"
                className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 shrink-0"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Problemă nouă</span>
              </button>
            </div>
          </div>

          {/* Method / Formula applied (if present) */}
          {solution.method && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Calculator size={13} />
                </div>
                <span>Formulă / Metodă aplicată</span>
              </div>
              <p className="mt-1.5 pl-8 text-xs font-semibold text-indigo-950 leading-relaxed">
                {solution.method}
              </p>
            </div>
          )}

          {/* Step-by-Step explanation */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Explicația pas cu pas
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                Pasul {Math.min(revealedSteps, solution.steps.length)} din {solution.steps.length}
              </span>
            </div>

            {solution.steps.map((step, idx) => {
              const isRevealed = idx < revealedSteps;
              if (!isRevealed) return null;

              return (
                <div
                  key={idx}
                  className="card p-4 transition-all duration-200 animate-slide-up"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white shadow-2xs">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900">{step.title}</h4>
                      <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-700 whitespace-pre-line">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reveal controls */}
          {revealedSteps < solution.steps.length && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRevealedSteps((s) => s + 1)}
                className="btn-secondary flex-1 text-xs py-2.5 flex items-center justify-center gap-2"
              >
                <ArrowRight size={15} />
                <span>Arată pasul următor ({revealedSteps + 1}/{solution.steps.length})</span>
                <kbd className="hidden sm:inline-block rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                  →
                </kbd>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRevealedSteps(solution.steps.length);
                  setShowAnswer(true);
                }}
                className="btn-ghost text-xs px-3 text-slate-600 hover:text-slate-900"
              >
                Arată toți pașii
              </button>
            </div>
          )}

          {/* Show Answer button */}
          {revealedSteps >= solution.steps.length && !showAnswer && (
            <button
              type="button"
              onClick={() => setShowAnswer(true)}
              className="btn-primary w-full text-xs flex items-center justify-center gap-2 py-3"
            >
              <CheckCircle size={16} />
              <span>Arată răspunsul final</span>
              <kbd className="hidden sm:inline-block rounded border border-brand-800 bg-brand-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-200">
                Enter / →
              </kbd>
            </button>
          )}

          {/* Highlighted Final Answer */}
          {showAnswer && (
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 p-4 shadow-xs animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <CheckCircle size={14} />
                  </div>
                  <span className="text-sm">Răspuns final</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopySolution}
                  className="flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200 hover:bg-white transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copied ? 'Copiat!' : 'Copiază'}</span>
                </button>
              </div>
              <p className="mt-2.5 pl-8 text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
                {solution.answer}
              </p>
            </div>
          )}

          {/* Action options after solution */}
          {showAnswer && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExplainSimpler}
                  disabled={simplifying}
                  className="btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5"
                >
                  {simplifying ? <LoadingSpinner size={14} /> : <HelpCircle size={14} className="text-indigo-600" />}
                  <span>Explică mai simplu</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimilar}
                  disabled={loadingSimilar}
                  className="btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5"
                >
                  {loadingSimilar ? <LoadingSpinner size={14} /> : <RotateCcw size={14} className="text-amber-600" />}
                  <span>Exercițiu similar</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleVerify}
                disabled={loadingVerify}
                className="btn-secondary w-full text-xs py-2.5 flex items-center justify-center gap-1.5"
              >
                {loadingVerify ? <LoadingSpinner size={14} /> : <CheckCircle size={14} className="text-emerald-600" />}
                <span>Verifică dacă am înțeles</span>
              </button>

              {/* Start another problem button */}
              <button
                type="button"
                id="btn-solve-another"
                onClick={handleResetProblem}
                className="btn-primary w-full py-3 text-xs sm:text-sm flex items-center justify-center gap-2 mt-3"
              >
                <RotateCcw size={15} />
                <span>Rezolvă o altă problemă</span>
              </button>
            </div>
          )}

          {/* Similar exercise generated */}
          {similarExercise && (
            <div className="card p-4 animate-slide-up border-amber-200 bg-amber-50/40">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-2">
                <RotateCcw size={15} className="text-amber-600" />
                <span>Exercițiu similar pentru exercițiu</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-800 whitespace-pre-line pl-6">
                {similarExercise}
              </p>
            </div>
          )}

          {/* Verify question */}
          {verifyQuestion && (
            <div className="card p-4 animate-slide-up border-emerald-200 bg-emerald-50/40">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs mb-2">
                <CheckCircle size={15} className="text-emerald-600" />
                <span>Întrebare de verificare</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-800 whitespace-pre-line pl-6">
                {verifyQuestion}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('chat')}
                className="btn-secondary mt-3 text-xs flex items-center gap-1.5"
              >
                <ChevronRight size={14} />
                <span>Răspunde în Întreabă AI</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessFile(file, file.name);
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessFile(file, 'Fotografie de pe cameră');
        }}
      />
      <input
        ref={screenshotInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessFile(file, 'Captură de ecran');
        }}
      />
    </div>
  );
}
