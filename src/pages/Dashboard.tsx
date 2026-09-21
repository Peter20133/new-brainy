import { Sparkles, Camera, FileText, Brain, Layers, BarChart3, ArrowRight, Flame, Zap, Trophy, Target, BookOpen } from 'lucide-react';
import { useStore } from '@/store';
import { ProgressBar } from '@/components/ui';
import { levelProgress, GRADE_LABELS, getSubjectName } from '@/constants';
import type { PageId } from '@/types';

export function Dashboard({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile, lessons } = useStore();
  if (!profile) return null;

  const lp = levelProgress(profile.xp);

  const features = [
    { id: 'solve-homework' as PageId, icon: Camera, title: 'Rezolvă tema', desc: 'Fă poză sau încarcă din galerie. AI-ul o rezolvă pe loc.', iconBg: 'bg-rose-50 text-rose-600' },
    { id: 'homework' as PageId, icon: FileText, title: 'Ajutor la teme', desc: 'Explicații ghidate pas cu pas.', iconBg: 'bg-indigo-50 text-indigo-600' },
    { id: 'photo' as PageId, icon: Sparkles, title: 'Poza & Învață', desc: 'Încarcă o poză și Brainy o explică clar.', iconBg: 'bg-blue-50 text-blue-600' },
    { id: 'chat' as PageId, icon: Sparkles, title: 'Întreabă AI', desc: 'Discută orice lecție cu asistentul tău.', iconBg: 'bg-slate-100 text-slate-700' },
    { id: 'quiz' as PageId, icon: Brain, title: 'Quiz & Teste', desc: 'Verifică dacă ai stăpânit noțiunile.', iconBg: 'bg-amber-50 text-amber-600' },
    { id: 'flashcards' as PageId, icon: Layers, title: 'Flashcards', desc: 'Repetare rapidă cu carduri inteligente.', iconBg: 'bg-emerald-50 text-emerald-600' },
    { id: 'progress' as PageId, icon: BarChart3, title: 'Progresul meu', desc: 'Statistici detaliate și insigne obținute.', iconBg: 'bg-teal-50 text-teal-600' },
  ];

  return (
    <div className="space-y-5 pb-4">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {GRADE_LABELS[profile.grade]}
          </span>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            Salut, {profile.name}
          </h1>
          <p className="text-xs text-slate-500">Ce planuri ai de învățat astăzi?</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        <StatChip icon={Zap} label="XP" value={profile.xp} color="text-indigo-600" />
        <StatChip icon={Trophy} label="Nivel" value={profile.level} color="text-slate-800" />
        <StatChip icon={Flame} label="Streak" value={profile.streak} color="text-amber-600" />
        <StatChip icon={BookOpen} label="Lecții" value={profile.lessons_completed} color="text-emerald-600" />
      </div>

      {/* Level progress */}
      <div className="card p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Nivel {profile.level}</span>
          <span className="text-slate-400 font-medium">{lp.current} / {lp.needed} XP</span>
        </div>
        <ProgressBar value={lp.current} max={lp.needed} className="mt-2" />
        <p className="mt-1.5 text-[11px] text-slate-400">
          Încă {lp.needed - lp.current} XP până la nivelul {profile.level + 1}
        </p>
      </div>

      {/* Recommendation banner - Rezolvă tema direct din poză */}
      <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-rose-300">
            <Camera size={14} />
            <span>NOU: AI Vision</span>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300">
            Rezolvă tema
          </span>
        </div>

        <h2 className="mt-2 text-base font-bold sm:text-lg">Rezolvă tema direct din poză</h2>
        <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-md">
          Fă o poză cu camera sau încarcă din galerie. Brainy identifică problema și îți oferă soluția completă pas cu pas.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            id="hero-solve-homework"
            onClick={() => onNavigate('solve-homework')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-xs transition-colors hover:bg-slate-100 active:scale-98"
          >
            <Camera size={14} className="text-rose-600" />
            <span>Deschide Rezolvă tema</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Quick actions: study plan & lost */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onNavigate('study-plan')}
          className="card flex items-center gap-3 p-3.5 text-left transition-all hover:border-slate-300 hover:shadow-card active:scale-[0.99]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <Target size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Am test mâine</p>
            <p className="text-[11px] text-slate-400 truncate">Plan de învățare</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('lost')}
          className="card flex items-center gap-3 p-3.5 text-left transition-all hover:border-slate-300 hover:shadow-card active:scale-[0.99]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <Brain size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Sunt pierdut</p>
            <p className="text-[11px] text-slate-400 truncate">Ghid pas cu pas</p>
          </div>
        </button>
      </div>

      {/* What you can do */}
      <div>
        <h2 className="mb-2.5 text-sm font-bold text-slate-800">Instrumente de studiu</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {features.map((f) => (
            <button
              key={f.id}
              id={`feature-${f.id}`}
              type="button"
              onClick={() => onNavigate(f.id)}
              className="card group flex flex-col justify-between p-3.5 text-left transition-all hover:border-slate-300 hover:shadow-card active:scale-[0.99] cursor-pointer"
            >
              <div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${f.iconBg} mb-2.5`}>
                  <f.icon size={18} />
                </div>
                <h3 className="text-xs font-bold text-slate-800">{f.title}</h3>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{f.desc}</p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-brand-600 opacity-80 group-hover:opacity-100">
                <span>Deschide</span>
                <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent lessons */}
      {lessons.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Lecții recente</h2>
            <button
              onClick={() => onNavigate('lessons')}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Vezi toate
            </button>
          </div>
          <div className="space-y-1.5">
            {lessons.slice(0, 3).map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => onNavigate('lessons')}
                className="card flex w-full items-center gap-3 p-3 text-left transition-all hover:border-slate-300"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{lesson.title}</p>
                  <p className="text-[11px] text-slate-400">
                    {lesson.subject ? `${getSubjectName(lesson.subject)} · ` : ''}{new Date(lesson.created_at).toLocaleDateString('ro-RO')}
                  </p>
                </div>
                <ArrowRight size={14} className="text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ icon: Icon, label, value, color }: { icon: typeof Zap; label: string; value: number; color: string }) {
  return (
    <div className="card flex flex-col items-center justify-center py-2.5 px-2 text-center">
      <Icon size={16} className={`${color} mb-1`} />
      <span className="text-base font-bold text-slate-900 tracking-tight">{value}</span>
      <span className="text-[10px] font-medium text-slate-400">{label}</span>
    </div>
  );
}

