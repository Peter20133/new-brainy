import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  Check,
  Copy,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  Brain,
  Layers,
  X,
  FileCheck2,
  ChevronRight,
  BookOpen,
  Send,
} from 'lucide-react';
import { useStore } from '@/store';
import { aiService } from '@/lib/ai';
import { LoadingSpinner } from '@/components/ui';
import type { HomeworkSolution, PageId } from '@/types';

export function SolveHomework({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile, addStudySession, upsertProgress, checkAndAwardBadges } = useStore();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [solution, setSolution] = useState<HomeworkSolution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [simplifying, setSimplifying] = useState(false);
  const [simplerText, setSimplerText] = useState<string | null>(null);
  const [similarExercise, setSimilarExercise] = useState<string | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = useCallback((file: File, customName?: string) => {
    setError(null);
    setValidationError(null);

    if (!file.type.startsWith('image/')) {
      setError('Te rugăm să încarci un fișier de tip imagine (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Imaginea este prea mare (maxim 20MB). Te rugăm să încarci o poză mai mică.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setImagePreview(result);
        setImageData(result);
        setImageName(customName || file.name || 'Imagine temă');
      } else {
        setError('Nu s-a putut citi imaginea. Te rugăm să încerci din nou.');
      }
    };
    reader.onerror = () => {
      setError('A apărut o problemă la citirea fișierului. Te rugăm să reîncerci.');
    };
    reader.readAsDataURL(file);
  }, []);

  // Ctrl+V paste handling for screenshot
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (analyzing || solution) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file, 'Captură din clipboard');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [analyzing, solution, processImageFile]);

  // Step progression during AI analysis
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (analyzing) {
      setAnalysisStep(0);
      const stepsInterval = [700, 1800, 3200];
      timer = setTimeout(() => setAnalysisStep(1), stepsInterval[0]);
      const timer2 = setTimeout(() => setAnalysisStep(2), stepsInterval[1]);
      const timer3 = setTimeout(() => setAnalysisStep(3), stepsInterval[2]);

      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [analyzing]);

  const handleReset = () => {
    setImagePreview(null);
    setImageData(null);
    setImageName(null);
    setNote('');
    setSolution(null);
    setError(null);
    setValidationError(null);
    setSimplerText(null);
    setSimilarExercise(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleSolve = async () => {
    if (!imageData) {
      setValidationError('Fă o poză sau încarcă o poză pentru a rezolva tema.');
      return;
    }

    setValidationError(null);
    setError(null);
    setAnalyzing(true);
    setSolution(null);
    setSimplerText(null);
    setSimilarExercise(null);

    const userPrompt = note.trim()
      ? `Rezolvă problema din această fotografie. Mențiune suplimentară a elevului: ${note.trim()}`
      : 'Identifică problema/exercițiul prezentat în această fotografie și rezolvă-l complet pas cu pas.';

    try {
      const result = await aiService.solveHomework(
        profile,
        userPrompt,
        imageData
      );

      setSolution(result);

      if (profile && result.subject) {
        await upsertProgress(result.subject.toLowerCase(), { xp_earned: 30 });
        await addStudySession(result.subject.toLowerCase(), 'homework', 15);
      }
      await checkAndAwardBadges();
    } catch (err) {
      console.error('Solve homework error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Nu am putut analiza imaginea în acest moment. Te rugăm să încerci din nou.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopySolution = () => {
    if (!solution) return;
    const textToCopy = `📝 Rezolvarea temei: ${solution.goal}
Materia: ${solution.subject}
${solution.method ? `Metodă / Formulă: ${solution.method}\n` : ''}
Pași de rezolvare:
${solution.steps.map((s, i) => `${i + 1}. ${s.title}\n   ${s.detail}`).join('\n\n')}

✨ Răspuns final:
${solution.answer}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExplainSimpler = async () => {
    if (!profile || !solution) return;
    setSimplifying(true);
    try {
      const simpler = await aiService.explainSimpler(
        profile,
        `Exercițiu: ${solution.goal}. Pași: ${solution.steps.map((s) => s.detail).join(' ')}. Răspuns: ${solution.answer}`
      );
      setSimplerText(simpler);
    } catch {
      setSimplerText('Gândește-te pas cu pas: descompune problema în părți mai mici și aplică regula pas cu pas.');
    } finally {
      setSimplifying(false);
    }
  };

  const handleSimilarExercise = async () => {
    if (!profile || !solution) return;
    setLoadingSimilar(true);
    try {
      const similar = await aiService.getSimilarExercise(profile, solution.goal);
      setSimilarExercise(similar);
    } catch {
      setSimilarExercise('Încearcă să schimbi valorile numerice din problemă și să refaci pașii de rezolvare.');
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            title="Înapoi la meniul principal"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Rezolvă tema</h1>
            <p className="text-xs text-slate-500">
              AI-ul analizează fotografia, identifică problema și oferă soluția
            </p>
          </div>
        </div>

        {solution && (
          <button
            type="button"
            onClick={handleReset}
            className="btn-ghost flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <RotateCcw size={14} />
            <span>🔄 Încearcă din nou</span>
          </button>
        )}
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
          <AlertCircle size={17} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Nu am putut finaliza cererea</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-700"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* VALIDATION WARNING */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertCircle size={16} className="shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* STATE 1: CAPTURE & UPLOAD (shown when NOT solved and NOT analyzing) */}
      {!solution && !analyzing && (
        <div className="space-y-4">
          {/* Main Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              id="btn-take-photo"
              onClick={() => cameraInputRef.current?.click()}
              className="card group flex flex-col items-center justify-center p-5 text-center transition-all hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-card active:scale-[0.98] cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 group-hover:scale-110 transition-transform shadow-2xs">
                <Camera size={26} strokeWidth={2.2} />
              </div>
              <span className="mt-3 text-sm font-bold text-slate-800">📷 Fă poză</span>
              <span className="mt-0.5 text-[11px] text-slate-500">
                Fotografiază tema din caiet sau manual
              </span>
            </button>

            <button
              type="button"
              id="btn-upload-photo"
              onClick={() => galleryInputRef.current?.click()}
              className="card group flex flex-col items-center justify-center p-5 text-center transition-all hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-card active:scale-[0.98] cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform shadow-2xs">
                <ImageIcon size={26} strokeWidth={2.2} />
              </div>
              <span className="mt-3 text-sm font-bold text-slate-800">🖼️ Încarcă poză</span>
              <span className="mt-0.5 text-[11px] text-slate-500">
                Alege o poză sau captură din galerie
              </span>
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImageFile(file, 'Fotografie cameră');
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImageFile(file);
            }}
          />

          {/* Image preview OR Drag & Drop Zone */}
          {imagePreview ? (
            <div className="card overflow-hidden border-2 border-brand-200 bg-white p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <FileCheck2 size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                      {imageName || 'Fotografie selectată'}
                    </p>
                    <p className="text-[10px] text-slate-400">Gata pentru analiza AI</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
                  title="Elimină poza"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Picture View */}
              <div className="relative mt-3 max-h-72 overflow-hidden rounded-xl bg-slate-900/5 flex items-center justify-center border border-slate-200/80">
                <img
                  src={imagePreview}
                  alt="Tema de rezolvat"
                  className="max-h-72 w-full object-contain rounded-lg"
                />
              </div>

              {/* Optional note input */}
              <div className="mt-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mențiune opțională pentru Brainy (opțional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Rezolvă doar exercițiul 3 sau subpunctul b..."
                  className="input-field text-xs py-2"
                />
              </div>

              {/* Action Button */}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  id="btn-start-ai-solve"
                  onClick={handleSolve}
                  className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles size={18} />
                  <span>🤖 Analiză AI & Rezolvă tema</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-slate-600 text-center py-1"
                >
                  Alege altă poză
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => galleryInputRef.current?.click()}
              className={`card flex flex-col items-center justify-center border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-brand-500 bg-brand-50/40 scale-[1.01]'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-2">
                <ImageIcon size={20} />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Trage și plasează fotografia aici
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                sau apasă pentru a alege un fișier (poți lipi direct cu <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px] text-slate-600">Ctrl+V</kbd>)
              </p>
            </div>
          )}

          {/* Quick tips */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Brain size={14} className="text-brand-600" />
              <span>Sfaturi pentru o rezolvare precisă</span>
            </h4>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-500 leading-relaxed list-disc list-inside">
              <li>Asigură-te că enunțul problemei și numerele sunt clare și bine luminate.</li>
              <li>Încadrează doar exercițiul pe care dorești să-l rezolve Brainy.</li>
              <li>AI-ul recunoaște scrisul de mână, formulele matematice, diagramele și textele tipărite.</li>
            </ul>
          </div>
        </div>
      )}

      {/* STATE 2: 🤖 ANALIZĂ AI (Loading / Processing animation) */}
      {analyzing && (
        <div className="card p-6 text-center space-y-5 border-2 border-brand-200 bg-white">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
            <Sparkles size={28} className="animate-pulse text-brand-400" />
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
              AI
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">
              🤖 Analiză AI în curs...
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Brainy examinează fotografia, identifică problema și pregătește rezolvarea detaliată.
            </p>
          </div>

          {/* Live Progress steps */}
          <div className="mx-auto max-w-md space-y-2 text-left">
            <div
              className={`flex items-center gap-2.5 rounded-xl p-2.5 text-xs transition-colors ${
                analysisStep >= 0 ? 'bg-brand-50 text-brand-800 font-semibold' : 'text-slate-400'
              }`}
            >
              {analysisStep > 0 ? (
                <Check size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <LoadingSpinner size={14} className="text-brand-600 shrink-0" />
              )}
              <span>1. Scanare și citire text / formule din imagine</span>
            </div>

            <div
              className={`flex items-center gap-2.5 rounded-xl p-2.5 text-xs transition-colors ${
                analysisStep >= 1 ? 'bg-brand-50 text-brand-800 font-semibold' : 'text-slate-400'
              }`}
            >
              {analysisStep > 1 ? (
                <Check size={16} className="text-emerald-600 shrink-0" />
              ) : analysisStep === 1 ? (
                <LoadingSpinner size={14} className="text-brand-600 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span>2. Identificarea cerinței și a materiei</span>
            </div>

            <div
              className={`flex items-center gap-2.5 rounded-xl p-2.5 text-xs transition-colors ${
                analysisStep >= 2 ? 'bg-brand-50 text-brand-800 font-semibold' : 'text-slate-400'
              }`}
            >
              {analysisStep > 2 ? (
                <Check size={16} className="text-emerald-600 shrink-0" />
              ) : analysisStep === 2 ? (
                <LoadingSpinner size={14} className="text-brand-600 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span>3. Aplicarea formulelor și redactarea pașilor</span>
            </div>
          </div>

          {/* Thumbnail preview with scan effect */}
          {imagePreview && (
            <div className="relative mx-auto max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img
                src={imagePreview}
                alt="Scanare"
                className="h-32 w-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-brand-500/20 via-transparent to-brand-500/20 animate-pulse" />
            </div>
          )}
        </div>
      )}

      {/* STATE 3: ✨ REZOLVAREA TEMEI (Result Display) */}
      {solution && (
        <div className="space-y-4">
          {/* Header Card with Subject & Actions */}
          <div className="card overflow-hidden p-4 sm:p-5 border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                  <Sparkles size={13} />
                  <span>✨ Rezolvarea temei</span>
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {solution.subject || 'Matematică'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopySolution}
                  className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1.5"
                  title="Copiază întreaga rezolvare"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Copiat!' : 'Copiază'}</span>
                </button>

                <button
                  type="button"
                  id="btn-try-again-top"
                  onClick={handleReset}
                  className="btn-primary py-1 px-3 text-xs flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>🔄 Încearcă din nou</span>
                </button>
              </div>
            </div>

            {/* Problema identificată */}
            <div className="mt-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Problema identificată în fotografie
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-900 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                {solution.goal}
              </p>
            </div>

            {/* Metoda / Formula aplicată */}
            {solution.method && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-950">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 mt-0.5">
                  <Layers size={14} />
                </div>
                <div>
                  <span className="font-bold">Formulă / Metodă aplicată: </span>
                  <span className="font-medium text-indigo-900">{solution.method}</span>
                </div>
              </div>
            )}
          </div>

          {/* Pași de rezolvare */}
          <div className="card p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen size={14} className="text-brand-600" />
              <span>Pași de rezolvare detaliați</span>
            </h3>

            <div className="space-y-3">
              {solution.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200/80 bg-white p-3.5 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white text-[11px] font-bold">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                      {step.title}
                    </h4>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed pl-8 whitespace-pre-line">
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Răspuns final evidențiat */}
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 text-emerald-950 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <Check size={16} strokeWidth={2.5} className="text-emerald-600" />
                <span>Răspuns final</span>
              </span>
            </div>
            <p className="mt-2 text-sm sm:text-base font-bold text-emerald-900 leading-relaxed">
              {solution.answer}
            </p>
          </div>

          {/* Simpler explanation section */}
          {simplerText && (
            <div className="card p-4 border-amber-200 bg-amber-50/40">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                <HelpCircle size={15} />
                <span>Explicație simplificată</span>
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {simplerText}
              </p>
            </div>
          )}

          {/* Similar exercise section */}
          {similarExercise && (
            <div className="card p-4 border-indigo-200 bg-indigo-50/40">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-800">
                <Brain size={15} />
                <span>Exercițiu similar pentru antrenament</span>
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {similarExercise}
              </p>
            </div>
          )}

          {/* Learning Tools & Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleExplainSimpler}
              disabled={simplifying}
              className="card flex items-center justify-center gap-2 p-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
            >
              <HelpCircle size={15} className="text-amber-600" />
              <span>{simplifying ? 'Se simplifică...' : 'Explică mai simplu'}</span>
            </button>

            <button
              type="button"
              onClick={handleSimilarExercise}
              disabled={loadingSimilar}
              className="card flex items-center justify-center gap-2 p-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
            >
              <Brain size={15} className="text-indigo-600" />
              <span>{loadingSimilar ? 'Se generează...' : 'Exercițiu similar'}</span>
            </button>
          </div>

          {/* Ask in Chat shortcut */}
          <button
            type="button"
            onClick={() => onNavigate('chat')}
            className="card flex w-full items-center justify-between p-3 text-left hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Send size={14} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Ai întrebări suplimentare?</p>
                <p className="text-[11px] text-slate-500">Discută această rezolvare direct în „Întreabă AI”</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          {/* Bottom "🔄 Încearcă din nou" Button */}
          <div className="pt-2">
            <button
              type="button"
              id="btn-try-again-bottom"
              onClick={handleReset}
              className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              <span>🔄 Încearcă din nou (rezolvă o altă poză)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
