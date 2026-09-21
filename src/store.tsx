import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserProfile, SubjectSlug, Lesson, QuizResult, Flashcard, ChatMessage, ProgressRecord, Badge, StudySession } from '@/types';
import { xpToLevel, BADGES } from '@/constants';

const STORAGE_KEY = 'brainy_profile_id';
const ONBOARDED_KEY = 'brainy_onboarded';

interface StoreContextValue {
  profile: UserProfile | null;
  loading: boolean;
  onboarded: boolean;
  onboardingComplete: boolean;
  setOnboarded: (v: boolean) => void;
  createProfile: (data: { name: string; grade: number; subjects: SubjectSlug[] }) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  updateStreak: () => Promise<void>;
  lessons: Lesson[];
  refreshLessons: () => Promise<void>;
  addLesson: (lesson: Partial<Lesson>) => Promise<Lesson | null>;
  quizResults: QuizResult[];
  refreshQuizResults: () => Promise<void>;
  addQuizResult: (data: Partial<QuizResult>) => Promise<void>;
  flashcards: Flashcard[];
  refreshFlashcards: () => Promise<void>;
  addFlashcards: (cards: Partial<Flashcard>[]) => Promise<void>;
  updateFlashcard: (id: string, data: Partial<Flashcard>) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  clearFlashcards: () => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  resetAllData: () => Promise<void>;
  chatMessages: ChatMessage[];
  refreshChatMessages: () => Promise<void>;
  addChatMessage: (role: 'user' | 'assistant', content: string, imageData?: string) => Promise<void>;
  clearChat: () => Promise<void>;
  progress: ProgressRecord[];
  refreshProgress: () => Promise<void>;
  upsertProgress: (subject: string, data: Partial<ProgressRecord>) => Promise<void>;
  badges: Badge[];
  refreshBadges: () => Promise<void>;
  checkAndAwardBadges: () => Promise<string[]>;
  studySessions: StudySession[];
  addStudySession: (subject: string, type: string, minutes: number) => Promise<void>;
  refreshStudySessions: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboardedState] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);

  // Initial load
  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      const wasOnboarded = localStorage.getItem(ONBOARDED_KEY) === 'true';
      setOnboardedState(wasOnboarded);

      if (stored) {
        const { data } = await supabase.from('profiles').select('*').eq('id', stored).maybeSingle();
        if (data) {
          setProfile(data as UserProfile);
        }
      }
      setLoading(false);
    })();
  }, []);

  const setOnboarded = useCallback((v: boolean) => {
    localStorage.setItem(ONBOARDED_KEY, v ? 'true' : 'false');
    setOnboardedState(v);
  }, []);

  const createProfile = useCallback(async (data: { name: string; grade: number; subjects: SubjectSlug[] }) => {
    const { data: inserted, error } = await supabase
      .from('profiles')
      .insert({
        name: data.name,
        grade: data.grade,
        selected_subjects: data.subjects,
        xp: 0,
        level: 1,
        streak: 0,
        lessons_completed: 0,
        quizzes_completed: 0,
        badges: [],
        is_parent_mode: false,
        settings: {},
      })
      .select()
      .single();

    if (error) throw error;
    const newProfile = inserted as UserProfile;
    localStorage.setItem(STORAGE_KEY, newProfile.id);
    setProfile(newProfile);
    setOnboarded(true);
  }, [setOnboarded]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!profile) return;
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(updated as UserProfile);
  }, [profile]);

  const addXp = useCallback(async (amount: number) => {
    if (!profile) return;
    const newXp = profile.xp + amount;
    const newLevel = xpToLevel(newXp);
    await updateProfile({ xp: newXp, level: newLevel });
  }, [profile, updateProfile]);

  const updateStreak = useCallback(async () => {
    if (!profile) return;
    const today = new Date().toISOString().split('T')[0];
    if (profile.last_activity_date === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = profile.last_activity_date === yesterday ? profile.streak + 1 : 1;
    await updateProfile({ streak: newStreak, last_activity_date: today });
  }, [profile, updateProfile]);

  // Lessons
  const refreshLessons = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) setLessons(data as Lesson[]);
  }, [profile]);

  const addLesson = useCallback(async (lesson: Partial<Lesson>): Promise<Lesson | null> => {
    if (!profile) return null;
    const { data, error } = await supabase
      .from('lessons')
      .insert({ ...lesson, profile_id: profile.id })
      .select()
      .single();
    if (error) {
      console.error('Error adding lesson:', error);
      return null;
    }
    const newLesson = data as Lesson;
    setLessons((prev) => [newLesson, ...prev]);
    await updateProfile({ lessons_completed: profile.lessons_completed + 1 });
    await addXp(30);
    return newLesson;
  }, [profile, updateProfile, addXp]);

  const deleteLesson = useCallback(async (id: string) => {
    if (!profile) return;
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) console.error('Error deleting lesson:', error);
    setLessons((prev) => prev.filter((l) => l.id !== id));
  }, [profile]);

  // Quiz results
  const refreshQuizResults = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) setQuizResults(data as QuizResult[]);
  }, [profile]);

  const addQuizResult = useCallback(async (data: Partial<QuizResult>) => {
    if (!profile) return;
    const { error } = await supabase
      .from('quiz_results')
      .insert({ ...data, profile_id: profile.id });
    if (error) {
      console.error('Error adding quiz result:', error);
      return;
    }
    const newQuizzes = profile.quizzes_completed + 1;
    await updateProfile({ quizzes_completed: newQuizzes });
    await addXp(20);
    await refreshQuizResults();
  }, [profile, updateProfile, addXp, refreshQuizResults]);

  // Flashcards
  const refreshFlashcards = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('flashcards')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) setFlashcards(data as Flashcard[]);
  }, [profile]);

  const addFlashcards = useCallback(async (cards: Partial<Flashcard>[]) => {
    if (!profile) return;
    const rows = cards.map((c) => ({ ...c, profile_id: profile.id }));
    const { error } = await supabase.from('flashcards').insert(rows);
    if (error) console.error('Error adding flashcards:', error);
    await refreshFlashcards();
  }, [profile, refreshFlashcards]);

  const updateFlashcard = useCallback(async (id: string, data: Partial<Flashcard>) => {
    const { error } = await supabase.from('flashcards').update(data).eq('id', id);
    if (error) console.error('Error updating flashcard:', error);
    await refreshFlashcards();
  }, [refreshFlashcards]);

  const deleteFlashcard = useCallback(async (id: string) => {
    const { error } = await supabase.from('flashcards').delete().eq('id', id);
    if (error) console.error('Error deleting flashcard:', error);
    setFlashcards((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearFlashcards = useCallback(async () => {
    if (!profile) return;
    const { error } = await supabase.from('flashcards').delete().eq('profile_id', profile.id);
    if (error) console.error('Error clearing flashcards:', error);
    setFlashcards([]);
  }, [profile]);

  // Chat
  const refreshChatMessages = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: true });
    if (data) setChatMessages(data as ChatMessage[]);
  }, [profile]);

  const addChatMessage = useCallback(async (role: 'user' | 'assistant', content: string, imageData?: string) => {
    if (!profile) return;
    const msgObj: Partial<ChatMessage> & { profile_id: string; role: 'user' | 'assistant'; content: string } = {
      profile_id: profile.id,
      role,
      content,
      ...(imageData ? { imageData } : {}),
    };
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(msgObj)
      .select()
      .single();
    if (error) {
      console.error('Error adding chat message:', error);
      const localMsg: ChatMessage = {
        id: 'msg-' + Date.now(),
        profile_id: profile.id,
        role,
        content,
        imageData,
        created_at: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, localMsg]);
      return;
    }
    setChatMessages((prev) => [...prev, { ...(data as ChatMessage), imageData }]);
  }, [profile]);

  const clearChat = useCallback(async () => {
    if (!profile) return;
    await supabase.from('chat_messages').delete().eq('profile_id', profile.id);
    setChatMessages([]);
  }, [profile]);

  // Progress
  const refreshProgress = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('progress')
      .select('*')
      .eq('profile_id', profile.id);
    if (data) setProgress(data as ProgressRecord[]);
  }, [profile]);

  const upsertProgress = useCallback(async (subject: string, data: Partial<ProgressRecord>) => {
    if (!profile) return;
    const existing = progress.find((p) => p.subject === subject);
    if (existing) {
      const merged = {
        lessons_completed: (existing.lessons_completed || 0) + (data.lessons_completed || 0),
        quizzes_completed: (existing.quizzes_completed || 0) + (data.quizzes_completed || 0),
        xp_earned: (existing.xp_earned || 0) + (data.xp_earned || 0),
        correct_answers: (existing.correct_answers || 0) + (data.correct_answers || 0),
        total_answers: (existing.total_answers || 0) + (data.total_answers || 0),
        time_spent_minutes: (existing.time_spent_minutes || 0) + (data.time_spent_minutes || 0),
      };
      await supabase.from('progress').update(merged).eq('id', existing.id);
    } else {
      await supabase.from('progress').insert({
        profile_id: profile.id,
        subject,
        lessons_completed: data.lessons_completed || 0,
        quizzes_completed: data.quizzes_completed || 0,
        xp_earned: data.xp_earned || 0,
        correct_answers: data.correct_answers || 0,
        total_answers: data.total_answers || 0,
        time_spent_minutes: data.time_spent_minutes || 0,
      });
    }
    await refreshProgress();
  }, [profile, progress, refreshProgress]);

  // Badges
  const refreshBadges = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('badges')
      .select('*')
      .eq('profile_id', profile.id);
    if (data) setBadges(data as Badge[]);
  }, [profile]);

  const checkAndAwardBadges = useCallback(async (): Promise<string[]> => {
    if (!profile) return [];
    const earned: string[] = [];
    const have = new Set(badges.map((b) => b.badge_id));

    const check = (id: string, condition: boolean) => {
      if (condition && !have.has(id)) earned.push(id);
    };

    check('first_lesson', profile.lessons_completed >= 1);
    check('first_quiz', profile.quizzes_completed >= 1);
    check('quiz_10', profile.quizzes_completed >= 10);
    check('xp_1000', profile.xp >= 1000);
    check('streak_7', profile.streak >= 7);
    check('math_master', lessons.filter((l) => l.subject === 'matematica').length >= 10);
    check('flashcard_50', flashcards.filter((f) => f.review_count > 0).length >= 50);
    check('night_owl', new Date().getHours() >= 22);

    if (earned.length > 0) {
      const rows = earned.map((badge_id) => ({ profile_id: profile.id, badge_id }));
      await supabase.from('badges').insert(rows);
      const badgeXp = earned.reduce((sum, id) => {
        const b = BADGES.find((b) => b.id === id);
        return sum + (b?.xpReward || 0);
      }, 0);
      await addXp(badgeXp);
      await refreshBadges();
    }
    return earned;
  }, [profile, badges, lessons, flashcards, addXp, refreshBadges]);

  // Study sessions
  const refreshStudySessions = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });
    if (data) setStudySessions(data as StudySession[]);
  }, [profile]);

  const addStudySession = useCallback(async (subject: string, type: string, minutes: number) => {
    if (!profile) return;
    await supabase.from('study_sessions').insert({
      profile_id: profile.id,
      subject,
      activity_type: type,
      duration_minutes: minutes,
    });
    await upsertProgress(subject, { time_spent_minutes: minutes });
    await refreshStudySessions();
  }, [profile, upsertProgress, refreshStudySessions]);

  const resetAllData = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ONBOARDED_KEY);
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('brainy_')) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      // ignore
    }
    setProfile(null);
    setOnboardedState(false);
    setLessons([]);
    setQuizResults([]);
    setFlashcards([]);
    setChatMessages([]);
    setProgress([]);
    setBadges([]);
    setStudySessions([]);
  }, []);

  // Load dependent data when profile is set
  useEffect(() => {
    if (profile) {
      refreshLessons();
      refreshQuizResults();
      refreshFlashcards();
      refreshChatMessages();
      refreshProgress();
      refreshBadges();
      refreshStudySessions();
      updateStreak();
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onboardingComplete = onboarded && profile !== null;

  const value: StoreContextValue = {
    profile,
    loading,
    onboarded,
    onboardingComplete,
    setOnboarded,
    createProfile,
    updateProfile,
    addXp,
    updateStreak,
    lessons,
    refreshLessons,
    addLesson,
    deleteLesson,
    quizResults,
    refreshQuizResults,
    addQuizResult,
    flashcards,
    refreshFlashcards,
    addFlashcards,
    updateFlashcard,
    deleteFlashcard,
    clearFlashcards,
    resetAllData,
    chatMessages,
    refreshChatMessages,
    addChatMessage,
    clearChat,
    progress,
    refreshProgress,
    upsertProgress,
    badges,
    refreshBadges,
    checkAndAwardBadges,
    studySessions,
    addStudySession,
    refreshStudySessions,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
