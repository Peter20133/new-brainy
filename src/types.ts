export type SubjectSlug =
  | 'matematica'
  | 'limba-romana'
  | 'engleza'
  | 'istorie'
  | 'geografie'
  | 'biologie'
  | 'fizica'
  | 'chimie'
  | 'informatica'
  | 'alte-materii';

export interface SubjectInfo {
  slug: SubjectSlug;
  name: string;
  icon: string;
  color: string;
}

export interface UserProfile {
  id: string;
  name: string;
  grade: number;
  selected_subjects: SubjectSlug[];
  xp: number;
  level: number;
  streak: number;
  last_activity_date: string | null;
  lessons_completed: number;
  quizzes_completed: number;
  badges: string[];
  is_parent_mode: boolean;
  parent_pin: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KeyIdea {
  text: string;
}

export interface ImportantTerm {
  term: string;
  definition: string;
}

export interface Lesson {
  id: string;
  profile_id: string;
  title: string;
  subject: string | null;
  grade: number | null;
  short_summary: string | null;
  simple_explanation: string | null;
  detailed_explanation: string | null;
  key_ideas: KeyIdea[];
  important_terms: ImportantTerm[];
  example: string | null;
  raw_content: string | null;
  source_file_id: string | null;
  status: string;
  created_at: string;
}

export interface QuizQuestion {
  id: number;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

export interface QuizResult {
  id: string;
  profile_id: string;
  lesson_id: string | null;
  subject: string | null;
  title: string;
  questions: QuizQuestion[];
  answers: Record<number, string>[];
  score: number;
  total: number;
  weak_topics: string[];
  created_at: string;
}

export interface Flashcard {
  id: string;
  profile_id: string;
  lesson_id: string | null;
  subject: string | null;
  front: string;
  back: string;
  status: 'new' | 'known' | 'repeat';
  review_count: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  profile_id: string;
  role: 'user' | 'assistant';
  content: string;
  imageData?: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  profile_id: string;
  subject: string;
  activity_type: string;
  duration_minutes: number;
  created_at: string;
}

export interface ProgressRecord {
  id: string;
  profile_id: string;
  subject: string;
  lessons_completed: number;
  quizzes_completed: number;
  xp_earned: number;
  correct_answers: number;
  total_answers: number;
  time_spent_minutes: number;
}

export interface Badge {
  id: string;
  profile_id: string;
  badge_id: string;
  earned_at: string;
}

export interface LearningPlan {
  id: string;
  profile_id: string;
  subject: string;
  lessons: string[];
  available_minutes: number;
  plan: StudyPlanBlock[];
  created_at: string;
}

export interface StudyPlanBlock {
  time: string;
  activity: string;
  detail: string;
  duration: number;
}

export interface UploadedFile {
  id: string;
  profile_id: string | null;
  file_name: string;
  file_type: string;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  data_url: string | null;
  source: string;
  created_at: string;
}

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
  xpReward: number;
}

export type PageId =
  | 'dashboard'
  | 'lessons'
  | 'photo'
  | 'homework'
  | 'solve-homework'
  | 'chat'
  | 'quiz'
  | 'flashcards'
  | 'progress'
  | 'profile'
  | 'parent'
  | 'study-plan'
  | 'lost';

export interface LessonAnalysis {
  title: string;
  subject: string;
  short_summary: string;
  simple_explanation: string;
  detailed_explanation: string;
  key_ideas: KeyIdea[];
  important_terms: ImportantTerm[];
  example: string;
}

export interface HomeworkSolution {
  goal: string;
  steps: { title: string; detail: string }[];
  method?: string;
  answer: string;
  subject: string;
}

export interface PrerequisitePath {
  topic: string;
  prerequisites: { title: string; description: string; mastered: boolean }[];
  miniPath: { title: string; description: string }[];
}
