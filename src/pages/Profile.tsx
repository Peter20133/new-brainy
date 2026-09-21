import { useState } from 'react';
import {
  User,
  Edit3,
  GraduationCap,
  Settings,
  Shield,
  ChevronRight,
  Zap,
  Trophy,
  Flame,
  BookOpen,
  X,
  Check,
  Lock,
  BookMarked,
  Bell,
  Volume2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '@/store';
import { PageHeader } from '@/components/ui';
import { SUBJECTS, GRADES, GRADE_LABELS, GRADE_SHORT, BADGES, levelProgress, PARENT_PIN_DEFAULT } from '@/constants';
import { Icon } from '@/components/Icon';
import type { SubjectSlug, PageId, BadgeInfo } from '@/types';

export function Profile({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile, updateProfile, badges, resetAllData } = useStore();
  const [editing, setEditing] = useState(false);
  const [changingGrade, setChangingGrade] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeInfo | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubjects, setEditSubjects] = useState<SubjectSlug[]>([]);

  if (!profile) return null;
  const lp = levelProgress(profile.xp);
  const earnedBadgeIds = new Set(badges.map((b) => b.badge_id));

  const startEdit = () => {
    setEditName(profile.name);
    setEditSubjects(profile.selected_subjects);
    setEditing(true);
  };

  const saveEdit = async () => {
    await updateProfile({ name: editName.trim() || profile.name, selected_subjects: editSubjects });
    setEditing(false);
  };

  const changeGrade = async (grade: number) => {
    await updateProfile({ grade });
    setChangingGrade(false);
  };

  const toggleSubject = (slug: SubjectSlug) => {
    setEditSubjects((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  const enableParentMode = async () => {
    await updateProfile({ is_parent_mode: true, parent_pin: profile.parent_pin || PARENT_PIN_DEFAULT });
    onNavigate('parent');
  };

  const toggleSetting = async (key: string) => {
    const currentSettings = profile.settings || {};
    const updated = {
      ...currentSettings,
      [key]: !currentSettings[key],
    };
    await updateProfile({ settings: updated });
  };

  const handleResetData = async () => {
    await resetAllData();
    setShowResetConfirm(false);
    setShowSettings(false);
    window.location.reload();
  };

  const stats = [
    { icon: Zap, label: 'XP', value: profile.xp, color: 'text-brand-600', bg: 'bg-brand-50' },
    { icon: Trophy, label: 'Nivel', value: profile.level, color: 'text-ocean-600', bg: 'bg-ocean-50' },
    { icon: Flame, label: 'Streak', value: profile.streak, color: 'text-orange-500', bg: 'bg-orange-50' },
    { icon: BookOpen, label: 'Lecții', value: profile.lessons_completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="Profil" subtitle="Contul și preferințele tale de învățare." />

      {/* Profile card */}
      <div className="card overflow-hidden p-0">
        <div className="bg-slate-900 p-5 text-white">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-200">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{profile.name}</h2>
              <p className="text-xs text-slate-400">{GRADE_LABELS[profile.grade]}</p>
            </div>
          </div>
          <div className="mt-3.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Nivel {profile.level}</span>
              <span>{lp.current}/{lp.needed} XP</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${lp.percent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-slate-100 bg-white">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 py-3">
              <span className="text-base font-bold text-slate-900">{s.value}</span>
              <span className="text-[10px] font-medium text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subjects */}
      <div className="card p-4">
        <h3 className="mb-2.5 text-xs font-bold text-slate-900">Materiile mele</h3>
        <div className="flex flex-wrap gap-1.5">
          {profile.selected_subjects.map((slug) => {
            const info = SUBJECTS.find((s) => s.slug === slug);
            if (!info) return null;
            return (
              <div key={slug} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">
                <Icon name={info.icon} size={13} className="text-slate-600" />
                <span className="text-xs font-medium text-slate-700">{info.name}</span>
              </div>
            );
          })}
          {profile.selected_subjects.length === 0 && (
            <p className="text-xs text-slate-400">Nicio materie selectată</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-1.5">
        <button
          onClick={startEdit}
          className="card flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-slate-300"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Edit3 size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">Editează profilul</p>
            <p className="text-[11px] text-slate-400 truncate">Nume și materii alese</p>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <button
          onClick={() => setChangingGrade(true)}
          className="card flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-slate-300"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <GraduationCap size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">Schimbă clasa</p>
            <p className="text-[11px] text-slate-400 truncate">Actual: {GRADE_LABELS[profile.grade]}</p>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="card flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-slate-300"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Settings size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">Preferințe și setări</p>
            <p className="text-[11px] text-slate-400 truncate">Sunete, notificări, resetare</p>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>

        <button
          onClick={enableParentMode}
          className="card flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-slate-300"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Shield size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">Mod Părinte</p>
            <p className="text-[11px] text-slate-400 truncate">Statistici, timp de studiu și PIN</p>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </div>

      {/* Badges summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold text-slate-900">
            Insigne ({badges.length}/{BADGES.length})
          </h2>
          <span className="text-[11px] text-slate-400">Apasă pentru detalii</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {BADGES.map((badge) => {
            const earned = earnedBadgeIds.has(badge.id);
            return (
              <button
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className="flex flex-col items-center gap-1 focus:outline-none group text-left"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all border ${
                    earned
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-300'
                  }`}
                >
                  <Icon name={badge.icon} size={18} />
                </div>
                <span
                  className={`text-center text-[10px] font-medium leading-tight truncate w-full ${
                    earned ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {badge.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Badge details modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-scale-in text-center border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border ${
                earnedBadgeIds.has(selectedBadge.id)
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              <Icon name={selectedBadge.icon} size={24} />
            </div>

            <h3 className="text-sm font-bold text-slate-900">{selectedBadge.name}</h3>
            <p className="mt-1 text-xs text-slate-500">{selectedBadge.description}</p>

            <div className="my-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-0.5">Cerință:</span>
              {selectedBadge.requirement}
            </div>

            <div className="flex items-center justify-between px-1 mb-3 text-xs font-semibold">
              <span className="text-slate-900">+{selectedBadge.xpReward} XP</span>
              <span className={earnedBadgeIds.has(selectedBadge.id) ? 'text-emerald-600' : 'text-slate-400'}>
                {earnedBadgeIds.has(selectedBadge.id) ? '✓ Deblocată' : '🔒 Blocată'}
              </span>
            </div>

            <button onClick={() => setSelectedBadge(null)} className="btn-secondary w-full py-2 text-xs">
              Închide
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-900/50 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4"
          onClick={() => setEditing(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl animate-slide-up border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Editează profilul</h3>
              <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Nume</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-field mt-1 text-xs"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Materii alese</label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {SUBJECTS.map((s) => (
                    <button
                      key={s.slug}
                      onClick={() => toggleSubject(s.slug)}
                      className={`flex items-center gap-1.5 rounded-lg p-2 text-xs font-medium transition-all border ${
                        editSubjects.includes(s.slug)
                          ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon name={s.icon} size={14} />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={saveEdit} className="btn-primary w-full mt-2 text-xs py-2">
                <Check size={16} />
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade change modal */}
      {changingGrade && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4"
          onClick={() => setChangingGrade(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl animate-slide-up border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Schimbă clasa</h3>
              <button onClick={() => setChangingGrade(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => changeGrade(g)}
                  className={`flex items-center justify-center gap-1.5 rounded-xl p-3 text-xs font-semibold transition-all border ${
                    profile.grade === g
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <GraduationCap size={15} />
                  {GRADE_SHORT[g]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-900/50 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl animate-slide-up border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900">Preferințe și setări</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              <InteractiveSettingRow
                icon={Bell}
                label="Notificări zilnice"
                description="Reamintește-mi să învăț zilnic"
                active={profile.settings?.notifications !== false}
                onToggle={() => toggleSetting('notifications')}
              />
              <InteractiveSettingRow
                icon={Volume2}
                label="Efecte sonore"
                description="Sunete la finalizarea quiz-ului și timer-ului"
                active={profile.settings?.sound_effects !== false}
                onToggle={() => toggleSetting('sound_effects')}
              />
              <InteractiveSettingRow
                icon={Lock}
                label="Confidențialitate date"
                description="Datele se salvează securizat local"
                active={true}
                readOnly
              />
              <InteractiveSettingRow
                icon={BookMarked}
                label="Limba interfeței"
                description="Română (implicit)"
                active={true}
                readOnly
              />

              <div className="pt-2">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 size={14} />
                  Resetează progresul și profilul
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl animate-scale-in text-center border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Ești sigur?</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Această acțiune va șterge toate datele de progres, istoricul quiz-urilor, lecțiile și flashcardurile salvate.
            </p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowResetConfirm(false)} className="btn-secondary flex-1 text-xs py-2">
                Anulează
              </button>
              <button onClick={handleResetData} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 flex-1 transition-colors">
                Da, resetează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InteractiveSettingRow({
  icon: IconComponent,
  label,
  description,
  active,
  onToggle,
  readOnly,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  active: boolean;
  onToggle?: () => void;
  readOnly?: boolean;
}) {
  return (
    <div
      onClick={readOnly ? undefined : onToggle}
      className={`flex items-center gap-2.5 rounded-xl p-2.5 border border-slate-100 bg-slate-50/60 transition-colors ${
        readOnly ? '' : 'cursor-pointer hover:bg-slate-100/70'
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 border border-slate-200 shadow-2xs">
        <IconComponent size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-900">{label}</p>
        <p className="text-[11px] text-slate-400 truncate">{description}</p>
      </div>
      {readOnly ? (
        <span className="text-[11px] font-semibold text-slate-400">Activ</span>
      ) : (
        <div
          className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors duration-200 ${
            active ? 'bg-slate-900' : 'bg-slate-300'
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full bg-white shadow-2xs transition-transform duration-200 ${
              active ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </div>
      )}
    </div>
  );
}
