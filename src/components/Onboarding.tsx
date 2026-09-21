import { useState } from 'react';
import { Brain, Sparkles, ChevronRight, Check, ArrowLeft, ArrowRight, BookOpen, Calculator, FlaskConical, Atom, Leaf, Landmark, Globe, Languages } from 'lucide-react';
import { SUBJECTS, GRADES, GRADE_SHORT } from '@/constants';
import type { SubjectSlug } from '@/types';

const SUBJECT_ICONS: Record<string, typeof BookOpen> = {
  matematica: Calculator,
  'limba-romana': BookOpen,
  engleza: Languages,
  istorie: Landmark,
  geografie: Globe,
  biologie: Leaf,
  fizica: Atom,
  chimie: FlaskConical,
};

const SUBJECT_COLORS: Record<string, string> = {
  matematica: 'from-ocean-400 to-ocean-600',
  'limba-romana': 'from-brand-400 to-brand-600',
  engleza: 'from-cyan-400 to-ocean-600',
  istorie: 'from-amber-400 to-orange-600',
  geografie: 'from-emerald-400 to-green-600',
  biologie: 'from-green-400 to-emerald-600',
  fizica: 'from-blue-400 to-indigo-600',
  chimie: 'from-violet-400 to-brand-600',
};

export function Onboarding({ onComplete }: { onComplete: (data: { name: string; grade: number; subjects: SubjectSlug[] }) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<SubjectSlug[]>([]);

  const toggleSubject = (slug: SubjectSlug) => {
    setSubjects((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleFinish = () => {
    if (name.trim() && grade && subjects.length > 0) {
      onComplete({ name: name.trim(), grade, subjects });
    }
  };

  const canProceed = () => {
    if (step === 2) return name.trim().length > 0;
    if (step === 3) return grade !== null;
    if (step === 4) return subjects.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-ocean-50">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6">
        {/* Progress dots */}
        {step > 0 && step < 5 && (
          <div className="flex justify-center gap-2 pt-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s <= step ? 'w-8 bg-brand-500' : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        )}

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center animate-fade-in">
            <div className="relative mb-8">
              <div className="absolute inset-0 animate-pulse-glow rounded-[2.5rem] bg-brand-400/20 blur-2xl" />
              <div className="relative flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-brand-600 to-ocean-600 shadow-float">
                <Brain size={64} className="text-white" strokeWidth={1.5} />
              </div>
              <Sparkles size={24} className="absolute -right-2 -top-2 text-amber-400 animate-bounce-soft" />
              <Sparkles size={18} className="absolute -bottom-1 -left-3 text-brand-400 animate-float" />
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Salut! Eu sunt <span className="gradient-text">Brainy AI</span>
            </h1>
            <p className="mt-4 max-w-sm text-lg leading-relaxed text-slate-600 text-balance">
              Te ajut să înțelegi lecțiile, să-ți faci temele și să înveți mai ușor.
            </p>

            <div className="mt-10 w-full space-y-3">
              {[
                { icon: BookOpen, text: 'Fotografiază o lecție și o explic pe înțelesul tău' },
                { icon: Calculator, text: 'Rezolvă temele pas cu pas, fără să-ți dau doar răspunsul' },
                { icon: Sparkles, text: 'Quiz-uri, flashcards și planuri de învățare' },
              ].map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 text-left shadow-soft backdrop-blur animate-slide-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                    <f.icon size={20} className="text-brand-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">{f.text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(1)}
              className="btn-primary mt-10 w-full text-base"
            >
              Hai să începem!
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="flex flex-1 flex-col justify-center animate-slide-up">
            <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-600">Pas 1 din 3</div>
            <h2 className="text-2xl font-extrabold text-slate-900">Cum te cheamă?</h2>
            <p className="mt-2 text-slate-500">Așa îți voi spune când ne vedem.</p>

            <div className="mt-8">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Numele tău..."
                className="input-field text-lg"
                autoFocus
                maxLength={30}
                onKeyDown={(e) => { if (e.key === 'Enter' && canProceed()) setStep(2); }}
              />
            </div>

            <div className="mt-auto flex gap-3 pb-8 pt-8">
              <button onClick={() => setStep(0)} className="btn-ghost">
                <ArrowLeft size={20} />
                Înapoi
              </button>
              <button
                onClick={() => canProceed() && setStep(2)}
                disabled={!canProceed()}
                className="btn-primary flex-1"
              >
                Continuă
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Grade */}
        {step === 2 && (
          <div className="flex flex-1 flex-col justify-center animate-slide-up">
            <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-600">Pas 2 din 3</div>
            <h2 className="text-2xl font-extrabold text-slate-900">În ce clasă ești?</h2>
            <p className="mt-2 text-slate-500">Adaptez explicațiile după nivelul tău.</p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`group relative flex items-center justify-center gap-2 rounded-2xl p-5 font-bold transition-all duration-200 ${
                    grade === g
                      ? 'bg-gradient-to-br from-brand-600 to-ocean-600 text-white shadow-glow scale-105'
                      : 'bg-white text-slate-700 shadow-soft hover:shadow-card hover:scale-102'
                  }`}
                >
                  {grade === g && (
                    <Check size={18} className="absolute right-3 top-3 text-white" />
                  )}
                  <span className="text-2xl">{GRADE_SHORT[g]}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto flex gap-3 pb-8 pt-8">
              <button onClick={() => setStep(1)} className="btn-ghost">
                <ArrowLeft size={20} />
                Înapoi
              </button>
              <button
                onClick={() => canProceed() && setStep(3)}
                disabled={!canProceed()}
                className="btn-primary flex-1"
              >
                Continuă
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Subjects */}
        {step === 3 && (
          <div className="flex flex-1 flex-col justify-center animate-slide-up pb-8">
            <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-600">Pas 3 din 3</div>
            <h2 className="text-2xl font-extrabold text-slate-900">Ce materii studiezi?</h2>
            <p className="mt-2 text-slate-500">Poți alege mai multe. Le poți schimba oricând.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {SUBJECTS.map((s) => {
                const Icon = SUBJECT_ICONS[s.slug] || BookOpen;
                const isSelected = subjects.includes(s.slug);
                return (
                  <button
                    key={s.slug}
                    onClick={() => toggleSubject(s.slug)}
                    className={`group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl p-4 text-left transition-all duration-200 ${
                      isSelected
                        ? 'ring-2 ring-brand-500 shadow-card scale-102'
                        : 'bg-white shadow-soft hover:shadow-card'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${SUBJECT_COLORS[s.slug]} text-white shadow-soft`}>
                      <Icon size={22} />
                    </div>
                    <span className="text-sm font-bold text-slate-800">{s.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(2)} className="btn-ghost">
                <ArrowLeft size={20} />
                Înapoi
              </button>
              <button
                onClick={handleFinish}
                disabled={!canProceed()}
                className="btn-primary flex-1"
              >
                Gata!
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
