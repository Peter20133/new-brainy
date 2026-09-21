import { useState, useEffect, useRef } from 'react';
import {
  Target,
  Clock,
  Calendar,
  Timer,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { useStore } from '@/store';
import { aiService } from '@/lib/ai';
import { SUBJECTS } from '@/constants';
import type { SubjectSlug, StudyPlanBlock } from '@/types';
import { PageHeader, LoadingSpinner, ErrorState } from '@/components/ui';

export function StudyPlan() {
  const { profile, addStudySession, upsertProgress, addXp, lessons: userLessons } = useStore();
  const [subject, setSubject] = useState<SubjectSlug | null>(null);
  const [lessons, setLessons] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<StudyPlanBlock[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Completed block indexes
  const [completedBlocks, setCompletedBlocks] = useState<Record<number, boolean>>({});

  // Active Timer state
  const [activeTimerIndex, setActiveTimerIndex] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Play sound when timer finishes
  const playCompletionSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // audio context fallback
    }
  };

  useEffect(() => {
    if (isTimerRunning && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            playCompletionSound();
            if (activeTimerIndex !== null) {
              setCompletedBlocks((c) => ({ ...c, [activeTimerIndex]: true }));
              addXp(15);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, secondsRemaining, activeTimerIndex, addXp]);

  const handleGenerate = async () => {
    if (!profile || !subject) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await aiService.generateStudyPlan(
        profile,
        subject,
        lessons.split(',').map((l) => l.trim()).filter(Boolean),
        minutes
      );
      setPlan(result);
      setCompletedBlocks({});
      setActiveTimerIndex(null);
      await addStudySession(subject, 'study_plan', minutes);
      await upsertProgress(subject, { xp_earned: 15 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut genera planul.');
    } finally {
      setGenerating(false);
    }
  };

  const startTimerForBlock = (index: number) => {
    if (!plan || !plan[index]) return;
    setActiveTimerIndex(index);
    setSecondsRemaining(plan[index].duration * 60);
    setIsTimerRunning(true);
  };

  const toggleTimerPause = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    if (activeTimerIndex !== null && plan && plan[activeTimerIndex]) {
      setSecondsRemaining(plan[activeTimerIndex].duration * 60);
      setIsTimerRunning(false);
    }
  };

  const toggleBlockCompleted = (index: number) => {
    const isNow = !completedBlocks[index];
    setCompletedBlocks((prev) => ({ ...prev, [index]: isNow }));
    if (isNow) {
      addXp(10);
    }
  };

  const formatTimerTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (generating) {
    return (
      <div className="space-y-4">
        <PageHeader title="Am test mâine" subtitle="Planificator inteligent de recapitulare." />
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <LoadingSpinner size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-800">Generez planul de studiu...</h3>
          <p className="mt-1 text-xs text-slate-500">Structurăm sesiunile de învățare și pauzele optime.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="Am test mâine" subtitle="Organizează-ți sesiunea de învățare fără stres." />

      {error && <ErrorState message={error} onRetry={handleGenerate} />}

      {!plan && (
        <div className="card p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700">La ce materie ai test?</label>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {SUBJECTS.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => setSubject(s.slug)}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold transition-all border ${
                    subject === s.slug
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700">Ce capitole sau lecții ai de învățat?</label>
            <textarea
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              placeholder="Ex: Teorema lui Pitagora, Triunghiuri asemenea, Probleme recapitulative..."
              className="input-field mt-1.5 min-h-[72px] resize-none text-xs"
              rows={3}
            />

            {/* Quick add from saved lessons */}
            {userLessons.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[11px] text-slate-400 py-0.5">Din lecțiile tale:</span>
                {userLessons.slice(0, 3).map((ul) => (
                  <button
                    key={ul.id}
                    onClick={() => {
                      setLessons((prev) => (prev ? `${prev}, ${ul.title}` : ul.title));
                      if (ul.subject) setSubject(ul.subject as SubjectSlug);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <BookOpen size={10} />
                    {ul.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Cât timp ai la dispoziție?</label>
              <span className="text-xs font-bold text-slate-700">{minutes} min ({Math.round((minutes / 60) * 10) / 10} ore)</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min="30"
                max="180"
                step="15"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="flex-1 accent-brand-600"
              />
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                <Clock size={13} className="text-slate-500" />
                <span>{minutes}m</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!subject}
            className="btn-primary w-full py-2.5 text-xs"
          >
            <Target size={16} />
            Creează planul de studiu
          </button>
        </div>
      )}

      {plan && (
        <div className="space-y-4 animate-slide-up">
          {/* Active Interactive Timer Widget if activated */}
          {activeTimerIndex !== null && plan[activeTimerIndex] && (
            <div className="rounded-2xl bg-slate-900 p-5 text-white border border-slate-800 animate-scale-in">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
                <span className="inline-flex items-center gap-1.5 font-bold">
                  <Timer size={13} className="text-amber-400" />
                  Sesiune activă: Pasul {activeTimerIndex + 1}
                </span>
                <span>{plan[activeTimerIndex].duration} min</span>
              </div>

              <h3 className="mt-1 text-sm font-bold text-white">{plan[activeTimerIndex].activity}</h3>
              <p className="text-xs text-slate-400 line-clamp-1">{plan[activeTimerIndex].detail}</p>

              <div className="my-3 text-center">
                <span className="font-mono text-4xl font-bold tracking-tight text-white">
                  {formatTimerTime(secondsRemaining)}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={toggleTimerPause}
                  className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 font-bold text-slate-900 transition-all hover:bg-slate-100 text-xs"
                >
                  {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
                  {isTimerRunning ? 'Pauză' : 'Continuă'}
                </button>
                <button
                  onClick={resetTimer}
                  title="Resetează timpul"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => {
                    setCompletedBlocks((c) => ({ ...c, [activeTimerIndex]: true }));
                    addXp(15);
                    setActiveTimerIndex(null);
                  }}
                  className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 font-semibold text-white transition-all text-xs"
                >
                  <CheckCircle2 size={14} />
                  Gata
                </button>
              </div>
            </div>
          )}

          {/* Plan overview card */}
          <div className="card overflow-hidden p-0">
            <div className="bg-slate-900 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-300" />
                  <h2 className="text-sm font-bold">Planul tău de învățare</h2>
                </div>
                <span className="text-[11px] font-semibold bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-300">
                  {minutes} min total
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {SUBJECTS.find((s) => s.slug === subject)?.name} · Urmează etapele în ordine
              </p>
            </div>

            {/* List of blocks */}
            <div className="divide-y divide-slate-100">
              {plan.map((block, i) => {
                const isCompleted = Boolean(completedBlocks[i]);
                const isActive = activeTimerIndex === i;

                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3.5 transition-colors ${
                      isActive ? 'bg-slate-50 border-l-2 border-brand-600' : isCompleted ? 'bg-slate-50/50 opacity-75' : 'hover:bg-slate-50/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleBlockCompleted(i)}
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 transition-colors hover:border-slate-500"
                    >
                      {isCompleted && <CheckCircle2 size={16} className="text-emerald-600" />}
                    </button>

                    {/* Time pill */}
                    <div className="flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <span className="text-[11px] font-bold">{block.time}</span>
                      <span className="text-[9px] text-slate-400 font-medium">{block.duration}m</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-xs font-bold text-slate-800 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                        {block.activity}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">{block.detail}</p>
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => startTimerForBlock(i)}
                      title="Pornește cronometrul"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Play size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick stats summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="card p-3 text-center">
              <p className="text-xl font-bold text-slate-900">
                {Object.values(completedBlocks).filter(Boolean).length} / {plan.length}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">etape finalizate</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xl font-bold text-slate-900">
                {plan.reduce((a, b) => a + b.duration, 0)} min
              </p>
              <p className="text-[10px] text-slate-400 font-medium">durată totală</p>
            </div>
          </div>

          <button
            onClick={() => {
              setPlan(null);
              setSubject(null);
              setLessons('');
              setActiveTimerIndex(null);
            }}
            className="btn-secondary w-full"
          >
            <ArrowRight size={18} />
            Creează un nou plan
          </button>
        </div>
      )}
    </div>
  );
}
