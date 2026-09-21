import { useState, useEffect } from 'react';
import { StoreProvider, useStore } from '@/store';
import { Onboarding } from '@/components/Onboarding';
import { BottomNav } from '@/components/BottomNav';
import { Dashboard } from '@/pages/Dashboard';
import { Lessons } from '@/pages/Lessons';
import { PhotoLearn } from '@/pages/PhotoLearn';
import { Homework } from '@/pages/Homework';
import { SolveHomework } from '@/pages/SolveHomework';
import { ChatPage } from '@/pages/Chat';
import { Quiz } from '@/pages/Quiz';
import { Flashcards } from '@/pages/Flashcards';
import { Progress } from '@/pages/Progress';
import { Profile } from '@/pages/Profile';
import { ParentMode } from '@/pages/ParentMode';
import { StudyPlan } from '@/pages/StudyPlan';
import { LostPage } from '@/pages/LostPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui';
import type { PageId } from '@/types';

function AppContent() {
  const { profile, loading, onboardingComplete, createProfile } = useStore();
  const [page, setPage] = useState<PageId>('dashboard');

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  // Global arrow navigation between main tabs when not inside inputs or specialized screens
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      // Allow Quiz, Flashcards, and Homework to handle their own arrow interactions
      if (page === 'quiz' || page === 'flashcards' || page === 'homework' || page === 'chat') {
        return;
      }

      // If a modal/dialog is currently active, avoid switching tabs
      if (document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0.z-50')) {
        return;
      }

      const TABS: PageId[] = ['dashboard', 'lessons', 'photo', 'progress', 'profile'];
      const currentIdx = TABS.indexOf(page);
      if (currentIdx === -1) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = (currentIdx + 1) % TABS.length;
        setPage(TABS[nextIdx]);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = (currentIdx - 1 + TABS.length) % TABS.length;
        setPage(TABS[prevIdx]);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [page]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
            <LoadingSpinner size={24} className="text-white" />
          </div>
          <p className="text-sm font-medium text-slate-500">Se încarcă Brainy AI...</p>
        </div>
      </div>
    );
  }

  if (!onboardingComplete || !profile) {
    return <Onboarding onComplete={createProfile} />;
  }

  const navigate = (p: PageId) => setPage(p);

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'lessons':
        return <Lessons onNavigate={navigate} />;
      case 'photo':
        return <PhotoLearn onNavigate={navigate} />;
      case 'homework':
        return <Homework onNavigate={navigate} />;
      case 'solve-homework':
        return <SolveHomework onNavigate={navigate} />;
      case 'chat':
        return <ChatPage />;
      case 'quiz':
        return <Quiz onNavigate={navigate} />;
      case 'flashcards':
        return <Flashcards onNavigate={navigate} />;
      case 'progress':
        return <Progress onNavigate={navigate} />;
      case 'profile':
        return <Profile onNavigate={navigate} />;
      case 'parent':
        return <ParentMode onNavigate={navigate} />;
      case 'study-plan':
        return <StudyPlan />;
      case 'lost':
        return <LostPage onNavigate={navigate} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  // Chat page needs full height without padding
  const isChat = page === 'chat';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Desktop header */}
      <div className="hidden border-b border-slate-200/80 bg-white/95 backdrop-blur-sm lg:block">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-xs">
              B
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900">Brainy AI</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 shadow-2xs">← / →</kbd>
              <span>Navigare</span>
            </div>
            <span className="text-slate-200">•</span>
            <span className="text-xs font-medium text-slate-400">Tutor școlar inteligent</span>
          </div>
        </div>
      </div>

      <main className={`mx-auto max-w-2xl px-4 pt-4 lg:pt-6 ${isChat ? '' : 'pb-24'}`}>
        <ErrorBoundary onReset={() => setPage('dashboard')}>
          {renderPage()}
        </ErrorBoundary>
      </main>

      <BottomNav current={page} onNavigate={navigate} />
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}

export default App;
