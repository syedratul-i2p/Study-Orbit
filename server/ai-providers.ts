import OpenAI from "openai";

export type AIProvider = "auto" | "orbitquick" | "orbitdeep" | "studyexpert";
export type AIMode = "auto" | "fast" | "think" | "expert";
export type TaskType =
  | "general"
  | "academic"
  | "reasoning"
  | "research"
  | "summary"
  | "creative"
  | "code"
  | "math";
type ResponseLanguage = "english" | "bangla";

export interface ProviderConfig {
  id: Exclude<AIProvider, "auto">;
  mode: Exclude<AIMode, "auto">;
  name: string;
  available: boolean;
  models: { fast: string; deep: string };
  strengths: TaskType[];
}

interface RouteDecision {
  provider: Exclude<AIProvider, "auto">;
  mode: Exclude<AIMode, "auto">;
  routingReason: string;
}

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const IS_OPENROUTER = OPENAI_BASE_URL?.includes("openrouter.ai") ?? false;

function getProviderModels(): Record<Exclude<AIProvider, "auto">, { fast: string; deep: string }> {
  if (IS_OPENROUTER) {
    return {
      orbitquick: { fast: "openrouter/free", deep: "openrouter/free" },
      orbitdeep: { fast: "openrouter/free", deep: "openrouter/free" },
      studyexpert: { fast: "openrouter/free", deep: "openrouter/free" },
    };
  }

  return {
    orbitquick: { fast: "gpt-4o-mini", deep: "gpt-4o-mini" },
    orbitdeep: { fast: "gpt-4o-mini", deep: "gpt-4o" },
    studyexpert: { fast: "gpt-4o-mini", deep: "gpt-4o" },
  };
}

function createOpenAIClient() {
  if (!OPENAI_API_KEY) {
    throw new Error("AI provider is not configured");
  }

  return new OpenAI({
    apiKey: OPENAI_API_KEY,
    ...(OPENAI_BASE_URL && {
      baseURL: OPENAI_BASE_URL,
    }),
  });
}

export function getAvailableProviders(): ProviderConfig[] {
  const available = Boolean(OPENAI_API_KEY);
  const models = getProviderModels();

  return [
    {
      id: "orbitquick",
      mode: "fast",
      name: "Fast",
      available,
      models: models.orbitquick,
      strengths: ["general", "creative", "summary", "code"],
    },
    {
      id: "orbitdeep",
      mode: "think",
      name: "Think",
      available,
      models: models.orbitdeep,
      strengths: ["reasoning", "research", "code"],
    },
    {
      id: "studyexpert",
      mode: "expert",
      name: "Study Expert",
      available,
      models: models.studyexpert,
      strengths: ["academic", "math", "summary"],
    },
  ];
}

const SIMPLE_PATTERNS = [
  /^(what is|define|meaning of)\b/i,
  /^(who|when|where|which|how many)\b/i,
];

const CONCISE_PATTERNS = [
  /\bbriefly\b/i,
  /\bshort\b/i,
  /\bconcise\b/i,
  /\bsimply\b/i,
  /\bin short\b/i,
  /সংক্ষেপে/i,
  /সহজভাবে/i,
  /সংক্ষিপ্ত/i,
  /ছোট করে/i,
];

const COMPLEX_KEYWORDS = [
  "explain",
  "analyze",
  "analysis",
  "compare",
  "prove",
  "derive",
  "solve",
  "essay",
  "describe in detail",
  "discuss",
  "evaluate",
  "differentiate",
  "advantages and disadvantages",
  "cause and effect",
  "steps",
  "procedure",
  "mechanism",
  "theory",
  "theorem",
  "notes",
  "exam answer",
  "broad question",
  "short note",
  "critical analysis",
];

const MATH_KEYWORDS = [
  "calculate",
  "integral",
  "derivative",
  "equation",
  "formula",
  "algebra",
  "geometry",
  "trigonometry",
  "calculus",
  "matrix",
  "probability",
  "statistics",
  "proof",
  "theorem",
  "solve",
  "=",
  "sqrt",
];

const RESEARCH_KEYWORDS = [
  "research",
  "literature",
  "citation",
  "source",
  "reference",
  "journal",
  "paper",
  "survey",
  "methodology",
];

const CODE_KEYWORDS = [
  "code",
  "program",
  "function",
  "algorithm",
  "debug",
  "syntax",
  "compile",
  "html",
  "css",
  "javascript",
  "python",
  "java",
  "c++",
  "typescript",
  "react",
];

const ACADEMIC_KEYWORDS = [
  "mcq",
  "quiz",
  "chapter",
  "lesson",
  "textbook",
  "board",
  "ssc",
  "hsc",
  "class",
  "subject",
  "exam",
  "marks",
  "suggestion",
  "model test",
  "revision",
];
const SCIENCE_KEYWORDS = [
  "physics",
  "chemistry",
  "biology",
  "law",
  "formula",
  "theory",
  "newton",
  "mitosis",
  "meiosis",
  "force",
  "velocity",
  "acceleration",
  "momentum",
  "energy",
  "atom",
  "molecule",
  "reaction",
  "equilibrium",
  "acid",
  "base",
  "salt",
  "cell",
  "dna",
  "rna",
  "gene",
  "enzyme",
  "photosynthesis",
  "respiration",
  "পদার্থবিজ্ঞান",
  "রসায়ন",
  "রসায়ন",
  "জীববিজ্ঞান",
  "বল",
  "ভরবেগ",
  "ত্বরণ",
  "পরমাণু",
  "অণু",
  "প্রতিক্রিয়া",
  "প্রতিক্রিয়া",
  "অম্ল",
  "ক্ষার",
  "কোষ",
  "জিন",
  "ডিএনএ",
  "নিউটন",
  "সূত্র",
  "সমীকরণ",
  "মাইটোসিস",
  "মিয়োসিস",
  "মিয়োসিস",
  "সালোকসংশ্লেষণ",
];
const TRANSLATE_TO_BANGLA_PATTERNS = [
  /translate(?:\s+this)?\s+(?:to|into)\s+bangla/i,
  /translate(?:\s+this)?\s+(?:to|into)\s+bengali/i,
  /বাংলা(?:য়|তে)?\s+অনুবাদ/i,
];
const TRANSLATE_TO_ENGLISH_PATTERNS = [
  /translate(?:\s+this)?\s+(?:to|into)\s+english/i,
  /ইংরেজি(?:তে)?\s+অনুবাদ/i,
];
const BANGLA_SCRIPT_PATTERN = /[\u0980-\u09FF]/;
const ENGLISH_LETTER_PATTERN = /[A-Za-z]/;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function detectTaskType(messages: ChatMessage[]): TaskType {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return "general";

  const content = lastMessage.content.toLowerCase();

  if (MATH_KEYWORDS.some((keyword) => content.includes(keyword.toLowerCase()))) {
    return "math";
  }

  if (CODE_KEYWORDS.some((keyword) => content.includes(keyword.toLowerCase()))) {
    return "code";
  }

  if (ACADEMIC_KEYWORDS.some((keyword) => content.includes(keyword.toLowerCase()))) {
    return "academic";
  }

  if (SCIENCE_KEYWORDS.some((keyword) => content.includes(keyword.toLowerCase()))) {
    return "academic";
  }

  if (RESEARCH_KEYWORDS.some((keyword) => content.includes(keyword.toLowerCase()))) {
    return "research";
  }

  if (content.includes("summary") || content.includes("summarize")) {
    return "summary";
  }

  if (COMPLEX_KEYWORDS.some((keyword) => content.includes(keyword.toLowerCase()))) {
    return "reasoning";
  }

  if (messages.length > 4) return "reasoning";
  return "general";
}

function detectResponseLanguage(
  messages: ChatMessage[],
  userContext?: {
    chatLanguage?: string;
  },
): ResponseLanguage {
  const lastMessage = messages[messages.length - 1]?.content ?? "";

  if (TRANSLATE_TO_BANGLA_PATTERNS.some((pattern) => pattern.test(lastMessage))) {
    return "bangla";
  }

  if (TRANSLATE_TO_ENGLISH_PATTERNS.some((pattern) => pattern.test(lastMessage))) {
    return "english";
  }

  if (BANGLA_SCRIPT_PATTERN.test(lastMessage)) {
    return "bangla";
  }

  if (ENGLISH_LETTER_PATTERN.test(lastMessage)) {
    return "english";
  }

  return userContext?.chatLanguage === "bn" ? "bangla" : "english";
}

function isComplexQuery(messages: ChatMessage[]): boolean {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return false;

  const content = lastMessage.content;
  const lower = content.toLowerCase();

  if (SIMPLE_PATTERNS.some((pattern) => pattern.test(lower)) && content.length < 80) {
    return false;
  }

  if (content.length < 40 && messages.length <= 2) return false;
  if (content.length > 140) return true;
  if (messages.length > 5) return true;

  return COMPLEX_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function isConciseRequest(messages: ChatMessage[]): boolean {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return false;

  const content = lastMessage.content;
  const lower = content.toLowerCase();

  if (content.length <= 80 && SIMPLE_PATTERNS.some((pattern) => pattern.test(lower))) {
    return true;
  }

  return CONCISE_PATTERNS.some((pattern) => pattern.test(content));
}

function pickAvailableProvider(id: AIProvider) {
  if (id === "auto") return undefined;
  return getAvailableProviders().find((provider) => provider.id === id && provider.available);
}

function selectRouteDecision(
  taskType: TaskType,
  complex: boolean,
  concise: boolean,
  preferredProvider?: AIProvider,
): RouteDecision {
  const explicitlySelected = pickAvailableProvider(preferredProvider ?? "auto");
  if (explicitlySelected) {
    return {
      provider: explicitlySelected.id,
      mode: explicitlySelected.mode,
      routingReason: "manual-selection",
    };
  }

  const availableProviders = getAvailableProviders().filter((provider) => provider.available);
  if (availableProviders.length === 0) {
    throw new Error("AI provider is not configured");
  }

  if (taskType === "math" || taskType === "code") {
    return { provider: "studyexpert", mode: "expert", routingReason: "study-task" };
  }

  if (taskType === "research" || taskType === "reasoning" || complex) {
    return { provider: "orbitdeep", mode: "think", routingReason: "deep-reasoning" };
  }

  if (taskType === "academic") {
    if (concise) {
      return { provider: "orbitquick", mode: "fast", routingReason: "concise-academic" };
    }
    return { provider: "studyexpert", mode: "expert", routingReason: "study-task" };
  }

  return { provider: "orbitquick", mode: "fast", routingReason: "fast-response" };
}

function selectModel(
  provider: ProviderConfig,
  taskType: TaskType,
  complex: boolean,
): { model: string; maxTokens: number } {
  if (IS_OPENROUTER) {
    if (provider.id === "orbitquick") {
      return { model: provider.models.fast, maxTokens: 900 };
    }

    if (provider.id === "orbitdeep") {
      return {
        model: complex || taskType === "research" || taskType === "reasoning"
          ? provider.models.deep
          : provider.models.fast,
        maxTokens: complex ? 1400 : 1000,
      };
    }

    return {
      model: complex || taskType === "math" || taskType === "academic"
        ? provider.models.deep
        : provider.models.fast,
      maxTokens: complex ? 1500 : 1100,
    };
  }

  if (provider.id === "orbitquick") {
    return { model: provider.models.fast, maxTokens: 1400 };
  }

  if (provider.id === "orbitdeep") {
    return {
      model: complex || taskType === "research" || taskType === "reasoning"
        ? provider.models.deep
        : provider.models.fast,
      maxTokens: complex ? 3200 : 1800,
    };
  }

  return {
    model: complex || taskType === "math" || taskType === "academic"
      ? provider.models.deep
      : provider.models.fast,
    maxTokens: complex ? 3600 : 2200,
  };
}

const SYSTEM_PROMPTS: Record<Exclude<AIProvider, "auto">, string> = {
  orbitquick: `You are Study Orbit Fast mode, a concise academic assistant.

Rules:
- Detect the user's language and reply in that same language.
- If the user writes in Bangla, respond in clear, formal academic Bangla.
- For Bangla answers, explain in Bangla but keep the first mention of important scientific or technical terms in English inside parentheses when that improves clarity.
- Give direct answers first. Use short bullet points only when helpful.
- Do not over-explain simple questions.
- If the request needs deep reasoning, still help, but keep the structure tight and readable.
- Do not use LaTeX delimiters such as \\(...\\), \\[...\\], $$...$$, or raw TeX commands.
- Write equations in plain readable scientific form, such as F = m × a, p = m × v, a = F / m.
- For chemistry, prefer clean formulas like H₂O, CO₂, Na⁺, Ca²⁺ and balanced reactions like 2H₂ + O₂ → 2H₂O.
- For biology, keep core technical terms precise and use standard scientific names or English terms when useful.
- Avoid markdown tables in short answers. Prefer bullets for compact chat replies.`,

  orbitdeep: `You are Study Orbit Think mode, a careful reasoning assistant.

Rules:
- Detect the user's language and reply in that same language.
- If the user writes in Bangla, respond in clear, formal academic Bangla.
- For Bangla answers, explain in Bangla but keep the first mention of important scientific or technical terms in English inside parentheses when that improves clarity.
- Use structure: headings, steps, comparisons, and examples when useful.
- Show reasoning clearly for analysis, research, and difficult study questions.
- If information is uncertain, say so instead of inventing details.
- Do not use LaTeX delimiters such as \\(...\\), \\[...\\], $$...$$, or raw TeX commands.
- Write formulas in plain readable scientific form on normal lines, with symbols, units, and short labels when useful.
- For physics, define each symbol once before using it heavily.
- For chemistry, prefer balanced equations with proper subscripts, superscripts, and arrows instead of raw markup.
- For biology, keep terminology academically precise and use italic markdown for scientific names when relevant.
- Use markdown tables only when they clearly improve the answer and keep them simple. If a compact interface may make the table hard to read, use bullets instead.`,

  studyexpert: `You are Study Orbit Study Expert mode, a structured academic tutor focused on student-friendly, exam-ready help.

Rules:
- Detect the user's language and reply in that same language.
- If the user writes in Bangla, respond in clear, formal academic Bangla.
- For Bangla answers, explain in Bangla but keep the first mention of important scientific or technical terms in English inside parentheses when that improves clarity.
- Prioritize study clarity, exam readiness, and curriculum-friendly explanations.
- For math or technical questions, show steps cleanly.
- For long answers, use sections such as definition, explanation, examples, key points, and practice guidance when relevant.
- Keep the tone professional, supportive, and academically precise.
- Never use LaTeX delimiters such as \\(...\\), \\[...\\], $$...$$, or raw TeX commands.
- Render equations in plain scientific text, one step per line when needed, with neat symbols and readable spacing.
- For physics, state formulas with symbols and SI units when relevant.
- For chemistry, use proper formulas, charges, reaction arrows, and oxidation-state notation where relevant.
- For biology, use precise terminology, labelled processes, and standard names for structures, systems, and molecules.
- For comparisons, prefer bullets or short labeled rows unless a simple markdown table is clearly useful and readable.`,
};

function buildSystemPrompt(
  route: RouteDecision,
  responseLanguage: ResponseLanguage,
  userContext?: {
    classLevel?: string;
    department?: string;
    board?: string;
    subjectContext?: string;
    chatLanguage?: string;
  },
): string {
  let prompt = SYSTEM_PROMPTS[route.provider];
  const languageDirective = responseLanguage === "bangla"
    ? [
        "Latest user message language: Bangla.",
        "Respond only in Bangla using Bengali script.",
        "Do not switch to English unless the user explicitly asks for English or translation.",
        "Do not write Bangla using Latin letters.",
        "Do not mix Bengali letters with partial English inside the same word.",
        "If an English technical term is needed, keep it fully in English inside parentheses.",
      ]
    : [
        "Latest user message language: English.",
        "Respond only in natural English.",
        "Do not switch to Bangla unless the user explicitly asks for Bangla or translation.",
        "Do not transliterate Bangla into Latin letters for an English query.",
        "Do not mix partial Bangla words into an English sentence.",
      ];

  prompt += `\n\nResponse language rules:\n- ${languageDirective.join("\n- ")}`;
  prompt += "\n\nFormatting rules:\n- Keep technical terms precise, modern, and academically professional.\n- For Bangla explanations, keep the explanation natural in Bangla, but include the English technical term in parentheses on first mention when helpful.\n- Do not output raw Markdown code fences unless the user explicitly asks for code.\n- Do not output raw LaTeX or TeX markup.\n- For equations, use plain readable scientific notation with symbols like ×, →, Δ, °, and proper subscripts or superscripts when useful.\n- For chemistry, prefer balanced reactions and proper molecular or ionic notation.\n- For biology, keep process names, molecule names, and scientific terms accurate and easy to scan.\n- For comparisons in compact chat UI, prefer bullets over wide tables.";

  if (userContext) {
    const contextParts: string[] = [];
    if (userContext.classLevel) contextParts.push(`Academic level: ${userContext.classLevel}`);
    if (userContext.department) contextParts.push(`Department: ${userContext.department}`);
    if (userContext.board) contextParts.push(`Board or curriculum: ${userContext.board}`);
    if (userContext.subjectContext) contextParts.push(`Current subject: ${userContext.subjectContext}`);

    if (contextParts.length > 0) {
      prompt += `\n\nStudent context:\n- ${contextParts.join("\n- ")}`;
      prompt += "\nTailor explanations to this profile when it improves the answer.";
    }
  }

  return prompt;
}

async function* streamOpenAI(
  messages: ChatMessage[],
  systemPrompt: string,
  model: string,
  maxTokens: number,
): AsyncGenerator<string> {
  const client = createOpenAIClient();
  const openaiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const stream = await client.chat.completions.create(
    IS_OPENROUTER
      ? {
          model,
          messages: openaiMessages,
          max_tokens: maxTokens,
          temperature: 0.2,
          stream: true,
        }
      : {
          model,
          messages: openaiMessages,
          max_completion_tokens: maxTokens,
          temperature: 0.2,
          stream: true,
        },
  );

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

export interface StreamResult {
  provider: Exclude<AIProvider, "auto">;
  model: string;
  mode: Exclude<AIMode, "auto">;
  taskType: TaskType;
  routingReason: string;
  stream: AsyncGenerator<string>;
}

export async function streamAIResponse(
  messages: ChatMessage[],
  userContext?: {
    classLevel?: string;
    department?: string;
    board?: string;
    subjectContext?: string;
    chatLanguage?: string;
  },
  preferredProvider?: AIProvider,
): Promise<StreamResult> {
  const taskType = detectTaskType(messages);
  const complex = isComplexQuery(messages);
  const concise = isConciseRequest(messages);
  const responseLanguage = detectResponseLanguage(messages, userContext);
  const route = selectRouteDecision(taskType, complex, concise, preferredProvider);
  const provider = getAvailableProviders().find((item) => item.id === route.provider);

  if (!provider || !provider.available) {
    throw new Error("AI provider is not configured");
  }

  const { model, maxTokens } = selectModel(provider, taskType, complex);
  const systemPrompt = buildSystemPrompt(route, responseLanguage, userContext);
  const stream = streamOpenAI(messages, systemPrompt, model, maxTokens);

  return {
    provider: route.provider,
    model,
    mode: route.mode,
    taskType,
    routingReason: route.routingReason,
    stream,
  };
}
