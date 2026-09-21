const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIRequestBody {
  task: string;
  systemPrompt: string;
  input: string;
  messages?: ChatMessage[];
  imageData?: string;
  extraContext?: Record<string, unknown>;
}

const NOT_CONFIGURED_MESSAGE =
  "AI-ul nu este configurat încă. Adaugă cheia API pentru a activa tutorul Brainy.";

const TASK_INSTRUCTIONS: Record<string, string> = {
  analyze_lesson: `Analizează această lecție și returnează un JSON valid cu următoarea structură:
{
  "title": "Titlul lecției",
  "subject": "materia (matematica, fizica, biologie, etc.)",
  "short_summary": "Un rezumat concis în 2-3 propoziții",
  "simple_explanation": "O explicație simplă, pe înțelesul elevului de clasa corespunzătoare",
  "detailed_explanation": "O explicație mai detaliată cu toate detaliile importante",
  "key_ideas": [{"text": "ideea principală 1"}, {"text": "ideea principală 2"}],
  "important_terms": [{"term": "termen", "definition": "definiție"}],
  "example": "Un exemplu practic care ilustrează lecția"
}

Returnează DOAR JSON-ul, fără text suplimentar.`,

  solve_homework: `Rezolvă acest exercițiu pas cu pas. NU da răspunsul final imediat.
Returnează un JSON valid cu următoarea structură:
{
  "goal": "Ce trebuie să aflăm",
  "subject": "materia",
  "steps": [
    {"title": "Pasul 1", "detail": "explicație detaliată a pasului"},
    {"title": "Pasul 2", "detail": "explicație detaliată a pasului"},
    {"title": "Pasul 3", "detail": "explicație detaliată a pasului"}
  ],
  "answer": "Răspunsul final cu explicație scurtă"
}

Returnează DOAR JSON-ul, fără text suplimentar.`,

  chat: "",

  explain_simpler: `Explică acest text într-un mod și mai simplu, ca și cum ai vorbi cu un copil mai mic.
Folosește cuvinte simple, analogii din viața de zi cu zi și exemple concrete.
Răspunde în limba română, doar cu explicația simplificată.`,

  generate_quiz: `Generează un quiz cu întrebări variate pentru elev.
Returnează un JSON valid - un array de întrebări cu următoarea structură:
[
  {
    "id": 1,
    "type": "multiple_choice",
    "question": "Întrebarea",
    "options": ["optiune1", "optiune2", "optiune3", "optiune4"],
    "correct_answer": "opțiunea corectă",
    "explanation": "explicație scurtă"
  },
  {
    "id": 2,
    "type": "true_false",
    "question": "Afirmăția",
    "correct_answer": "Adevărat" sau "Fals",
    "explanation": "explicație"
  },
  {
    "id": 3,
    "type": "short_answer",
    "question": "Întrebare cu răspuns scurt",
    "correct_answer": "răspunsul așteptat",
    "explanation": "explicație"
  }
]

Folosește mix de tipuri de întrebări. Returnează DOAR JSON-ul.`,

  generate_flashcards: `Generează flashcards pentru acest subiect.
Returnează un JSON valid - un array cu următoarea structură:
[
  {"front": "Întrebarea", "back": "Răspunsul"}
]

Fiecare card trebuie să aibă o întrebare clară pe față și un răspuns concis pe spate.
Returnează DOAR JSON-ul.`,

  study_plan: `Generează un plan de învățare realist pentru elev.
Returnează un JSON valid - un array cu următoarea structură:
[
  {"time": "18:00", "activity": "Recapitulare", "detail": "Ce să recapituleze", "duration": 20},
  {"time": "18:20", "activity": "Exerciții", "detail": "Ce exerciții", "duration": 25}
]

Timpul de start este 18:00. Fiecare bloc are duration în minute.
Returnează DOAR JSON-ul.`,

  prerequisites: `Identifică cerințele preliminare pentru acest subiect.
Returnează un JSON valid cu următoarea structură:
{
  "topic": "subiectul cerut",
  "prerequisites": [
    {"title": "Cunoștință necesară", "description": "de ce e necesar", "mastered": false}
  ],
  "miniPath": [
    {"title": "Pas 1", "description": "Ce să învețe primul"}
  ]
}

Returnează DOAR JSON-ul.`,

  similar_exercise: `Generează un exercițiu similar cu cel dat, dar cu valori/date diferite.
Nu include rezolvarea. Lasă elevul să încerce singur.
Răspunde în limba română.`,

  verify_understanding: `Verifică dacă elevul a înțeles tema punând 2-3 întrebări scurte.
Nu da răspunsul, doar întreabă. Răspunde în limba română.`,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json() as AIRequestBody;
    const { task, systemPrompt, input, messages, imageData, extraContext } = body;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    // No API key configured — return a clear, honest error.
    // Do NOT fall back to fake/hardcoded responses.
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: NOT_CONFIGURED_MESSAGE, notConfigured: true }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build the messages array for the OpenAI API.
    // For chat: use the full conversation history passed from the client.
    // For other tasks: single-turn with task instruction appended.
    let apiMessages: ChatMessage[];

    if (task === "chat" && messages && messages.length > 0) {
      // Chat: system prompt + conversation history (already includes the latest user message)
      apiMessages = [
        { role: "system", content: systemPrompt },
        ...messages,
      ];
    } else {
      // Single-turn tasks: system prompt + user message with task instruction
      const taskInstruction = TASK_INSTRUCTIONS[task] || "Răspunde în limba română.";
      const userContent = imageData
        ? `${input}\n\n[Imagine atașată - analizează conținutul vizual]\n\n${taskInstruction}`
        : `${input}\n\n${taskInstruction}`;

      const contextStr = extraContext
        ? `\n\nContext suplimentar: ${JSON.stringify(extraContext)}`
        : "";

      apiMessages = [
        { role: "system", content: systemPrompt + contextStr },
        { role: "user", content: userContent },
      ];
    }

    // Choose model: gpt-4o for image analysis, gpt-4o-mini for text
    const model = imageData ? "gpt-4o" : "gpt-4o-mini";

    const requestBody: Record<string, unknown> = {
      model,
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 2000,
    };

    // For image analysis, attach the image as a content part
    if (imageData && task !== "chat") {
      const base64Data = imageData.includes(",") ? imageData.split(",")[1] : imageData;
      const mimeMatch = imageData.match(/^data:(image\/\w+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

      // Replace the last user message with a multimodal message
      const lastIdx = apiMessages.length - 1;
      const lastMsg = apiMessages[lastIdx];
      apiMessages[lastIdx] = {
        role: "user",
        content: [
          { type: "text", text: lastMsg.content },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
        ] as unknown as string,
      };

      requestBody.messages = apiMessages;
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error("OpenAI API error:", openaiResponse.status, errText);
      const status = openaiResponse.status;
      let userMessage = "Eroare la comunicarea cu serviciul AI. Încearcă din nou.";
      if (status === 401) userMessage = "Cheia API este invalidă. Verifică configurarea.";
      if (status === 429) userMessage = "S-a atins limita de cereri AI. Încearcă din nou în câteva minute.";
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();
    const result = openaiData.choices?.[0]?.message?.content || "";

    if (!result) {
      return new Response(
        JSON.stringify({ error: "Răspuns gol de la serviciul AI." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Eroare internă" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
