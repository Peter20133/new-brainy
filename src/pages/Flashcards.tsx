import { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  RotateCcw,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Brain,
  Plus,
  Trash2,
  X,
  BookOpen,
  Check,
} from 'lucide-react';
import { useStore } from '@/store';
import { aiService } from '@/lib/ai';
import { PageHeader, LoadingSpinner, ErrorState, EmptyState } from '@/components/ui';
import { getSubjectName, SUBJECTS } from '@/constants';
import type { PageId } from '@/types';

const PRESET_TOPICS = [
  { title: 'Matematică: Fracții și ecuații', subject: 'matematica' },
  { title: 'Română: Părți de vorbire și propoziție', subject: 'limba-romana' },
  { title: 'Istorie: Domnitorii români', subject: 'istorie' },
  { title: 'Geografie: Munții Carpați', subject: 'geografie' },
  { title: 'Biologie: Celula vegetală și animală', subject: 'biologie' },
  { title: 'Engleză: Verbe neregulate frecvente', subject: 'engleza' },
];

export function Flashcards({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const {
    profile,
    lessons,
    flashcards,
    addFlashcards,
    updateFlashcard,
    deleteFlashcard,
    clearFlashcards,
    addStudySession,
    upsertProgress,
    checkAndAwardBadges,
  } = useStore();

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ known: 0, repeat: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newSubject, setNewSubject] = useState<string>('matematica');
  const [viewMode, setViewMode] = useState<'study' | 'overview'>('study');

  useEffect(() => {
    setCurrentIdx(0);
    setFlipped(false);
  }, [flashcards.length]);

  const handleReview = useCallback(
    async (status: 'known' | 'repeat') => {
      const card = flashcards[currentIdx];
      if (!card) return;

      await updateFlashcard(card.id, {
        status,
        review_count: card.review_count + 1,
      });

      setStats((prev) => ({
        known: prev.known + (status === 'known' ? 1 : 0),
        repeat: prev.repeat + (status === 'repeat' ? 1 : 0),
      }));

      if (card.subject) {
        await upsertProgress(card.subject, { xp_earned: 5 });
        await addStudySession(card.subject, 'flashcards', 2);
      }

      if (currentIdx + 1 < flashcards.length) {
        setFlipped(false);
        setCurrentIdx(currentIdx + 1);
      } else {
        // Completed last card
        setCurrentIdx(flashcards.length);
      }

      await checkAndAwardBadges();
    },
    [flashcards, currentIdx, updateFlashcard, upsertProgress, addStudySession, checkAndAwardBadges]
  );

  // Keyboard navigation for computer arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if inside input or modal
      if (showAddModal) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (viewMode !== 'study' || flashcards.length === 0 || currentIdx >= flashcards.length) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (flipped) {
          handleReview('known');
        } else {
          // If not flipped yet, show the answer
          setFlipped(true);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (flipped) {
          handleReview('repeat');
        } else if (currentIdx > 0) {
          // Navigate to previous card
          setCurrentIdx((idx) => Math.max(0, idx - 1));
          setFlipped(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, viewMode, flashcards.length, currentIdx, flipped, handleReview]);

  const handleGenerate = async (presetTitle?: string) => {
    if (!profile) return;
    setGenerating(true);
    setError(null);
    const genTopic = presetTitle || topic || lessons[0]?.title || 'matematică de bază';

    try {
      const cards = await aiService.generateFlashcards(profile, genTopic, 8);
      if (cards.length === 0) throw new Error('Nu am putut genera flashcards');

      const matchedLesson = lessons.find((l) => l.title === genTopic);
      const subject = matchedLesson?.subject || (genTopic.toLowerCase().includes('român') ? 'limba-romana' : 'matematica');

      await addFlashcards(
        cards.map((c) => ({
          front: c.front,
          back: c.back,
          subject,
          lesson_id: matchedLesson?.id || null,
          status: 'new' as const,
          review_count: 0,
        }))
      );
      setStats({ known: 0, repeat: 0 });
      setCurrentIdx(0);
      setFlipped(false);
      setViewMode('study');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut genera flashcards.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateManualCard = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    await addFlashcards([
      {
        front: newFront.trim(),
        back: newBack.trim(),
        subject: newSubject,
        lesson_id: null,
        status: 'new' as const,
        review_count: 0,
      },
    ]);
    setNewFront('');
    setNewBack('');
    setShowAddModal(false);
    setViewMode('study');
  };

  const handleClearAll = async () => {
    if (window.confirm('Sigur vrei să ștergi toate flashcardurile curente?')) {
      await clearFlashcards();
      setStats({ known: 0, repeat: 0 });
      setCurrentIdx(0);
      setFlipped(false);
      setViewMode('study');
    }
  };

  if (generating) {
    return (
      <div className="space-y-4">
        <PageHeader title="Flashcards" subtitle="Carduri de memorie pentru repetare rapidă." />
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <LoadingSpinner size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-800">Generez flashcards...</h3>
          <p className="mt-1 text-xs text-slate-500">Formulez întrebări și răspunsuri concise.</p>
        </div>
      </div>
    );
  }

  // Active flashcard study view
  if (flashcards.length > 0 && currentIdx < flashcards.length && viewMode === 'study') {
    const card = flashcards[currentIdx];
    const progress = ((currentIdx + 1) / flashcards.length) * 100;

    return (
      <div className="space-y-4 pb-6 animate-slide-up">
        {/* Navigation / management header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {card.subject ? getSubjectName(card.subject) : 'Repetare'}
            </span>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Flashcards</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode('overview')}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Toate ({flashcards.length})
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-ghost p-1.5 text-xs"
              title="Adaugă card manual"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
            <span>Cardul {currentIdx + 1} din {flashcards.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 3D Flashcard */}
        <div className="[perspective:1500px]">
          <div
            onClick={() => setFlipped(!flipped)}
            className="relative w-full cursor-pointer [transform-style:preserve-3d] transition-transform duration-500"
            style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          >
            {/* Front */}
            <div
              className="card flex min-h-[260px] flex-col items-center justify-between p-6 hover:border-slate-300 transition-colors"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-600">
                <Brain size={13} />
                Întrebare
              </div>
              <p className="my-auto text-center text-lg font-bold leading-relaxed text-slate-900 px-2">
                {card.front}
              </p>
              <p className="text-[11px] font-medium text-slate-400">
                Apasă pentru a vedea răspunsul
              </p>
            </div>

            {/* Back */}
            <div
              className="card absolute inset-0 flex min-h-[260px] flex-col items-center justify-between bg-slate-900 p-6 text-white border-slate-800"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-300">
                <Sparkles size={13} />
                Răspuns
              </div>
              <p className="my-auto text-center text-base font-medium leading-relaxed px-2 text-slate-100">
                {card.back}
              </p>
              <p className="text-[11px] text-slate-400">
                Evaluează cunoștința mai jos
              </p>
            </div>
          </div>
        </div>

        {/* Review feedback buttons */}
        {flipped ? (
          <div className="grid grid-cols-2 gap-2.5 animate-slide-up">
            <button
              onClick={() => handleReview('repeat')}
              className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 py-3 text-xs font-bold text-amber-800 transition-all hover:bg-amber-100 active:scale-[0.99]"
            >
              <kbd className="hidden sm:inline-block rounded border border-amber-300 bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-amber-900 shadow-2xs">←</kbd>
              <ThumbsDown size={15} />
              <span>Mai repet</span>
            </button>
            <button
              onClick={() => handleReview('known')}
              className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 py-3 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100 active:scale-[0.99]"
            >
              <ThumbsUp size={15} />
              <span>Știam (+5 XP)</span>
              <kbd className="hidden sm:inline-block rounded border border-emerald-300 bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-emerald-900 shadow-2xs">→</kbd>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="btn-primary w-full py-3 text-xs flex items-center justify-center gap-2"
          >
            <span>Arată răspunsul</span>
            <kbd className="hidden sm:inline-block rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-200 shadow-2xs">Spațiu / ↑ / ↓ / →</kbd>
          </button>
        )}

        {/* Keyboard shortcut bar for computer users */}
        <div className="hidden sm:flex items-center justify-center gap-3 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-2xs">←</kbd>
            {flipped ? 'Mai repet' : 'Card anterior'}
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-2xs">↑ / ↓ / Spațiu</kbd>
            Întoarce
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-2xs">→</kbd>
            {flipped ? 'Știam' : 'Răspuns'}
          </span>
        </div>

        {/* Live score chips */}
        <div className="grid grid-cols-2 gap-2">
          <div className="card flex items-center gap-2.5 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ThumbsUp size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-700">{stats.known}</p>
              <p className="text-[10px] text-slate-400">Știute</p>
            </div>
          </div>
          <div className="card flex items-center gap-2.5 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ThumbsDown size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-amber-700">{stats.repeat}</p>
              <p className="text-[10px] text-slate-400">De repetat</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => {
              setCurrentIdx(0);
              setFlipped(false);
              setStats({ known: 0, repeat: 0 });
            }}
            className="btn-ghost text-xs p-1"
          >
            <RotateCcw size={13} />
            <span>Reîncepe</span>
          </button>
          <button onClick={() => setViewMode('overview')} className="btn-ghost text-xs p-1 text-brand-600">
            Vezi lista completă
          </button>
        </div>
      </div>
    );
  }

  // Finished Deck View
  if (flashcards.length > 0 && currentIdx >= flashcards.length && viewMode === 'study') {
    return (
      <div className="space-y-4 animate-slide-up pb-6">
        <PageHeader title="Flashcards" subtitle="Sesiune finalizată" />
        <div className="card overflow-hidden p-0">
          <div className="bg-slate-900 p-6 text-center text-white">
            <Sparkles size={32} className="mx-auto mb-2 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sesiune finalizată</h2>
            <p className="mt-1 text-3xl font-bold tracking-tight">{stats.known + stats.repeat}</p>
            <p className="mt-0.5 text-xs text-slate-300">carduri parcurse</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
                <p className="text-xl font-bold text-emerald-700">{stats.known}</p>
                <p className="text-[10px] font-semibold text-emerald-800">Știute</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-center">
                <p className="text-xl font-bold text-amber-700">{stats.repeat}</p>
                <p className="text-[10px] font-semibold text-amber-800">De repetat</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => {
              setCurrentIdx(0);
              setFlipped(false);
              setStats({ known: 0, repeat: 0 });
            }}
            className="btn-primary w-full text-xs"
          >
            <RotateCcw size={15} />
            Mai repetă o dată
          </button>
          <button onClick={() => setViewMode('overview')} className="btn-secondary w-full text-xs">
            <Layers size={15} />
            Gestionează cardurile
          </button>
          <button onClick={() => onNavigate('quiz')} className="btn-ghost w-full text-xs text-brand-600">
            <Brain size={15} />
            Testează-te cu un Quiz
          </button>
        </div>
      </div>
    );
  }

  // Overview / Deck manager view or Initial generation
  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Flashcards" subtitle="Repetă eficient cu carduri inteligente." />
        {flashcards.length > 0 && (
          <button
            onClick={() => {
              setCurrentIdx(0);
              setFlipped(false);
              setViewMode('study');
            }}
            className="btn-primary text-xs"
          >
            Începe învățarea ({flashcards.length})
          </button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => handleGenerate()} />}

      {/* Generator Box */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-slate-800">Despre ce vrei flashcards noi?</label>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <Plus size={14} />
            Adaugă manual
          </button>
        </div>

        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && topic.trim()) handleGenerate();
            }}
            placeholder="Ex: Formule triunghi, Fotosinteză, Verbe..."
            className="input-field flex-1"
          />
          <button
            onClick={() => handleGenerate()}
            disabled={!topic.trim()}
            className="btn-primary shrink-0"
          >
            <Layers size={18} />
            Generează
          </button>
        </div>

        {/* Quick presets */}
        <div className="mt-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subiecte sugerate:</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_TOPICS.map((pt) => (
              <button
                key={pt.title}
                onClick={() => {
                  setTopic(pt.title);
                  handleGenerate(pt.title);
                }}
                className="rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-700 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors"
              >
                {pt.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Existing deck list */}
      {flashcards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Carduri salvate ({flashcards.length})</h2>
            <button onClick={handleClearAll} className="text-xs font-bold text-red-500 hover:text-red-700">
              Șterge toate
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {flashcards.map((fc, i) => (
              <div key={fc.id} className="card p-3.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{i + 1}. {fc.front}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{fc.back}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      fc.status === 'known'
                        ? 'bg-emerald-100 text-emerald-700'
                        : fc.status === 'repeat'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {fc.status === 'known' ? 'Știut' : fc.status === 'repeat' ? 'De repetat' : 'Nou'}
                  </span>
                  <button
                    onClick={() => deleteFlashcard(fc.id)}
                    className="text-slate-300 hover:text-red-500 p-1"
                    title="Șterge card"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* From existing lessons */}
      {lessons.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold text-slate-700">Generează direct din lecțiile tale</h2>
          <div className="space-y-2">
            {lessons.slice(0, 4).map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => {
                  setTopic(lesson.title);
                  handleGenerate(lesson.title);
                }}
                className="card flex w-full items-center gap-3 p-4 text-left transition-all hover:shadow-card hover:scale-[1.01]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                  <BookOpen size={20} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{lesson.title}</p>
                  <p className="text-xs text-slate-400">{lesson.subject ? getSubjectName(lesson.subject) : 'General'}</p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      )}

      {flashcards.length === 0 && lessons.length === 0 && (
        <EmptyState
          icon="Layers"
          title="Niciun flashcard încă"
          description="Alege un subiect din sugestii sau scrie orice noțiune pentru a genera carduri de repetat."
        />
      )}

      {/* Add Manual Flashcard Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Adaugă card manual</h3>
              <button onClick={() => setShowAddModal(false)} className="btn-ghost">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Materia</label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="input-field mt-1.5 text-sm"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Față (Întrebarea sau noțiunea)</label>
                <textarea
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="Ex: Care este capitala României?"
                  className="input-field mt-1.5 min-h-[70px] resize-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Spate (Răspunsul)</label>
                <textarea
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="Ex: București"
                  className="input-field mt-1.5 min-h-[70px] resize-none text-sm"
                />
              </div>

              <button
                onClick={handleCreateManualCard}
                disabled={!newFront.trim() || !newBack.trim()}
                className="btn-primary w-full mt-2"
              >
                <Check size={18} />
                Salvează cardul
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
