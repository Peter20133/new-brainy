import type { UserProfile, LessonAnalysis, HomeworkSolution, QuizQuestion, PrerequisitePath, SubjectSlug } from '@/types';
import { GRADE_LABELS, getSubjectName } from '@/constants';

const AI_ENDPOINT = '/api/brainy-ai';

export interface AIContext {
  profile: UserProfile | null;
}

function buildSystemPrompt(profile: UserProfile | null): string {
  if (!profile) return 'Ești Brainy AI, un tutor educațional prietenos care explică pe înțelesul elevilor români. Răspunde mereu în limba română.';

  const subjects = profile.selected_subjects.map((s) => getSubjectName(s)).join(', ');
  return `Ești Brainy AI, un tutor educațional prietenos și răbdător pentru elevii români.

INFORMAȚII DESPRE ELEV:
- Nume: ${profile.name}
- Clasa: ${GRADE_LABELS[profile.grade] || `Clasa a ${profile.grade}-a`}
- Materii studiate: ${subjects}
- XP: ${profile.xp}
- Nivel: ${profile.level}

REGULI:
1. Răspunde ÎNTOTDEAUNA în limba română.
2. Adaptează limbajul și complexitatea explicațiilor la nivelul clasei a ${profile.grade}-a.
3. Folosește exemple simple, clare și relevante pentru vârsta elevului.
4. Fii prietenos, încurajator și motivațional — dar nu copilăresc.
5. La teme, NU da răspunsul direct imediat. Ghidează elevul pas cu pas.
6. Folosește formatare clară: liste, pași numerotați, paragrafe scurte.
7. Dacă elevul nu înțelege, simplifică și mai mult explicația.
8. Nu folosi roboti sau mascote. Ești un tutor prietenos.
9. Răspunsurile trebuie să fie complete, dar concise.
10. La matematică și științe, folosește notații corecte și explică fiecare pas.`;
}

interface AIRequest {
  task: string;
  profile: UserProfile | null;
  input: string;
  messages?: { role: string; content: string }[];
  imageData?: string;
  extraContext?: Record<string, unknown>;
}

export class AINotConfiguredError extends Error {
  constructor() {
    super('AI-ul nu este configurat încă. Adaugă cheia API pentru a activa tutorul Brainy.');
    this.name = 'AINotConfiguredError';
  }
}

async function callAI(req: AIRequest, timeoutMs: number = 40000): Promise<string> {
  const systemPrompt = buildSystemPrompt(req.profile);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: req.task,
        systemPrompt,
        input: req.input,
        messages: req.messages,
        imageData: req.imageData,
        extraContext: req.extraContext,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const data = await response.json().catch(() => ({}));

    if (data.notConfigured) {
      throw new AINotConfiguredError();
    }

    if (!response.ok) {
      throw new Error(data.error || `Cererea a eșuat (${response.status})`);
    }

    if (data.error) throw new Error(data.error);
    return data.result || data.text || '';
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Timpul de așteptare a expirat (timeout). Te rugăm să reîncerci.');
    }
    if (err instanceof AINotConfiguredError) throw err;
    console.error('AI service error:', err);
    throw err;
  }
}

export const aiService = {
  async analyzeLesson(profile: UserProfile | null, input: string, imageData?: string): Promise<LessonAnalysis> {
    const result = await callAI({
      task: 'analyze_lesson',
      profile,
      input,
      imageData,
    });
    try {
      const cleanJson = result.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      return JSON.parse(cleanJson) as LessonAnalysis;
    } catch {
      throw new Error('Răspuns AI invalid pentru analiza lecției');
    }
  },

  async solveHomework(
    profile: UserProfile | null,
    input: string,
    imageData?: string,
    subject?: string
  ): Promise<HomeworkSolution> {
    const formattedInput = subject ? `[Materie: ${subject}]\n${input}` : input;
    const result = await callAI({
      task: 'solve_homework',
      profile,
      input: formattedInput,
      imageData,
      extraContext: subject ? { subject } : undefined,
    });

    try {
      const cleanJson = result.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleanJson) as Partial<HomeworkSolution>;
      return {
        goal: parsed.goal || input || 'Rezolvarea cerinței',
        steps: Array.isArray(parsed.steps) && parsed.steps.length > 0
          ? parsed.steps
          : [
              { title: 'Pasul 1: Identificarea cerinței', detail: 'Analizăm datele problemei.' },
              { title: 'Pasul 2: Calcul și rezolvare', detail: 'Efectuăm operațiile necesare conform regulilor.' },
            ],
        method: parsed.method || undefined,
        answer: parsed.answer || 'Rezolvare finalizată cu succes.',
        subject: parsed.subject || subject || 'Matematică',
      };
    } catch {
      return {
        goal: input || 'Rezolvarea cerinței',
        steps: [
          { title: 'Pasul 1: Notarea datelor', detail: 'Identificăm datele problemei din enunț sau imagine.' },
          { title: 'Pasul 2: Aplicarea formulei', detail: 'Aplicăm relațiile specifice materiei alese.' },
          { title: 'Pasul 3: Rezultatul', detail: result },
        ],
        answer: 'Verifică pașii de mai sus pentru rezolvarea detaliată.',
        subject: subject || 'Matematică',
      };
    }
  },

  async chat(
    profile: UserProfile | null,
    message: string,
    history: { role: string; content: string }[],
    imageData?: string
  ): Promise<string> {
    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];
    return callAI({
      task: 'chat',
      profile,
      input: message,
      messages,
      imageData,
    });
  },

  async explainSimpler(profile: UserProfile | null, text: string): Promise<string> {
    return callAI({
      task: 'explain_simpler',
      profile,
      input: text,
    });
  },

  async generateQuiz(profile: UserProfile | null, topic: string, numQuestions: number): Promise<QuizQuestion[]> {
    const result = await callAI({
      task: 'generate_quiz',
      profile,
      input: topic,
      extraContext: { numQuestions },
    });
    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : parsed.questions || [];
    } catch {
      throw new Error('Răspuns AI invalid pentru generarea quiz-ului');
    }
  },

  async generateFlashcards(profile: UserProfile | null, topic: string, numCards: number): Promise<{ front: string; back: string }[]> {
    const result = await callAI({
      task: 'generate_flashcards',
      profile,
      input: topic,
      extraContext: { numCards },
    });
    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : parsed.cards || [];
    } catch {
      throw new Error('Răspuns AI invalid pentru generarea flashcards');
    }
  },

  async generateStudyPlan(profile: UserProfile | null, subject: SubjectSlug, lessons: string[], minutes: number): Promise<{ time: string; activity: string; detail: string; duration: number }[]> {
    const result = await callAI({
      task: 'study_plan',
      profile,
      input: `Materie: ${getSubjectName(subject)}, Lecții: ${lessons.join(', ')}, Timp disponibil: ${minutes} minute`,
    });
    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : parsed.plan || [];
    } catch {
      throw new Error('Răspuns AI invalid pentru planul de învățare');
    }
  },

  async identifyPrerequisites(profile: UserProfile | null, topic: string): Promise<PrerequisitePath> {
    const result = await callAI({
      task: 'prerequisites',
      profile,
      input: topic,
    });
    try {
      return JSON.parse(result) as PrerequisitePath;
    } catch {
      throw new Error('Răspuns AI invalid pentru identificarea cerințelor');
    }
  },

  async similarExercise(profile: UserProfile | null, input: string): Promise<string> {
    return callAI({
      task: 'similar_exercise',
      profile,
      input,
    });
  },

  async verifyUnderstanding(profile: UserProfile | null, input: string): Promise<string> {
    return callAI({
      task: 'verify_understanding',
      profile,
      input,
    });
  },
};
