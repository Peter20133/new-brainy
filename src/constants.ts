import type { SubjectInfo, BadgeInfo } from '@/types';

export const SUBJECTS: SubjectInfo[] = [
  { slug: 'matematica', name: 'Matematică', icon: 'Calculator', color: 'ocean' },
  { slug: 'limba-romana', name: 'Limba română', icon: 'BookOpen', color: 'brand' },
  { slug: 'engleza', name: 'Engleză', icon: 'Languages', color: 'ocean' },
  { slug: 'istorie', name: 'Istorie', icon: 'Landmark', color: 'warning' },
  { slug: 'geografie', name: 'Geografie', icon: 'Globe', color: 'success' },
  { slug: 'biologie', name: 'Biologie', icon: 'Leaf', color: 'success' },
  { slug: 'fizica', name: 'Fizică', icon: 'Atom', color: 'ocean' },
  { slug: 'chimie', name: 'Chimie', icon: 'FlaskConical', color: 'brand' },
  { slug: 'informatica', name: 'Informatică', icon: 'Code', color: 'ocean' },
  { slug: 'alte-materii', name: 'Alte materii', icon: 'Sparkles', color: 'brand' },
];

export const GRADES = [5, 6, 7, 8, 9, 10, 11, 12];

export const GRADE_LABELS: Record<number, string> = {
  5: 'Clasa a V-a',
  6: 'Clasa a VI-a',
  7: 'Clasa a VII-a',
  8: 'Clasa a VIII-a',
  9: 'Clasa a IX-a',
  10: 'Clasa a X-a',
  11: 'Clasa a XI-a',
  12: 'Clasa a XII-a',
};

export const GRADE_SHORT: Record<number, string> = {
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
  11: 'XI',
  12: 'XII',
};

export function getSubjectInfo(slug: string): SubjectInfo | undefined {
  return SUBJECTS.find((s) => s.slug === slug);
}

export function getSubjectName(slug: string): string {
  return getSubjectInfo(slug)?.name ?? slug;
}

export function getSubjectColor(slug: string): string {
  return getSubjectInfo(slug)?.color ?? 'brand';
}

export const BADGES: BadgeInfo[] = [
  { id: 'first_lesson', name: 'Prima lecție', description: 'Ai finalizat prima ta lecție', icon: 'BookOpen', requirement: 'Finalizează 1 lecție', xpReward: 50 },
  { id: 'streak_7', name: '7 zile la rând', description: 'Ai învățat 7 zile consecutiv', icon: 'Flame', requirement: 'Menține un streak de 7 zile', xpReward: 100 },
  { id: 'math_master', name: 'Maestru la matematică', description: 'Ai completat 10 lecții de matematică', icon: 'Calculator', requirement: '10 lecții de matematică', xpReward: 200 },
  { id: 'quiz_10', name: '10 quiz-uri completate', description: 'Ai completat 10 quiz-uri', icon: 'Brain', requirement: 'Finalizează 10 quiz-uri', xpReward: 150 },
  { id: 'xp_1000', name: '1000 XP', description: 'Ai atins 1000 de puncte XP', icon: 'Star', requirement: 'Strânge 1000 XP', xpReward: 100 },
  { id: 'first_quiz', name: 'Primul quiz', description: 'Ai completat primul quiz', icon: 'CheckCircle', requirement: 'Finalizează 1 quiz', xpReward: 50 },
  { id: 'flashcard_50', name: '50 flashcards', description: 'Ai repetat 50 de flashcards', icon: 'Layers', requirement: 'Repetă 50 de flashcards', xpReward: 100 },
  { id: 'night_owl', name: 'Pasăre de noapte', description: 'Ai învățat după ora 22:00', icon: 'Moon', requirement: 'Învață noaptea târziu', xpReward: 75 },
];

export function getBadgeInfo(id: string): BadgeInfo | undefined {
  return BADGES.find((b) => b.id === id);
}

export function xpToLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function xpForNextLevel(xp: number): number {
  const currentLevel = xpToLevel(xp);
  return currentLevel * 100;
}

export function levelProgress(xp: number): { current: number; needed: number; percent: number } {
  const level = xpToLevel(xp);
  const baseXp = (level - 1) * 100;
  const current = xp - baseXp;
  const needed = 100;
  return { current, needed, percent: Math.min(100, (current / needed) * 100) };
}

export const QUICK_PROMPTS = [
  { label: 'Explică-mi lecția', icon: 'BookOpen' },
  { label: 'Fă-mi un rezumat', icon: 'FileText' },
  { label: 'Dă-mi un exemplu', icon: 'Lightbulb' },
  { label: 'Testează-mă', icon: 'Brain' },
  { label: 'Nu înțeleg', icon: 'HelpCircle' },
];

export const PARENT_PIN_DEFAULT = '0000';
