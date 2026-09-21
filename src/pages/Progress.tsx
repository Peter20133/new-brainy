import { Zap, Trophy, Flame, BookOpen, Brain, Target, TrendingUp, Award } from 'lucide-react';
import { useStore } from '@/store';
import { PageHeader, ProgressBar, EmptyState } from '@/components/ui';
import { SUBJECTS, levelProgress, BADGES } from '@/constants';
import { Icon } from '@/components/Icon';
import type { PageId } from '@/types';

export function Progress({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile, progress, quizResults, badges, lessons, studySessions } = useStore();
  if (!profile) return null;

  const lp = levelProgress(profile.xp);
  const totalCorrect = progress.reduce((acc, p) => acc + p.correct_answers, 0);
  const totalAnswers = progress.reduce((acc, p) => acc + p.total_answers, 0);
  const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
  const totalTime = studySessions.reduce((acc, s) => acc + s.duration_minutes, 0);

  // Subject rankings
  const subjectProgress = SUBJECTS.filter((s) => profile.selected_subjects.includes(s.slug))
    .map((s) => {
      const p = progress.find((pr) => pr.subject === s.slug);
      const xp = p?.xp_earned || 0;
      const acc = p && p.total_answers > 0 ? Math.round((p.correct_answers / p.total_answers) * 100) : 0;
      return { slug: s.slug, name: s.name, icon: s.icon, xp, accuracy: acc, lessons: p?.lessons_completed || 0, time: p?.time_spent_minutes || 0 };
    })
    .sort((a, b) => b.xp - a.xp);

  const bestSubjects = subjectProgress.filter((s) => s.xp > 0).slice(0, 3);
  const weakSubjects = [...subjectProgress].sort((a, b) => a.accuracy - b.accuracy).filter((s) => s.xp > 0).slice(0, 3);

  const earnedBadgeIds = new Set(badges.map((b) => b.badge_id));

  const stats = [
    { icon: Zap, label: 'XP total', value: profile.xp, color: 'text-indigo-600' },
    { icon: Trophy, label: 'Nivel', value: profile.level, color: 'text-slate-800' },
    { icon: Flame, label: 'Streak', value: `${profile.streak}z`, color: 'text-amber-600' },
    { icon: BookOpen, label: 'Lecții', value: profile.lessons_completed, color: 'text-emerald-600' },
    { icon: Brain, label: 'Quiz-uri', value: profile.quizzes_completed, color: 'text-indigo-600' },
    { icon: Target, label: 'Acuratețe', value: `${accuracy}%`, color: 'text-teal-600' },
  ];

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Progresul meu" subtitle="Evoluția ta și recompensele câștigate." />

      {/* Overall stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div key={i} className="card flex flex-col items-center justify-center p-3 text-center">
            <s.icon size={16} className={`${s.color} mb-1`} />
            <span className="text-base font-bold tracking-tight text-slate-900">{s.value}</span>
            <span className="text-[10px] font-medium text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Level progress */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Trophy size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Nivel {profile.level}</p>
              <p className="text-[11px] text-slate-400">{lp.current} / {lp.needed} XP până la nivelul {profile.level + 1}</p>
            </div>
          </div>
          <span className="text-lg font-bold text-slate-900">{profile.xp} XP</span>
        </div>
        <ProgressBar value={lp.current} max={lp.needed} className="mt-3" />
      </div>

      {/* Study time */}
      <div className="card p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <TrendingUp size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Timp total de studiu</p>
            <p className="text-[11px] text-slate-400">
              {Math.floor(totalTime / 60) > 0 ? `${Math.floor(totalTime / 60)}h ` : ''}{totalTime % 60} min
            </p>
          </div>
        </div>
      </div>

      {/* Subject progress */}
      {subjectProgress.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Progres pe materii</h2>
          <div className="space-y-2">
            {subjectProgress.map((s, i) => {
              const max = Math.max(...subjectProgress.map((sp) => sp.xp), 1);
              return (
                <div key={i} className="card p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Icon name={s.icon} size={15} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{s.name}</p>
                        <p className="text-[10px] text-slate-400">{s.lessons} lecții · {s.accuracy}% acuratețe</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{s.xp} XP</span>
                  </div>
                  <ProgressBar value={s.xp} max={max} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Best subjects */}
      {bestSubjects.length > 0 && (
        <div className="card p-4">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Award size={16} className="text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800">Materiile cu cel mai bun rezultat</h3>
          </div>
          <div className="space-y-1.5">
            {bestSubjects.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2 text-xs">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-[10px] font-bold text-white">{i + 1}</span>
                <span className="flex-1 font-semibold text-emerald-900">{s.name}</span>
                <span className="font-bold text-emerald-700">{s.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak subjects */}
      {weakSubjects.length > 0 && weakSubjects.some((s) => s.accuracy < 80) && (
        <div className="card p-4">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Target size={16} className="text-amber-600" />
            <h3 className="text-xs font-bold text-slate-800">Materii de consolidat</h3>
          </div>
          <div className="space-y-1.5">
            {weakSubjects.filter((s) => s.accuracy < 80 || s.xp < 50).map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/60 p-2 text-xs">
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">{s.name}</p>
                  <p className="text-[10px] text-amber-700">{s.accuracy}% rată de succes</p>
                </div>
                <button onClick={() => onNavigate('quiz')} className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-amber-700">
                  Exersează
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      <div>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Insigne & Recompense</h2>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map((badge) => {
            const earned = earnedBadgeIds.has(badge.id);
            return (
              <div
                key={badge.id}
                className={`card flex items-center gap-2.5 p-3 transition-all ${earned ? 'border-slate-300' : 'opacity-50'}`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${earned ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <Icon name={badge.icon} size={18} />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${earned ? 'text-slate-800' : 'text-slate-500'}`}>{badge.name}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{badge.description}</p>
                  {earned && <p className="mt-0.5 text-[10px] font-bold text-emerald-600">+{badge.xpReward} XP</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent quizzes */}
      {quizResults.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Quiz-uri recente</h2>
          <div className="space-y-1.5">
            {quizResults.slice(0, 5).map((qr) => (
              <div key={qr.id} className="card flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Brain size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{qr.title}</p>
                    <p className="text-[10px] text-slate-400">{new Date(qr.created_at).toLocaleDateString('ro-RO')}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-700">{qr.score}/{qr.total_questions}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {subjectProgress.length === 0 && lessons.length === 0 && quizResults.length === 0 && (
        <EmptyState
          title="Nu ai progres încă"
          description="Începe să înveți cu Brainy și vei vedea statistici aici."
        />
      )}
    </div>
  );
}
