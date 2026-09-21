import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Sparkles,
  Brain,
  Layers,
  Search,
  Trash2,
  X,
  Volume2,
  VolumeX,
  BookOpen,
  Lightbulb,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '@/store';
import { PageHeader, EmptyState } from '@/components/ui';
import { getSubjectName, GRADE_LABELS } from '@/constants';
import type { PageId, Lesson } from '@/types';

export function Lessons({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile, lessons, deleteLesson } = useStore();
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!profile) return null;

  // Filter lessons
  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lesson.short_summary && lesson.short_summary.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = subjectFilter === 'all' || lesson.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  // Unique subjects present in lessons
  const presentSubjects = Array.from(new Set(lessons.map((l) => l.subject).filter(Boolean))) as string[];

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Sigur dorești să ștergi această lecție?')) {
      setDeletingId(id);
      await deleteLesson(id);
      if (selectedLesson?.id === id) {
        setSelectedLesson(null);
      }
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="Lecțiile mele" subtitle="Toate lecțiile pe care le-ai analizat și salvat cu Brainy." />

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          id="btn-analyze-lesson-quick"
          onClick={() => onNavigate('photo')}
          className="card flex items-center gap-2.5 p-3 text-left hover:border-slate-300 transition-colors"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">Analizează lecție</p>
            <p className="text-[10px] text-slate-400 truncate">Poză sau text</p>
          </div>
        </button>

        <button
          id="btn-ask-ai-quick"
          onClick={() => onNavigate('chat')}
          className="card flex items-center gap-2.5 p-3 text-left hover:border-slate-300 transition-colors"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">Întreabă AI</p>
            <p className="text-[10px] text-slate-400 truncate">Tutor personal</p>
          </div>
        </button>
      </div>

      {lessons.length > 0 && (
        <div className="space-y-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-lessons-input"
              type="text"
              placeholder="Caută în lecțiile tale..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          {/* Subject Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              onClick={() => setSubjectFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border ${
                subjectFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Toate ({lessons.length})
            </button>
            {presentSubjects.map((sub) => {
              const count = lessons.filter((l) => l.subject === sub).length;
              return (
                <button
                  key={sub}
                  onClick={() => setSubjectFilter(sub)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border whitespace-nowrap ${
                    subjectFilter === sub
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {getSubjectName(sub)} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lesson List */}
      {lessons.length === 0 ? (
        <EmptyState
          title="Nicio lecție încă"
          description="Fotografiază o pagină din manual, caiet sau introdu un subiect, iar Brainy o va structura pentru tine."
          action={
            <button id="btn-empty-start-lesson" onClick={() => onNavigate('photo')} className="btn-primary">
              <FileText size={20} />
              Analizează prima lecție
            </button>
          }
        />
      ) : filteredLessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
          <p className="text-sm font-medium">Nicio lecție găsită pentru criteriul selectat.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSubjectFilter('all');
            }}
            className="btn-ghost mt-2 text-xs text-brand-600"
          >
            Resetează filtrele
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{filteredLessons.length} {filteredLessons.length === 1 ? 'lecție afișată' : 'lecții afișate'}</span>
            <span>Apasă pe o lecție pentru a o citi</span>
          </div>

          {filteredLessons.map((lesson, i) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              onOpen={() => setSelectedLesson(lesson)}
              onNavigate={onNavigate}
              onDelete={(e) => handleDelete(lesson.id, e)}
              isDeleting={deletingId === lesson.id}
              delay={i * 40}
            />
          ))}
        </div>
      )}

      {/* Detailed Lesson Modal */}
      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onNavigate={onNavigate}
          onDelete={() => handleDelete(selectedLesson.id)}
        />
      )}
    </div>
  );
}

function LessonCard({
  lesson,
  onOpen,
  onNavigate,
  onDelete,
  isDeleting,
  delay,
}: {
  lesson: Lesson;
  onOpen: () => void;
  onNavigate: (p: PageId) => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
  delay: number;
}) {
  const subjectInfo = lesson.subject ? getSubjectName(lesson.subject) : null;
  const date = new Date(lesson.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });

  return (
    <div
      id={`lesson-card-${lesson.id}`}
      onClick={onOpen}
      className="card cursor-pointer animate-slide-up overflow-hidden p-0 transition-all hover:border-slate-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <FileText size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-slate-900">{lesson.title}</h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                {subjectInfo && (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                    {subjectInfo}
                  </span>
                )}
                {lesson.grade && <span>• {GRADE_LABELS[lesson.grade]}</span>}
                <span className="inline-flex items-center gap-1">
                  • {date}
                </span>
              </div>
            </div>
          </div>

          <button
            title="Șterge lecția"
            disabled={isDeleting}
            onClick={onDelete}
            className="p-1 text-slate-300 transition-colors hover:text-rose-500 rounded-md hover:bg-rose-50"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {lesson.short_summary && (
          <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2">
            {lesson.short_summary}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onNavigate('quiz')}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Brain size={13} />
            Quiz
          </button>
          <button
            onClick={() => onNavigate('flashcards')}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Layers size={13} />
            Flashcards
          </button>
          <button
            onClick={() => onNavigate('chat')}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Sparkles size={13} />
            Întreabă
          </button>
        </div>
      </div>
    </div>
  );
}

function LessonDetailModal({
  lesson,
  onClose,
  onNavigate,
  onDelete,
}: {
  lesson: Lesson;
  onClose: () => void;
  onNavigate: (p: PageId) => void;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'simple' | 'detailed' | 'ideas' | 'terms' | 'example'>('simple');
  const [speaking, setSpeaking] = useState(false);

  const handleClose = useCallback(() => {
    if (speaking && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    onClose();
  }, [speaking, onClose]);

  // Keyboard navigation for computer arrow keys to switch lesson tabs
  useEffect(() => {
    const availableTabs: Array<'simple' | 'detailed' | 'ideas' | 'terms' | 'example'> = ['simple', 'detailed'];
    if (lesson.key_ideas && lesson.key_ideas.length > 0) availableTabs.push('ideas');
    if (lesson.important_terms && lesson.important_terms.length > 0) availableTabs.push('terms');
    if (lesson.example) availableTabs.push('example');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveTab((curr) => {
          const idx = availableTabs.indexOf(curr);
          return availableTabs[(idx + 1) % availableTabs.length];
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveTab((curr) => {
          const idx = availableTabs.indexOf(curr);
          return availableTabs[(idx - 1 + availableTabs.length) % availableTabs.length];
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lesson, handleClose]);

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Sinteza vocală nu este suportată de acest browser.');
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const textToRead =
      activeTab === 'simple'
        ? lesson.simple_explanation || lesson.short_summary || lesson.title
        : activeTab === 'detailed'
        ? lesson.detailed_explanation || lesson.simple_explanation || lesson.title
        : lesson.short_summary || lesson.title;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'ro-RO';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl animate-slide-up overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white p-4">
          <div className="min-w-0 flex-1 pr-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {lesson.subject ? getSubjectName(lesson.subject) : 'Lecție'}
            </span>
            <h2 className="mt-0.5 truncate text-base font-bold text-slate-900">{lesson.title}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSpeech}
              title={speaking ? 'Oprește vocea' : 'Ascultă lecția'}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                speaking
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-4 overflow-x-auto scrollbar-none gap-1 py-1.5">
          <TabButton
            active={activeTab === 'simple'}
            onClick={() => setActiveTab('simple')}
            icon={BookOpen}
            label="Pe scurt"
          />
          <TabButton
            active={activeTab === 'detailed'}
            onClick={() => setActiveTab('detailed')}
            icon={FileText}
            label="Detaliat"
          />
          {lesson.key_ideas && lesson.key_ideas.length > 0 && (
            <TabButton
              active={activeTab === 'ideas'}
              onClick={() => setActiveTab('ideas')}
              icon={Lightbulb}
              label={`Idei cheie (${lesson.key_ideas.length})`}
            />
          )}
          {lesson.important_terms && lesson.important_terms.length > 0 && (
            <TabButton
              active={activeTab === 'terms'}
              onClick={() => setActiveTab('terms')}
              icon={Tag}
              label={`Termeni (${lesson.important_terms.length})`}
            />
          )}
          {lesson.example && (
            <TabButton
              active={activeTab === 'example'}
              onClick={() => setActiveTab('example')}
              icon={CheckCircle2}
              label="Exemplu"
            />
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 text-slate-700 leading-relaxed text-xs">
          {activeTab === 'simple' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Rezumat rapid</h4>
                <p className="font-medium text-slate-900 leading-relaxed">{lesson.short_summary || 'Fără rezumat scurt.'}</p>
              </div>

              {lesson.simple_explanation && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1.5">Explicație pe înțelesul tău</h4>
                  <p className="whitespace-pre-line text-slate-600 leading-relaxed">{lesson.simple_explanation}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'detailed' && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900">Explicație completă</h4>
              <p className="whitespace-pre-line text-slate-600 leading-relaxed">
                {lesson.detailed_explanation || lesson.simple_explanation || 'Nu este disponibilă o explicație detaliată.'}
              </p>
            </div>
          )}

          {activeTab === 'ideas' && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 mb-2">Idei cheie:</h4>
              {lesson.key_ideas?.map((idea, idx) => (
                <div key={idx} className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                    {idx + 1}
                  </div>
                  <p className="text-slate-800 font-medium text-xs leading-relaxed">{idea.text}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 mb-1.5">Dicționar de termeni</h4>
              {lesson.important_terms?.map((t, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-2.5 bg-white">
                  <span className="font-bold text-slate-900 text-xs">{t.term}</span>
                  <p className="mt-0.5 text-[11px] text-slate-600">{t.definition}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'example' && (
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Exemplu practic</h4>
              <p className="whitespace-pre-line text-slate-800 font-medium leading-relaxed">{lesson.example}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 p-3">
          <button
            onClick={onDelete}
            className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50"
          >
            <Trash2 size={14} />
            Șterge
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                handleClose();
                onNavigate('quiz');
              }}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              <Brain size={13} />
              Quiz
            </button>
            <button
              onClick={() => {
                handleClose();
                onNavigate('flashcards');
              }}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <Layers size={13} />
              Flashcards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: IconComponent,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
        active ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      <IconComponent size={13} />
      {label}
    </button>
  );
}
