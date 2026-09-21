import { useState } from 'react';
import {
  Shield,
  Clock,
  BookOpen,
  Brain,
  Target,
  TrendingUp,
  Lock,
  ArrowLeft,
  CheckCircle,
  X,
  KeyRound,
  Check,
} from 'lucide-react';
import { useStore } from '@/store';
import { PageHeader, EmptyState } from '@/components/ui';
import { SUBJECTS, PARENT_PIN_DEFAULT } from '@/constants';
import { Icon } from '@/components/Icon';
import type { PageId } from '@/types';

export function ParentMode({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile, lessons, quizResults, progress, studySessions, updateProfile } = useStore();
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);

  // PIN change state
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);

  if (!profile) return null;

  const currentPin = profile.parent_pin || PARENT_PIN_DEFAULT;

  const handleUnlock = () => {
    if (pinInput === currentPin) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setPinInput('');
    }
  };

  const handleSaveNewPin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinChangeError('PIN-ul trebuie să conțină exact 4 cifre.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeError('PIN-urile nu coincid.');
      return;
    }

    await updateProfile({ parent_pin: newPin });
    setPinChangeSuccess(true);
    setTimeout(() => {
      setShowPinModal(false);
      setPinChangeSuccess(false);
      setNewPin('');
      setConfirmPin('');
      setPinChangeError(null);
    }, 1200);
  };

  const handleSetDailyGoal = async (minutes: number) => {
    const settings = { ...(profile.settings || {}), daily_goal_minutes: minutes };
    await updateProfile({ settings });
  };

  const disableParentMode = async () => {
    await updateProfile({ is_parent_mode: false });
    onNavigate('profile');
  };

  // PIN entry screen
  if (!unlocked) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
          <Lock size={24} />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-900">Mod Părinte</h2>
          <p className="mt-1 text-xs text-slate-500">Introdu codul PIN pentru acces</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {profile.parent_pin ? 'Codul stabilit de tine' : `Codul inițial este ${PARENT_PIN_DEFAULT}`}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2.5">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && pinInput.length === 4) handleUnlock();
            }}
            placeholder="• • • •"
            className="w-44 rounded-xl border border-slate-200 text-center text-xl font-bold tracking-[0.4em] focus:border-slate-900 focus:outline-none py-2.5 bg-white"
            autoFocus
          />
          {error && <p className="text-xs font-semibold text-rose-500">Cod incorect. Reîncearcă.</p>}
          <button onClick={handleUnlock} disabled={pinInput.length < 4} className="btn-primary text-xs py-2.5 px-5">
            <Shield size={16} />
            Deblochează
          </button>
          <button onClick={() => onNavigate('profile')} className="btn-ghost text-xs">
            <ArrowLeft size={14} />
            Înapoi la profil
          </button>
        </div>
      </div>
    );
  }

  // Unlocked dashboard
  const totalTime = studySessions.reduce((acc, s) => acc + s.duration_minutes, 0);
  const totalLessons = lessons.length;
  const totalQuizzes = quizResults.length;
  const avgScore =
    quizResults.length > 0
      ? Math.round(quizResults.reduce((acc, q) => acc + (q.score / q.total) * 100, 0) / quizResults.length)
      : 0;

  const currentDailyGoal = (profile.settings?.daily_goal_minutes as number) || 30;

  const subjectStats = SUBJECTS.filter((s) => profile.selected_subjects.includes(s.slug))
    .map((s) => {
      const p = progress.find((pr) => pr.subject === s.slug);
      const sessions = studySessions.filter((ss) => ss.subject === s.slug);
      const minutes = (p?.time_spent_minutes || 0) + sessions.reduce((a, s) => a + s.duration_minutes, 0);
      const acc = p && p.total_answers > 0 ? Math.round((p.correct_answers / p.total_answers) * 100) : 0;
      return {
        slug: s.slug,
        name: s.name,
        icon: s.icon,
        lessons: p?.lessons_completed || 0,
        quizzes: p?.quizzes_completed || 0,
        minutes,
        accuracy: acc,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  const weakSubjects = subjectStats.filter((s) => s.accuracy < 70 && s.accuracy > 0);

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Mod Părinte" subtitle={`Monitorizare activitate: ${profile.name}`} />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPinModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 bg-white px-2.5 py-1 rounded-lg"
            title="Schimbă codul PIN"
          >
            <KeyRound size={13} />
            Schimbă PIN
          </button>
          <button onClick={disableParentMode} className="btn-ghost text-xs p-1">
            <X size={15} />
            Ieșire
          </button>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex items-start gap-2.5">
          <Shield size={16} className="mt-0.5 shrink-0 text-slate-600" />
          <p className="text-xs leading-relaxed text-slate-600">
            Acest panou oferă o vedere de ansamblu asupra timpului de studiu și testelor.
            Conversațiile elevului cu asistentul AI rămân private.
          </p>
        </div>
      </div>

      {/* Daily Goal control */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="text-xs font-bold text-slate-800">Obiectiv zilnic de învățare</h3>
            <p className="text-[11px] text-slate-400">Timp recomandat pentru elev</p>
          </div>
          <span className="text-xs font-bold text-slate-900">{currentDailyGoal} min / zi</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[15, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => handleSetDailyGoal(mins)}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-all border ${
                currentDailyGoal === mins
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Clock}
          label="Timp de studiu"
          value={`${Math.floor(totalTime / 60) > 0 ? `${Math.floor(totalTime / 60)}h ` : ''}${totalTime % 60}m`}
        />
        <StatCard
          icon={BookOpen}
          label="Lecții parcurse"
          value={totalLessons.toString()}
        />
        <StatCard
          icon={Brain}
          label="Quiz-uri rezolvate"
          value={totalQuizzes.toString()}
        />
        <StatCard
          icon={Target}
          label="Scor mediu teste"
          value={`${avgScore}%`}
        />
      </div>

      {/* Subject breakdown */}
      {subjectStats.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-800">Activitate pe materii</h2>
          <div className="space-y-2.5">
            {subjectStats.map((s, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                      <Icon name={s.icon} size={20} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-400">
                        {s.lessons} lecții · {s.quizzes} quiz-uri · {s.minutes} min
                      </p>
                    </div>
                  </div>
                  {s.accuracy > 0 && (
                    <div className="text-right">
                      <p
                        className={`text-lg font-extrabold ${
                          s.accuracy >= 70 ? 'text-emerald-600' : 'text-orange-500'
                        }`}
                      >
                        {s.accuracy}%
                      </p>
                      <p className="text-[10px] text-slate-400">acuratețe</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="Nu sunt date încă" description="Elevul nu a început să învețe cu Brainy încă." />
      )}

      {/* Weak subjects */}
      {weakSubjects.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-orange-500" />
            <h3 className="text-sm font-bold text-slate-800">Materii care necesită mai multă atenție</h3>
          </div>
          <div className="space-y-2">
            {weakSubjects.map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-orange-50 p-3">
                <Icon name={s.icon} size={18} className="text-orange-600" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-orange-800">{s.name}</p>
                  <p className="text-xs text-orange-600">Rată corectă de {s.accuracy}% la quiz-uri</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent quizzes */}
      {quizResults.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-800">Rezultate teste recente</h2>
          <div className="space-y-2">
            {quizResults.slice(0, 6).map((qr) => {
              const pct = Math.round((qr.score / qr.total) * 100);
              return (
                <div key={qr.id} className="card flex items-center gap-3 p-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      pct >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'
                    }`}
                  >
                    {pct >= 70 ? <CheckCircle size={20} /> : <Target size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{qr.title}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(qr.created_at).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-extrabold ${pct >= 70 ? 'text-emerald-600' : 'text-orange-500'}`}
                  >
                    {qr.score}/{qr.total} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {showPinModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setShowPinModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Schimbă codul PIN</h3>
              <button onClick={() => setShowPinModal(false)} className="btn-ghost">
                <X size={20} />
              </button>
            </div>

            {pinChangeSuccess ? (
              <div className="py-6 text-center text-emerald-600">
                <CheckCircle size={44} className="mx-auto mb-2" />
                <p className="font-bold">Codul PIN a fost schimbat cu succes!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">PIN nou (4 cifre)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="••••"
                    className="input-field mt-1.5 text-center text-xl font-bold tracking-widest"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Confirmă PIN-ul nou</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="••••"
                    className="input-field mt-1.5 text-center text-xl font-bold tracking-widest"
                  />
                </div>

                {pinChangeError && <p className="text-xs font-bold text-red-500">{pinChangeError}</p>}

                <button
                  onClick={handleSaveNewPin}
                  disabled={newPin.length !== 4 || confirmPin.length !== 4}
                  className="btn-primary w-full mt-2"
                >
                  <Check size={18} />
                  Salvează noul PIN
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="card p-3.5">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <Icon size={16} />
      </div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
}
