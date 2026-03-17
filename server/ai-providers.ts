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

function createOpenAIClient() {
  if (!OPENAI_API_KEY) {
    throw new Error("AI provider is not configured");
  }

  return new OpenAI({
    apiKey: OPENAI_API_KEY,
    ...(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && {
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    }),
  });
}

export function getAvailableProviders(): ProviderConfig[] {
  const available = Boolean(OPENAI_API_KEY);

  return [
    {
      id: "orbitquick",
      mode: "fast",
      name: "Fast",
      available,
      models: { fast: "gpt-4o-mini", deep: "gpt-4o-mini" },
      strengths: ["general", "creative", "summary", "code"],
    },
    {
      id: "orbitdeep",
      mode: "think",
      name: "Think",
      available,
      models: { fast: "gpt-4o-mini", deep: "gpt-4o" },
      strengths: ["reasoning", "research", "code"],
    },
    {
      id: "studyexpert",
      mode: "expert",
      name: "Study Expert",
      available,
      models: { fast: "gpt-4o-mini", deep: "gpt-4o" },
      strengths: ["academic", "math", "summary"],
    },
  ];
}

const SIMPLE_PATTERNS = [
  /^(what is|define|meaning of)\b/i,
  /^(who|when|where|which|how many)\b/i,
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
  "study",
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

  if (RESEARCH_KEYWORDS.some((keyword) => content.includes(keyword.toLowerCase()))) {
    return "research";
  }

  if (content.includes("summary") || content.includes("summarize")) {
    return "summary";
  }

  if (COMPLEX_KEYWORDS.some((keyword) => content.includes(keyword.toLowerCase()))) {
    return "academic";
  }

  if (messages.length > 4) return "reasoning";
  return "general";
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

function pickAvailableProvider(id: AIProvider) {
  if (id === "auto") return undefined;
  return getAvailableProviders().find((provider) => provider.id === id && provider.available);
}

function selectRouteDecision(
  taskType: TaskType,
  complex: boolean,
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

  if (taskType === "math" || taskType === "academic") {
    return { provider: "studyexpert", mode: "expert", routingReason: "study-task" };
  }

  if (taskType === "research" || taskType === "reasoning" || complex) {
    return { provider: "orbitdeep", mode: "think", routingReason: "deep-reasoning" };
  }

  return { provider: "orbitquick", mode: "fast", routingReason: "fast-response" };
}

function selectModel(
  provider: ProviderConfig,
  taskType: TaskType,
  complex: boolean,
): { model: string; maxTokens: number } {
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
- Give direct answers first. Use short bullet points only when helpful.
- Do not over-explain simple questions.
- If the request needs deep reasoning, still help, but keep the structure tight and readable.`,

  orbitdeep: `You are Study Orbit Think mode, a careful reasoning assistant.

Rules:
- Detect the user's language and reply in that same language.
- If the user writes in Bangla, respond in clear, formal academic Bangla.
- Use structure: headings, steps, comparisons, and examples when useful.
- Show reasoning clearly for analysis, research, and difficult study questions.
- If information is uncertain, say so instead of inventing details.`,

  studyexpert: `You are Study Orbit Study Expert mode, a structured academic tutor focused on student-friendly, exam-ready help.

Rules:
- Detect the user's language and reply in that same language.
- If the user writes in Bangla, respond in clear, formal academic Bangla.
- Prioritize study clarity, exam readiness, and curriculum-friendly explanations.
- For math or technical questions, show steps cleanly.
- For long answers, use sections such as definition, explanation, examples, key points, and practice guidance when relevant.
- Keep the tone professional, supportive, and academically precise.`,
};

function buildSystemPrompt(
  route: RouteDecision,
  userContext?: {
    classLevel?: string;
    department?: string;
    board?: string;
    subjectContext?: string;
    chatLanguage?: string;
  },
): string {
  let prompt = SYSTEM_PROMPTS[route.provider];

  if (userContext) {
    const contextParts: string[] = [];
    if (userContext.classLevel) contextParts.push(`Academic level: ${userContext.classLevel}`);
    if (userContext.department) contextParts.push(`Department: ${userContext.department}`);
    if (userContext.board) contextParts.push(`Board or curriculum: ${userContext.board}`);
    if (userContext.subjectContext) contextParts.push(`Current subject: ${userContext.subjectContext}`);
    if (userContext.chatLanguage && userContext.chatLanguage !== "auto") {
      contextParts.push(`Preferred chat language: ${userContext.chatLanguage}`);
    }

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

  const stream = await client.chat.completions.create({
    model,
    messages: openaiMessages,
    max_completion_tokens: maxTokens,
    stream: true,
  });

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
  const route = selectRouteDecision(taskType, complex, preferredProvider);
  const provider = getAvailableProviders().find((item) => item.id === route.provider);

  if (!provider || !provider.available) {
    throw new Error("AI provider is not configured");
  }

  const { model, maxTokens } = selectModel(provider, taskType, complex);
  const systemPrompt = buildSystemPrompt(route, userContext);
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
