import { useState } from 'react';
import { Brain, CheckCircle2, Target, Sparkles, BookOpen, HelpCircle, Check, RotateCcw } from 'lucide-react';
import { useStore } from '@/store';
import { aiService } from '@/lib/ai';
import { PageHeader, LoadingSpinner, ErrorState } from '@/components/ui';
import type { PrerequisitePath, PageId } from '@/types';

const SUGGESTED_TOPICS = [
  'Teorema lui Pitagora',
  'Fracții zecimale și procente',
  'Fotosinteza și respirația plantelor',
  'Substantivul și cazurile gramaticale',
  'Primul Război Mondial',
  'Legile mișcării ale lui Newton',
];

export function LostPage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { profile, addXp, addChatMessage } = useStore();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrerequisitePath | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [masteredState, setMasteredState] = useState<Record<number, boolean>>({});

  const handleAnalyze = async (customTopic?: string) => {
    const selected = customTopic || topic;
    if (!profile || !selected.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.identifyPrerequisites(profile, selected.trim());
      setResult(res);
      const initialMastered: Record<number, boolean> = {};
      res.prerequisites.forEach((p, idx) => {
        initialMastered[idx] = Boolean(p.mastered);
      });
      setMasteredState(initialMastered);
      await addXp(10);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut analiza. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMastered = (index: number) => {
    setMasteredState((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleAskAboutPrerequisite = async (stepTitle: string) => {
    await addChatMessage('user', `Sunt la secțiunea "Sunt pierdut" și vreau să-mi explici pe scurt: "${stepTitle}".`);
    onNavigate('chat');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Sunt pierdut..." subtitle="Nu știi de unde să începi? Brainy te ghidează." />
        <div className="flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-brand-50 to-ocean-50 px-6 py-20 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-pulse-glow rounded-3xl bg-brand-400/30 blur-xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-600 to-ocean-600 shadow-glow">
              <Brain size={48} className="text-white animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800">Analizez ce știi și ce-ți lipsește...</h3>
          <p className="mt-2 text-sm text-slate-500">Descompun subiectul în concepte simple de bază...</p>
          <LoadingSpinner size={32} className="mt-4 text-brand-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <PageHeader title="Sunt pierdut..." subtitle="Identifică noțiunile lipsă și înțelege subiectul de la rădăcină." />

      {error && <ErrorState message={error} onRetry={() => handleAnalyze()} />}

      {!result && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-800">Ce subiect ți se pare greu de înțeles?</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Ecuații de gradul II, Fotosinteză, Verbe..."
              className="input-field mt-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAnalyze();
              }}
            />
          </div>

          <button
            onClick={() => handleAnalyze()}
            disabled={!topic.trim()}
            className="btn-primary w-full py-3.5"
          >
            <Brain size={20} />
            Ajută-mă să înțeleg pas cu pas
          </button>

          {/* Quick suggestions */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subiecte frecvente:</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTED_TOPICS.map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setTopic(st);
                    handleAnalyze(st);
                  }}
                  className="rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-700 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors"
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Target Topic Header */}
          <div className="card p-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-ocean-600 text-white shadow-soft">
                <Target size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Obiectivul tău de înțeles</p>
                <h2 className="text-lg font-extrabold text-slate-900 truncate">{result.topic}</h2>
              </div>
            </div>
          </div>

          {/* Prerequisites Checklist */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-900">Verifică înainte: noțiuni esențiale</h3>
            <p className="mt-0.5 mb-3 text-xs text-slate-500">
              Bifează ce stăpânești deja sau apasă pe întrebare pentru a primi lămuriri.
            </p>

            <div className="space-y-2.5">
              {result.prerequisites.map((p, i) => {
                const isMastered = Boolean(masteredState[i]);
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-2xl p-3.5 border transition-all ${
                      isMastered
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50/80 border-slate-200/80'
                    }`}
                  >
                    <button
                      onClick={() => toggleMastered(i)}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                        isMastered
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 bg-white hover:border-brand-500'
                      }`}
                      title={isMastered ? 'Știi deja acest concept' : 'Marchează ca înțeles'}
                    >
                      {isMastered && <Check size={16} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${isMastered ? 'text-emerald-900 line-through' : 'text-slate-800'}`}>
                        {p.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{p.description}</p>
                    </div>

                    <button
                      onClick={() => handleAskAboutPrerequisite(p.title)}
                      className="flex h-8 shrink-0 items-center gap-1 rounded-xl bg-white px-2.5 text-xs font-bold text-brand-600 shadow-sm hover:bg-brand-50 border border-slate-100"
                      title="Explică-mi în chat"
                    >
                      <HelpCircle size={14} />
                      Explică
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mini Learning Path */}
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-brand-500" />
              <h3 className="text-sm font-bold text-slate-800">Traseul recomandat de învățare</h3>
            </div>

            <div className="space-y-0">
              {result.miniPath.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-ocean-500 text-xs font-bold text-white shadow-soft">
                      {i + 1}
                    </div>
                    {i < result.miniPath.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-200" style={{ minHeight: '24px' }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-bold text-slate-800">{step.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}

              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-soft">
                  <CheckCircle2 size={18} />
                </div>
                <p className="pt-1 text-sm font-bold text-emerald-600">
                  Ești pregătit să stăpânești {result.topic}!
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                addChatMessage('user', `Vreau să învățăm pas cu pas despre: ${result.topic}. Începe cu prima noțiune simplă.`);
                onNavigate('chat');
              }}
              className="btn-primary text-sm"
            >
              <BookOpen size={18} />
              Învață cu AI în Chat
            </button>
            <button
              onClick={() => {
                setResult(null);
                setTopic('');
              }}
              className="btn-secondary text-sm"
            >
              <RotateCcw size={18} />
              Alt subiect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
