/*
# Brainy AI — Full Database Schema

1. Overview
Brainy AI is an AI tutor for Romanian students (grades V-XII). This migration
creates the complete schema for profiles, subjects, lessons, uploaded files,
quizzes, flashcards, study sessions, progress tracking, badges, and learning plans.

This is a SINGLE-TENANT app (no auth screen — the onboarding creates a local profile).
All policies use TO anon, authenticated so the anon-key frontend can read and write.

2. New Tables
- `profiles` — student profile (name, grade, subjects, XP, level, streak)
- `subjects` — reference list of school subjects
- `lessons` — analyzed lessons (from photo/PDF upload)
- `uploaded_files` — metadata for uploaded images/PDFs
- `quiz_results` — quiz attempts and scores
- `flashcards` — generated flashcards per lesson
- `study_sessions` — study time tracking
- `progress` — per-subject progress tracking
- `badges` — gamification badges
- `learning_plans` — generated study plans
- `chat_messages` — AI tutor conversation history

3. Security
- RLS enabled on ALL tables.
- All policies use `TO anon, authenticated` (single-tenant, no auth screen).
- Data is intentionally shared/public within this single-tenant app.

4. Notes
- `xp`, `level`, `streak`, `lessons_completed` live on `profiles` for fast reads.
- `progress` table tracks per-subject stats separately.
- All timestamps default to `now()`.
- Idempotent: uses IF NOT EXISTS and DROP POLICY IF EXISTS.
*/

-- Subjects reference table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'BookOpen',
  color text NOT NULL DEFAULT 'brand',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Student profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Elev',
  grade int NOT NULL DEFAULT 5,
  selected_subjects text[] NOT NULL DEFAULT '{}',
  xp int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  streak int NOT NULL DEFAULT 0,
  last_activity_date date,
  lessons_completed int NOT NULL DEFAULT 0,
  quizzes_completed int NOT NULL DEFAULT 0,
  badges text[] NOT NULL DEFAULT '{}',
  is_parent_mode boolean NOT NULL DEFAULT false,
  parent_pin text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Uploaded files (images, PDFs)
CREATE TABLE IF NOT EXISTS uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  mime_type text,
  file_size bigint,
  storage_path text,
  data_url text,
  source text NOT NULL DEFAULT 'photo',
  created_at timestamptz DEFAULT now()
);

-- Lessons (analyzed content from uploads)
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text,
  grade int,
  short_summary text,
  simple_explanation text,
  detailed_explanation text,
  key_ideas jsonb NOT NULL DEFAULT '[]'::jsonb,
  important_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  example text,
  raw_content text,
  source_file_id uuid REFERENCES uploaded_files(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'analyzed',
  created_at timestamptz DEFAULT now()
);

-- Quiz results
CREATE TABLE IF NOT EXISTS quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  subject text,
  title text NOT NULL DEFAULT 'Quiz',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  weak_topics text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Flashcards
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  subject text,
  front text NOT NULL,
  back text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  review_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Study sessions (time tracking)
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  activity_type text NOT NULL DEFAULT 'lesson',
  duration_minutes int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Progress per subject
CREATE TABLE IF NOT EXISTS progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  lessons_completed int NOT NULL DEFAULT 0,
  quizzes_completed int NOT NULL DEFAULT 0,
  xp_earned int NOT NULL DEFAULT 0,
  correct_answers int NOT NULL DEFAULT 0,
  total_answers int NOT NULL DEFAULT 0,
  time_spent_minutes int NOT NULL DEFAULT 0,
  UNIQUE(profile_id, subject)
);

-- Badges (earned achievements)
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, badge_id)
);

-- Learning plans
CREATE TABLE IF NOT EXISTS learning_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  lessons text[] NOT NULL DEFAULT '{}',
  available_minutes int NOT NULL DEFAULT 60,
  plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Chat messages (AI tutor)
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert default subjects
INSERT INTO subjects (slug, name, icon, color, sort_order) VALUES
  ('matematica', 'Matematică', 'Calculator', 'ocean', 1),
  ('limba-romana', 'Limba română', 'BookOpen', 'brand', 2),
  ('engleza', 'Engleză', 'Languages', 'ocean', 3),
  ('istorie', 'Istorie', 'Landmark', 'warning', 4),
  ('geografie', 'Geografie', 'Globe', 'success', 5),
  ('biologie', 'Biologie', 'Leaf', 'success', 6),
  ('fizica', 'Fizică', 'Atom', 'ocean', 7),
  ('chimie', 'Chimie', 'FlaskConical', 'brand', 8)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper: create 4 CRUD policies for a single-tenant table
-- All use TO anon, authenticated because the app has no auth screen.

-- profiles
DROP POLICY IF EXISTS "st_select_profiles" ON profiles;
CREATE POLICY "st_select_profiles" ON profiles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "st_insert_profiles" ON profiles;
CREATE POLICY "st_insert_profiles" ON profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "st_update_profiles" ON profiles;
CREATE POLICY "st_update_profiles" ON profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "st_delete_profiles" ON profiles;
CREATE POLICY "st_delete_profiles" ON profiles FOR DELETE TO anon, authenticated USING (true);

-- subjects
DROP POLICY IF EXISTS "st_select_subjects" ON subjects;
CREATE POLICY "st_select_subjects" ON subjects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "st_insert_subjects" ON subjects;
CREATE POLICY "st_insert_subjects" ON subjects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "st_update_subjects" ON subjects;
CREATE POLICY "st_update_subjects" ON subjects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "st_delete_subjects" ON subjects;
CREATE POLICY "st_delete_subjects" ON subjects FOR DELETE TO anon, authenticated USING (true);

-- uploaded_files
DROP POLICY IF EXISTS "st_select_uploaded_files" ON uploaded_files;
CREATE POLICY "st_select_uploaded_files" ON uploaded_files FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "st_insert_uploaded_files" ON uploaded_files;
CREATE POLICY "st_insert_uploaded_files" ON uploaded_files FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "st_update_uploaded_files" ON uploaded_files;
CREATE POLICY "st_update_uploaded_files" ON uploaded_files FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "st_delete_uploaded_files" ON uploaded_files;
CREATE POLICY "st_delete_uploaded_files" ON uploaded_files FOR DELETE TO anon, authenticated USING (true);

-- lessons
DROP POLICY IF EXISTS "st_select_lessons" ON lessons;
CREATE POLICY "st_select_lessons" ON lessons FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "st_insert_lessons" ON lessons;
CREATE POLICY "st_insert_lessons" ON lessons FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "st_update_lessons" ON lessons;
CREATE POLICY "st_update_lessons" ON lessons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "st_delete_lessons" ON lessons;
CREATE POLICY "st_delete_lessons" ON lessons FOR DELETE TO anon, authenticated USING (true);

-- quiz_results
DROP POLICY IF EXISTS "st_select_quiz_results" ON quiz_results;
CREATE POLICY "st_select_quiz_results" ON quiz_results FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "st_insert_quiz_results" ON quiz_results;
CREATE POLICY "st_insert_quiz_results" ON quiz_results FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "st_update_quiz_results" ON quiz_results;
CREATE POLICY "st_update_quiz_results" ON quiz_results FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "st_delete_quiz_results" ON quiz_results;
CREATE POLICY "st_delete_quiz_results" ON quiz_results FOR DELETE TO anon, authenticated USING (true);

-- flashcards
DROP POLICY IF EXISTS "st_select_flashcards" ON flashcards;
CREATE POLICY "st_select_flashcards" ON flashcards FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "st_insert_flashcards" ON flashcards;
CREATE POLICY "st_insert_flashcards" ON flashcards FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "st_update_flashcards" ON flashcards;
CREATE POLICY "st_update_flashcards" ON flashcards FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "st_delete_flashcards" ON flashcards;
CREATE POLICY "st_delete_flashcards" ON flashcards FOR DELETE TO anon, authenticated USING (true);

-- study_sessions
DROP POLICY IF EXISTS "st_select_study_sessions" ON study_sessions;
CREATE POLICY "st_select_study_sessions" ON study_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "st_insert_study_sessions" ON study_sessions;
CREATE POLICY "st_insert_study_sessions" ON study_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "st_update_study_sessions" ON study_sessions;
CREATE POLICY "st_update_study_sessions" ON study_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "st_delete_study_sessions" ON study_sessions;
CREATE POLICY "st_delete_study_sessions" ON study_sessions FOR DELETE TO anon, authenticated USING (true);

-- progress
DROP POLICY IF EXISTS "st_select_progress" ON progress;
CREATE POLICY "st_select_progress" ON progress FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "st_insert_progress" ON progress;
CREATE POLICY "st_insert_progress" ON progress FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "st_update_progress" ON progress;
CREATE POLICY "st_update_progress" ON progress FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "st_delete_progress" ON progress;
CREATE POLICY "st_delete_progress" ON progress FOR DELETE TO anon, authenticated USING (true);

-- badges
DROP POLICY IF EXISTS "st_select_badges" ON badges;
CREATE POLICY "st_select_badges" ON badges FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "st_insert_badges" ON badges;
CREATE POLICY "st_insert_badges" ON badges FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "st_update_badges" ON badges;
CREATE POLICY "st_update_badges" ON badges FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "st_delete_badges" ON badges;
CREATE POLICY "st_delete_badges" ON badges FOR DELETE TO anon, authenticated USING (true);

-- learning_plans
DROP POLICY IF EXISTS "st_select_learning_plans" ON learning_plans;
CREATE POLICY "st_select_learning_plans" ON learning_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "st_insert_learning_plans" ON learning_plans;
CREATE POLICY "st_insert_learning_plans" ON learning_plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "st_update_learning_plans" ON learning_plans;
CREATE POLICY "st_update_learning_plans" ON learning_plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "st_delete_learning_plans" ON learning_plans;
CREATE POLICY "st_delete_learning_plans" ON learning_plans FOR DELETE TO anon, authenticated USING (true);

-- chat_messages
DROP POLICY IF EXISTS "st_select_chat_messages" ON chat_messages;
CREATE POLICY "st_select_chat_messages" ON chat_messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "st_insert_chat_messages" ON chat_messages;
CREATE POLICY "st_insert_chat_messages" ON chat_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "st_update_chat_messages" ON chat_messages;
CREATE POLICY "st_update_chat_messages" ON chat_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "st_delete_chat_messages" ON chat_messages;
CREATE POLICY "st_delete_chat_messages" ON chat_messages FOR DELETE TO anon, authenticated USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lessons_profile ON lessons(profile_id);
CREATE INDEX IF NOT EXISTS idx_lessons_created ON lessons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_profile ON quiz_results(profile_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_profile ON flashcards(profile_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_lesson ON flashcards(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_profile ON progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_profile ON study_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_profile ON chat_messages(profile_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_profile ON uploaded_files(profile_id);
