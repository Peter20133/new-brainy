import { useState, useEffect } from 'react';
import { Brain, Check, X, ChevronRight, RotateCcw, Sparkles, Trophy, Target, AlertCircle } from 'lucide-react';
import { useStore } from '@/store';
import { aiService } from '@/lib/ai';
import { PageHeader, LoadingSpinner, ErrorState, EmptyState } from '@/components/ui';
import type { QuizQuestion, PageId } from '@/types';

interface QuizState {
  questions: QuizQuestion[];
  currentIdx: number;
  answers: Record<number, string>;
  showResult: boolean;
  showExplanation: boolean;
  selectedAnswer: string | null;
}

export function Quiz({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile, lessons, quizResults, addQuizResult, upsertProgress, addStudySession, checkAndAwardBadges } = useStore();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [topic, setTopic] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  useEffect(() => {
    setFocusedIndex(0);
  }, [quiz?.currentIdx]);

  const generateFromLesson = async (lessonTitle?: string) => {
    if (!profile) return;
    setGenerating(true);
    setError(null);
    setQuiz(null);

    const quizTopic = lessonTitle || topic || lessons[0]?.title || 'matematică de bază';

    try {
      const questions = await aiService.generateQuiz(profile, quizTopic, 10);
      if (questions.length === 0) throw new Error('Nu am putut genera întrebări');
      setQuiz({
        questions,
        currentIdx: 0,
        answers: {},
        showResult: false,
        showExplanation: false,
        selectedAnswer: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut genera quiz-ul.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (!quiz || quiz.showExplanation) return;
    const q = quiz.questions[quiz.currentIdx];
    setQuiz({
      ...quiz,
      answers: { ...quiz.answers, [quiz.currentIdx]: answer },
      selectedAnswer: answer,
      showExplanation: true,
    });

    // Track progress for the subject
    if (profile && q) {
      const isCorrect = answer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
      const subject = lessons.find((l) => l.title === topic)?.subject || 'general';
      upsertProgress(subject, {
        correct_answers: isCorrect ? 1 : 0,
        total_answers: 1,
      });
    }
  };

  const handleNext = () => {
    if (!quiz) return;
    if (quiz.currentIdx + 1 >= quiz.questions.length) {
      finishQuiz();
    } else {
      setQuiz({
        ...quiz,
        currentIdx: quiz.currentIdx + 1,
        showExplanation: false,
        selectedAnswer: null,
      });
    }
  };

  const finishQuiz = async () => {
    if (!quiz || !profile) return;
    const score = quiz.questions.reduce((acc, q, i) => {
      const ans = quiz.answers[i];
      return acc + (ans && ans.toLowerCase().trim() === q.correct_answer.toLowerCase().trim() ? 1 : 0);
    }, 0);
    const total = quiz.questions.length;
    const weak = quiz.questions
      .filter((q, i) => {
        const ans = quiz.answers[i];
        return ans && ans.toLowerCase().trim() !== q.correct_answer.toLowerCase().trim();
      })
      .map((q) => q.question.slice(0, 40));

    await addQuizResult({
      title: topic || 'Quiz',
      questions: quiz.questions,
      answers: Object.entries(quiz.answers).map(([k, v]) => ({ [k]: v })),
      score,
      total,
      weak_topics: weak,
    });

    const subject = lessons.find((l) => l.title === topic)?.subject || 'general';
    await upsertProgress(subject, { quizzes_completed: 1, xp_earned: 20 });
    await addStudySession(subject, 'quiz', 10);
    await checkAndAwardBadges();

    setQuiz({ ...quiz, showResult: true });
  };

  const restart = () => {
    setQuiz(null);
    setTopic('');
  };

  // Keyboard navigation for computer arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!quiz || quiz.showResult) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const q = quiz.questions[quiz.currentIdx];
      const options = q?.options || [];

      // When explanation is showing, any advance key moves forward
      if (quiz.showExplanation) {
        if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      // If answering question with multiple choice options
      if (q.type === 'short_answer') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (options[focusedIndex]) {
          handleAnswer(options[focusedIndex]);
        }
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < options.length) {
          e.preventDefault();
          setFocusedIndex(idx);
          handleAnswer(options[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quiz, focusedIndex]);

  if (generating) {
    return (
      <div className="space-y-4">
        <PageHeader title="Quiz & Teste" subtitle="Testează-ți cunoștințele prin întrebări interactive." />
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <LoadingSpinner size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-800">Generez testul...</h3>
          <p className="mt-1 text-xs text-slate-500">Pregătesc întrebări adaptate nivelului tău.</p>
        </div>
      </div>
    );
  }

  // Quiz results view
  if (quiz?.showResult) {
    const score = quiz.questions.reduce((acc, q, i) => {
      const ans = quiz.answers[i];
      return acc + (ans && ans.toLowerCase().trim() === q.correct_answer.toLowerCase().trim() ? 1 : 0);
    }, 0);
    const total = quiz.questions.length;
    const percent = Math.round((score / total) * 100);
    const message = percent >= 80 ? 'Excelent!' : percent >= 60 ? 'Foarte bine!' : percent >= 40 ? 'Bine, dar mai repetă!' : 'Mai ai de exersat!';

    return (
      <div className="space-y-4 animate-slide-up">
        <div className="card overflow-hidden p-0">
          <div className="bg-slate-900 p-6 text-center text-white">
            <Trophy size={36} className="mx-auto mb-2 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rezultatul tău</h2>
            <p className="mt-1 text-4xl font-bold tracking-tight">{score} <span className="text-xl font-normal text-slate-400">/ {total}</span></p>
            <p className="mt-1 text-sm font-semibold text-slate-200">{message}</p>
          </div>
          <div className="p-4">
            <div className="mb-3">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700">Scor total</span>
                <span className="text-slate-500 font-medium">{percent}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            {quiz.questions.some((q, i) => {
              const ans = quiz.answers[i];
              return ans && ans.toLowerCase().trim() !== q.correct_answer.toLowerCase().trim();
            }) && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                <div className="flex items-center gap-1.5">
                  <Target size={15} className="text-amber-700" />
                  <h3 className="text-xs font-bold text-amber-900">Subiecte de repetat</h3>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {quiz.questions.map((q, i) => {
                    const ans = quiz.answers[i];
                    if (ans && ans.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) return null;
                    return (
                      <li key={i} className="text-[11px] text-amber-800 leading-relaxed">
                        • {q.question.slice(0, 70)}...
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={restart} className="btn-primary w-full text-xs">
            <RotateCcw size={15} />
            Mai încearcă o dată
          </button>
          <button onClick={() => onNavigate('flashcards')} className="btn-secondary w-full text-xs">
            <Sparkles size={15} />
            Repetă cu flashcards
          </button>
        </div>
      </div>
    );
  }

  // Active quiz view
  if (quiz) {
    const q = quiz.questions[quiz.currentIdx];
    const progress = ((quiz.currentIdx + 1) / quiz.questions.length) * 100;
    const isCorrect = quiz.selectedAnswer?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();

    return (
      <div className="space-y-5 pb-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Întrebarea {quiz.currentIdx + 1}/{quiz.questions.length}</span>
            <span className="text-xs text-slate-400">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-ocean-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="card p-6 animate-slide-up">
          <div className="mb-2 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-600">
            {q.type === 'multiple_choice' ? 'Alegere multiplă' : q.type === 'true_false' ? 'Adevărat / Fals' : 'Răspuns scurt'}
          </div>
          <h2 className="text-lg font-bold leading-snug text-slate-900">{q.question}</h2>

          {/* Answer area */}
          <div className="mt-5 space-y-2.5">
            {q.type === 'short_answer' ? (
              <ShortAnswerInput
                disabled={quiz.showExplanation}
                onAnswer={handleAnswer}
                value={quiz.selectedAnswer || ''}
              />
            ) : (
              <div className="space-y-2">
                {q.options?.map((opt, i) => {
                  const isSelected = quiz.selectedAnswer === opt;
                  const isThisCorrect = opt.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
                  const isFocused = focusedIndex === i && !quiz.showExplanation;

                  let style = isFocused
                    ? 'bg-slate-50 ring-2 ring-slate-900 border-transparent shadow-xs text-slate-900 font-semibold'
                    : 'bg-white border border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50/70';

                  if (quiz.showExplanation) {
                    if (isThisCorrect) style = 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-semibold';
                    else if (isSelected) style = 'bg-rose-50 border border-rose-300 text-rose-900';
                    else style = 'bg-white border border-slate-200 opacity-50 text-slate-600';
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setFocusedIndex(i);
                        handleAnswer(opt);
                      }}
                      onMouseEnter={() => !quiz.showExplanation && setFocusedIndex(i)}
                      disabled={quiz.showExplanation}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-xs sm:text-sm font-medium transition-all ${style}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <kbd
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-bold transition-colors ${
                            isFocused && !quiz.showExplanation
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-slate-100 text-slate-600'
                          }`}
                        >
                          {i + 1}
                        </kbd>
                        <span className="truncate">{opt}</span>
                      </div>
                      {quiz.showExplanation && isThisCorrect && <Check size={16} className="text-emerald-600 shrink-0 ml-2" />}
                      {quiz.showExplanation && isSelected && !isThisCorrect && <X size={16} className="text-rose-600 shrink-0 ml-2" />}
                    </button>
                  );
                })}

                {/* Keyboard hints footer */}
                <div className="hidden sm:flex items-center justify-between pt-2 px-1 text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-2xs">↑ / ↓</kbd>
                    Alege opțiunea
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-2xs">1-{q.options?.length || 4}</kbd>
                    Sau apasă tasta
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700 shadow-2xs">Enter / →</kbd>
                    {quiz.showExplanation ? 'Următoarea' : 'Confirmă'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Explanation */}
          {quiz.showExplanation && (
            <div className={`mt-4 animate-slide-up rounded-xl p-4 ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <><Check size={18} className="text-emerald-600" /><span className="text-sm font-bold text-emerald-700">Corect!</span></>
                ) : (
                  <><AlertCircle size={18} className="text-red-600" /><span className="text-sm font-bold text-red-700">Incorect</span></>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600">{q.explanation}</p>
              {!isCorrect && q.type !== 'short_answer' && (
                <p className="mt-2 text-xs font-medium text-emerald-700">Răspuns corect: {q.correct_answer}</p>
              )}
            </div>
          )}
        </div>

        {quiz.showExplanation && (
          <button onClick={handleNext} className="btn-primary w-full flex items-center justify-center gap-2 text-xs py-3">
            <span>{quiz.currentIdx + 1 >= quiz.questions.length ? 'Vezi rezultatul' : 'Următoarea întrebare'}</span>
            <kbd className="hidden sm:inline-block rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-200 shadow-2xs">Enter / →</kbd>
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    );
  }

  // Initial view
  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Quiz & Teste" subtitle="Testează-ți cunoștințele." />

      {error && <ErrorState message={error} onRetry={() => generateFromLesson()} />}

      <div className="card p-5">
        <label className="text-sm font-bold text-slate-700">Despre ce vrei quiz-ul?</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex: Fracții, Fotosinteză, Revoluția Franceză..."
          className="input-field mt-2"
        />
        <button onClick={() => generateFromLesson()} disabled={!topic.trim() && lessons.length === 0} className="btn-primary mt-4 w-full">
          <Brain size={20} />
          Generează quiz
        </button>
      </div>

      {lessons.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold text-slate-700">Generează din lecția ta</h2>
          <div className="space-y-2">
            {lessons.slice(0, 5).map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => { setTopic(lesson.title); generateFromLesson(lesson.title); }}
                className="card flex w-full items-center gap-3 p-4 text-left transition-all hover:shadow-card"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                  <Brain size={20} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{lesson.title}</p>
                  <p className="text-xs text-slate-400">{lesson.subject}</p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      )}

      {quizResults.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-bold text-slate-700">Quiz-uri anterioare</h2>
          <div className="space-y-2">
            {quizResults.slice(0, 5).map((qr) => (
              <div key={qr.id} className="card flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-ocean-500 text-white">
                  <Trophy size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{qr.title}</p>
                  <p className="text-xs text-slate-400">{new Date(qr.created_at).toLocaleDateString('ro-RO')}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-brand-600">{qr.score}/{qr.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lessons.length === 0 && quizResults.length === 0 && (
        <EmptyState
          icon="Brain"
          title="Niciun quiz încă"
          description="Generează un quiz despre orice subiect sau fotografiază o lecție mai întâi."
        />
      )}
    </div>
  );
}

function ShortAnswerInput({ disabled, onAnswer, value }: { disabled: boolean; onAnswer: (v: string) => void; value: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder="Scrie răspunsul tău..."
        className="input-field"
        onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) onAnswer(text.trim()); }}
      />
      {!disabled && (
        <button onClick={() => text.trim() && onAnswer(text.trim())} className="btn-primary mt-3 w-full">
          <Check size={18} />
          Confirmă răspunsul
        </button>
      )}
    </div>
  );
}
