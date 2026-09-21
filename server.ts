import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const PORT = 3000;

const TASK_INSTRUCTIONS: Record<string, string> = {
  analyze_lesson: `Analizează această lecție și returnează un JSON valid cu următoarea structură:
{
  "title": "Titlul lecției",
  "subject": "materia (matematica, limba-romana, engleza, istorie, geografie, biologie, fizica, etc.)",
  "short_summary": "Un rezumat concis în 2-3 propoziții",
  "simple_explanation": "O explicație simplă, pe înțelesul elevului de clasa corespunzătoare",
  "detailed_explanation": "O explicație detaliată cu toate conceptele importante",
  "key_ideas": [{"text": "ideea principală 1"}, {"text": "ideea principală 2"}],
  "important_terms": [{"term": "termen", "definition": "definiție"}],
  "example": "Un exemplu practic care ilustrează lecția"
}
Returnează DOAR JSON-ul valid, fără delimitatori markdown sau text suplimentar.`,

  solve_homework: `Analizează tema sau exercițiul primit (din text sau direct din fotografia încărcată). Dacă ai primit o imagine (ex: poză din caiet, manual sau fișă de lucru), citește cu atenție textul și formulele din poză, identifică problema prezentată și enunțul exact, determină materia și formulele specifice, apoi oferă o rezolvare completă pas cu pas. NU da doar răspunsul final.
Returnează un JSON valid cu următoarea structură:
{
  "goal": "Enunțul clar al problemei / ce trebuie rezolvat (extras din imagine sau text)",
  "subject": "Materia (ex: Matematică, Limba Română, Fizică, Chimie, Biologie, Istorie, Geografie etc.)",
  "method": "Formula sau metoda folosită (ex: Teorema lui Pitagora, Ecuație de gradul I, Acordul predicatului cu subiectul, etc.)",
  "steps": [
    {"title": "Pasul 1: Identificarea datelor din problemă", "detail": "explicație detaliată a primului pas"},
    {"title": "Pasul 2: Aplicarea formulei / raționamentului", "detail": "explicație detaliată a următorului pas"}
  ],
  "answer": "Răspunsul final clar evidențiat"
}
Returnează DOAR JSON-ul valid, fără delimitatori markdown sau text suplimentar.`,

  chat: `Răspunde prietenos și educativ ca un profesor/tutor particular excelent. Dacă elevul cere explicații, oferă exemple clare. Folosește limba română corectă și formatare lizibilă.`,

  explain_simpler: `Explică acest text într-un mod și mai simplu, folosind analogii din viața de zi cu zi și exemple concrete, pe înțelesul unui elev. Răspunde direct în limba română cu explicația simplificată.`,

  generate_quiz: `Generează un set de întrebări de test/evaluare pe baza temei date.
Returnează un JSON valid (o listă de obiecte):
[
  {
    "id": 1,
    "type": "multiple_choice",
    "question": "Întrebarea",
    "options": ["Varianta A", "Varianta B", "Varianta C", "Varianta D"],
    "correct_answer": "Varianta corectă",
    "explanation": "Explicație scurtă a răspunsului"
  },
  {
    "id": 2,
    "type": "true_false",
    "question": "Afirmația...",
    "correct_answer": "Adevărat",
    "explanation": "Explicație"
  },
  {
    "id": 3,
    "type": "short_answer",
    "question": "Întrebare cu răspuns scurt",
    "correct_answer": "Răspunsul corect",
    "explanation": "Explicație"
  }
]
Returnează DOAR JSON-ul valid, fără delimitatori markdown sau text suplimentar.`,

  generate_flashcards: `Generează flashcards pentru învățare și memorare eficientă pe acest subiect.
Returnează un JSON valid (o listă de obiecte):
[
  {
    "front": "Întrebarea sau conceptul de pe față",
    "back": "Răspunsul sau explicația concisă de pe verso"
  }
]
Returnează DOAR JSON-ul valid, fără delimitatori markdown sau text suplimentar.`,

  study_plan: `Generează un plan de învățare structurat pe blocuri de timp pentru elev.
Returnează un JSON valid (o listă de obiecte):
[
  {
    "time": "18:00",
    "activity": "Numele activității (ex: Recapitulare)",
    "detail": "Ce conținut sau exerciții concrete să lucreze",
    "duration": 20
  }
]
Fiecare bloc are duration în minute. Returnează DOAR JSON-ul valid, fără delimitatori markdown.`,

  prerequisites: `Identifică cunoștințele de bază necesare pentru a înțelege acest subiect de la zero.
Returnează un JSON valid cu structura:
{
  "topic": "Subiectul cerut",
  "prerequisites": [
    {"title": "Cunoștință necesară", "description": "De ce e necesară", "mastered": false}
  ],
  "miniPath": [
    {"title": "Pasul 1", "description": "Ce să înveți mai întâi"}
  ]
}
Returnează DOAR JSON-ul valid, fără delimitatori markdown sau text suplimentar.`,

  similar_exercise: `Generează un exercițiu similar cu cel dat, dar cu date sau valori diferite, pentru ca elevul să exerseze singur. Nu da rezolvarea directă. Răspunde în limba română.`,

  verify_understanding: `Pune 2-3 întrebări scurte de verificare pentru a vedea dacă elevul a înțeles conceptul. Răspunde în limba română fără să dai rezolvările dinainte.`,
};

const JSON_TASKS = new Set([
  'analyze_lesson',
  'solve_homework',
  'generate_quiz',
  'generate_flashcards',
  'study_plan',
  'prerequisites',
]);

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: unknown;
    config?: Record<string, unknown>;
  }
): Promise<string> {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: params.contents as any,
        config: params.config,
      });
      if (response && typeof response.text === 'string') {
        return response.text;
      }
    } catch (err: unknown) {
      lastError = err;
      console.warn(`Model ${model} encounter:`, err instanceof Error ? err.message : err);
    }
  }

  throw lastError || new Error('Modelele AI sunt momentan indisponibile.');
}

function getEducationalFallback(task: string, input: string, extraContext?: Record<string, unknown>): string {
  const cleanInput = (input || '').replace(/\[Materie: [^\]]+\]\n?/, '').trim();
  const subjectMatch = (input || '').match(/\[Materie: ([^\]]+)\]/);
  const subject = (extraContext?.subject as string) || (subjectMatch ? subjectMatch[1] : 'Matematică');

  if (task === 'solve_homework') {
    const numMatches = cleanInput.match(/-?\d+(?:[.,]\d+)?/g);
    let method = 'Metoda deducerii logice și a calculului structurat pas cu pas';
    let steps: Array<{ title: string; detail: string }> = [
      {
        title: 'Pasul 1: Notarea datelor și a cerinței',
        detail: `Enunțul problemei: "${cleanInput || 'Problema din imaginea/captura încărcată'}". Identificăm datele cunoscute, necunoscutele și relația dintre acestea pentru materia ${subject}.`,
      },
      {
        title: 'Pasul 2: Stabilirea metodei și a formulelor de calcul',
        detail: `Aplicăm regulile fundamentale specifice materiei ${subject}. Scriem relațiile matematice / gramaticale / științifice necesare pentru rezolvare.`,
      },
      {
        title: 'Pasul 3: Rezolvarea pas cu pas și verificarea',
        detail: `Efectuăm calculele intermediare cu atenție la ordinea operațiilor și verificăm corectitudinea soluției obținute.`,
      },
    ];
    let answer = `Soluția finală a fost dedusă prin parcurgerea logică a pașilor pentru cerința dată.`;

    if (numMatches && numMatches.length >= 2 && (cleanInput.includes('+') || cleanInput.toLowerCase().includes('adun') || cleanInput.toLowerCase().includes('suma'))) {
      const a = parseFloat(numMatches[0].replace(',', '.'));
      const b = parseFloat(numMatches[1].replace(',', '.'));
      const sum = a + b;
      method = 'Operația de adunare (termen + termen = sumă)';
      steps = [
        { title: 'Pasul 1: Identificarea termenilor', detail: `Termenii adunării sunt ${a} și ${b}.` },
        { title: 'Pasul 2: Efectuarea adunării', detail: `Calculăm suma celor doi termeni: ${a} + ${b} = ${sum}.` },
        { title: 'Pasul 3: Verificarea soluției', detail: `Efectuăm proba prin scădere: ${sum} - ${b} = ${a}.` },
      ];
      answer = `Rezultatul final este ${sum}.`;
    } else if (numMatches && numMatches.length >= 2 && (cleanInput.includes('-') || cleanInput.toLowerCase().includes('scad') || cleanInput.toLowerCase().includes('diferen'))) {
      const a = parseFloat(numMatches[0].replace(',', '.'));
      const b = parseFloat(numMatches[1].replace(',', '.'));
      const diff = a - b;
      method = 'Operația de scădere (descăzut - scăzător = diferență)';
      steps = [
        { title: 'Pasul 1: Identificarea elementelor', detail: `Descăzutul este ${a}, iar scăzătorul este ${b}.` },
        { title: 'Pasul 2: Efectuarea scăderii', detail: `Calculăm diferența: ${a} - ${b} = ${diff}.` },
        { title: 'Pasul 3: Verificarea prin probă', detail: `Efectuăm proba prin adunare: ${diff} + ${b} = ${a}.` },
      ];
      answer = `Diferența finală este ${diff}.`;
    } else if (numMatches && numMatches.length >= 2 && (cleanInput.includes('*') || cleanInput.includes('x') || cleanInput.includes('•') || cleanInput.toLowerCase().includes('inmult') || cleanInput.toLowerCase().includes('produs'))) {
      const a = parseFloat(numMatches[0].replace(',', '.'));
      const b = parseFloat(numMatches[1].replace(',', '.'));
      const prod = a * b;
      method = 'Operația de înmulțire (factor × factor = produs)';
      steps = [
        { title: 'Pasul 1: Identificarea factorilor', detail: `Factorii operației sunt ${a} și ${b}.` },
        { title: 'Pasul 2: Calculul produsului', detail: `Înmulțim cei doi factori: ${a} × ${b} = ${prod}.` },
        { title: 'Pasul 3: Verificare prin împărțire', detail: `Efectuăm proba prin împărțire: ${prod} / ${b} = ${a}.` },
      ];
      answer = `Produsul final este ${prod}.`;
    }

    return JSON.stringify({
      goal: cleanInput || 'Rezolvarea exercițiului dat',
      subject,
      method,
      steps,
      answer,
    });
  }

  if (task === 'explain_simpler') {
    return `Pe scurt: gândește-te la acest exercițiu pas cu pas. Identificăm ce știm, aplicăm regula de bază a materiei ${subject}, și calculăm rezultatul fără grabă.`;
  }

  if (task === 'similar_exercise') {
    return `Iată un exercițiu similar pentru antrenament la ${subject}:\n\nRezolvă o problemă asemănătoare, modificând datele inițiale și parcurgând exact aceiași pași logici!`;
  }

  if (task === 'verify_understanding') {
    return `1. Care este regula sau metoda principală pe care am aplicat-o la acest pas?\n2. Cum putem verifica dacă răspunsul final este corect?`;
  }

  if (task === 'chat') {
    return `Salut! Sunt Brainy AI, tutorul tău dedicat. Cu ce temă sau întrebare la ${subject || 'școală'} te pot ajuta astăzi?`;
  }

  return JSON.stringify({
    title: 'Lecție analizată',
    subject: subject || 'General',
    short_summary: 'Sinteza conceptelor principale parcurse.',
    simple_explanation: 'Explicație pe înțelesul elevului.',
    detailed_explanation: 'Detalierea fiecărui punct esențial.',
    key_ideas: [{ text: 'Înțelegerea noțiunilor fundamentale' }],
    important_terms: [{ term: 'Concept cheie', definition: 'Definiția principală a temei studiate' }],
    example: 'Exemplu practic de aplicare',
  });
}

async function startServer() {
  const app = express();

  // Accept larger payloads for PhotoLearn uploads
  app.use(express.json({ limit: '25mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Brainy AI endpoint powered by Gemini API
  app.post('/api/brainy-ai', async (req, res) => {
    const {
      task,
      systemPrompt,
      input,
      messages,
      imageData,
      extraContext,
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    const isJsonTask = JSON_TASKS.has(task);

    // If Gemini API is available, try live AI first
    if (apiKey) {
      try {
        const ai = getGeminiClient();

        let taskInstruction = TASK_INSTRUCTIONS[task] || '';
        if (extraContext?.numQuestions) {
          taskInstruction += `\nGenerează exact ${extraContext.numQuestions} întrebări.`;
        }
        if (extraContext?.numCards) {
          taskInstruction += `\nGenerează exact ${extraContext.numCards} flashcards.`;
        }

        // Build multimodal contents
        let imagePart: { inlineData: { mimeType: string; data: string } } | null = null;
        if (imageData && typeof imageData === 'string') {
          let mimeType = 'image/jpeg';
          let base64Data = imageData;
          if (imageData.startsWith('data:')) {
            const match = imageData.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
            if (match) {
              mimeType = match[1];
              base64Data = match[2];
            }
          }
          imagePart = {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          };
        }

        let responseText = '';

        if (task === 'chat' && Array.isArray(messages) && messages.length > 0) {
          const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

          for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            if (msg.role === 'user') {
              const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: msg.content }];
              if (i === messages.length - 1 && imagePart) {
                parts.unshift(imagePart);
              }
              contents.push({ role: 'user', parts: parts as Array<{ text: string }> });
            } else if (msg.role === 'assistant' || msg.role === 'model') {
              contents.push({ role: 'model', parts: [{ text: msg.content }] });
            }
          }

          responseText = await generateWithFallback(ai, {
            contents,
            config: {
              systemInstruction: systemPrompt || TASK_INSTRUCTIONS.chat,
              temperature: 0.7,
            },
          });
        } else {
          const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

          if (imagePart) {
            parts.push(imagePart);
          }
          if (taskInstruction) {
            parts.push({ text: taskInstruction });
          }
          if (input) {
            parts.push({ text: `Date de intrare:\n${input}` });
          }

          responseText = await generateWithFallback(ai, {
            contents: { parts },
            config: {
              systemInstruction: systemPrompt || 'Ești Brainy, un tutor AI inteligent și răbdător pentru elevi.',
              ...(isJsonTask ? { responseMimeType: 'application/json' } : {}),
              temperature: isJsonTask ? 0.2 : 0.7,
            },
          });
        }

        if (isJsonTask) {
          responseText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }

        return res.json({
          result: responseText,
          text: responseText,
        });
      } catch (err: unknown) {
        console.warn('Live Gemini API call had issues, falling back gracefully:', err instanceof Error ? err.message : err);
      }
    }

    // Educational resilient fallback when API key is missing or quota is exhausted
    const fallbackText = getEducationalFallback(task, input || '', extraContext);
    return res.json({
      result: fallbackText,
      text: fallbackText,
      isFallback: true,
    });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Brainy AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
