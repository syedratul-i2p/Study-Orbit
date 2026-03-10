import OpenAI from "openai";

export type AIProvider = "auto" | "orbitquick" | "orbitdeep" | "studyexpert";
export type TaskType = "general" | "academic" | "reasoning" | "research" | "summary" | "creative" | "code" | "math";

export interface ProviderConfig {
  id: AIProvider;
  name: string;
  available: boolean;
  models: { fast: string; deep: string };
  strengths: TaskType[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  ...(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && {
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  }),
});

export function getAvailableProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [
    {
      id: "orbitquick",
      name: "Orbit Quick ⚡",
      available: !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
      models: { fast: "gpt-4o-mini", deep: "gpt-4o-mini" },
      strengths: ["general", "creative", "code", "summary"],
    },
    {
      id: "orbitdeep",
      name: "Orbit Deep 🧠",
      available: !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
      models: { fast: "gpt-4o", deep: "gpt-4o" },
      strengths: ["reasoning", "research"],
    },
    {
      id: "studyexpert",
      name: "Study Expert 📚",
      available: !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
      models: { fast: "gpt-4o-mini", deep: "gpt-4o" },
      strengths: ["academic", "math"],
    },
  ];
  return providers;
}

const SIMPLE_PATTERNS = [
  /^(what is|ki|কি|কে|কোন|কত|কবে|কেন|কোথায়|কিভাবে|define|meaning of)\b/i,
  /^(who|when|where|how many|which)\b/i,
];

const COMPLEX_KEYWORDS = [
  "explain", "ব্যাখ্যা", "বিশ্লেষণ", "analyze", "analysis", "compare", "তুলনা",
  "prove", "প্রমাণ", "derive", "derivation", "নির্ণয়", "সমাধান", "solve",
  "essay", "রচনা", "paragraph", "অনুচ্ছেদ", "describe in detail", "বিস্তারিত",
  "discuss", "আলোচনা", "evaluate", "মূল্যায়ন", "differentiate", "পার্থক্য",
  "advantages and disadvantages", "সুবিধা ও অসুবিধা", "cause and effect",
  "কারণ ও ফলাফল", "steps", "ধাপ", "procedure", "পদ্ধতি", "mechanism", "কৌশল",
  "theory", "তত্ত্ব", "theorem", "উপপাদ্য", "notes", "নোট",
  "exam answer", "পরীক্ষার উত্তর", "broad question", "রচনামূলক",
  "short note", "সংক্ষিপ্ত টীকা", "critical analysis", "সমালোচনা",
];

const MATH_KEYWORDS = [
  "calculate", "গণনা", "integral", "derivative", "সমীকরণ", "equation",
  "formula", "সূত্র", "algebra", "geometry", "জ্যামিতি", "trigonometry",
  "calculus", "matrix", "probability", "সম্ভাবনা", "statistics", "পরিসংখ্যান",
  "proof", "প্রমাণ", "theorem", "উপপাদ্য", "solve", "সমাধান",
  "+", "-", "×", "÷", "=", "∫", "∑", "√",
];

const RESEARCH_KEYWORDS = [
  "research", "গবেষণা", "literature", "সাহিত্য", "citation", "source",
  "reference", "তথ্যসূত্র", "journal", "paper", "study", "survey",
  "methodology", "পদ্ধতি",
];

const CODE_KEYWORDS = [
  "code", "কোড", "program", "প্রোগ্রাম", "function", "ফাংশন", "algorithm",
  "অ্যালগরিদম", "debug", "syntax", "compile", "html", "css", "javascript",
  "python", "java", "c++",
];

const ACADEMIC_KEYWORDS = [
  "mcq", "quiz", "chapter", "অধ্যায়", "পাঠ", "lesson", "textbook", "পাঠ্যবই",
  "nctb", "এনসিটিবি", "board", "বোর্ড", "ssc", "hsc", "এসএসসি", "এইচএসসি",
  "class", "ক্লাস", "subject", "বিষয়", "exam", "পরীক্ষা", "marks", "নম্বর",
  "suggestion", "সাজেশন", "model test", "revision", "রিভিশন",
];

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function detectTaskType(messages: ChatMessage[]): TaskType {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg) return "general";
  const content = lastMsg.content.toLowerCase();

  for (const kw of MATH_KEYWORDS) {
    if (content.includes(kw.toLowerCase())) return "math";
  }
  for (const kw of CODE_KEYWORDS) {
    if (content.includes(kw.toLowerCase())) return "code";
  }
  for (const kw of ACADEMIC_KEYWORDS) {
    if (content.includes(kw.toLowerCase())) return "academic";
  }
  for (const kw of RESEARCH_KEYWORDS) {
    if (content.includes(kw.toLowerCase())) return "research";
  }

  if (content.includes("summary") || content.includes("সারসংক্ষেপ") || content.includes("summarize")) return "summary";

  for (const kw of COMPLEX_KEYWORDS) {
    if (content.includes(kw.toLowerCase())) return "academic";
  }

  if (messages.length > 4) return "reasoning";
  return "general";
}

function isComplexQuery(messages: ChatMessage[]): boolean {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg) return false;
  const content = lastMsg.content;
  const lower = content.toLowerCase();

  for (const pat of SIMPLE_PATTERNS) {
    if (pat.test(lower) && content.length < 80) return false;
  }

  if (content.length < 40 && messages.length <= 2) return false;

  if (content.length > 120) return true;
  if (messages.length > 5) return true;
  for (const kw of COMPLEX_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return true;
  }
  return false;
}

function selectProvider(taskType: TaskType, complex: boolean, preferredProvider?: AIProvider): AIProvider {
  if (preferredProvider && preferredProvider !== "auto") {
    const providers = getAvailableProviders();
    const prov = providers.find(p => p.id === preferredProvider);
    if (prov?.available) return preferredProvider;
  }

  if (taskType === "academic" || taskType === "math") return "studyexpert";
  if (taskType === "reasoning" || taskType === "research") return "orbitdeep";
  if (complex) return "orbitdeep";
  return "orbitquick";
}

const ORBIT_QUICK_PROMPT = `You are Orbit Quick — the fast, friendly AI tutor inside Study Orbit. You give rapid, clear answers.

Rules:
- Detect input language (Bangla/English) and respond in the SAME language
- For simple questions (definitions, facts, "what is X"): give a direct 1-3 sentence answer — no extra formatting
- For slightly longer questions: use bullet points, keep it concise
- For Bangla: use শুদ্ধ বাংলা (formal academic Bangla)
- Be warm but efficient — students are studying and need quick help
- If a question needs a detailed answer, give a good summary and say "আরও বিস্তারিত জানতে Orbit Deep ব্যবহার করুন" or "For more detail, try Orbit Deep"`;

const ORBIT_DEEP_PROMPT = `You are Orbit Deep — the advanced reasoning AI tutor inside Study Orbit. You specialize in deep analysis, detailed explanations, and thorough academic answers.

Core rules:
- Detect input language and respond in the SAME language
- Use clear structure: headings (##), bullet points, numbered steps
- Give complete, thorough answers with examples
- For Bangla: use শুদ্ধ বাংলা with proper academic terminology

For concept/theory questions:
- **সংজ্ঞা / Definition**: Clear definition
- **ব্যাখ্যা / Explanation**: Thorough explanation with context
- **উদাহরণ / Example**: Practical examples
- **মূল পয়েন্ট / Key Points**: Essential takeaways

For comparison/analysis:
- Present multiple perspectives
- Use tables when comparing
- Draw clear conclusions

For math/technical:
- **দেওয়া আছে / Given**: What is provided
- **সূত্র / Formula**: Relevant formula(s)
- **ধাপসমূহ / Steps**: Step-by-step solution
- **চূড়ান্ত উত্তর / Final Answer**: Clear answer
- **সাধারণ ভুল / Common Mistakes**: What to avoid

Additional:
- Never fabricate information
- If unsure, say so clearly
- Adjust complexity to the student's level`;

const STUDY_EXPERT_FAST_PROMPT = `You are Study Expert — the specialized academic tutor inside Study Orbit, built specifically for Bangladeshi students (SSC, HSC, Honours, all boards). You give fast, exam-focused answers.

Your expertise:
- Bangladesh National Curriculum (NCTB textbooks)
- SSC/HSC exam patterns, marking schemes, board questions
- All 9 general boards + Madrasa + Technical
- University admission prep (Medical, Engineering, DU/JU/RU)

Rules:
- Detect input language (Bangla/English), respond in SAME language
- Give direct, exam-ready answers
- Include mark-distribution hints when relevant
- For Bangla: use শুদ্ধ বাংলা with proper academic terms
- For MCQ: give correct answer + brief explanation + 1-2 related facts
- For short questions: exam-format answer within expected word limit
- Always prioritize accuracy`;

const STUDY_EXPERT_DEEP_PROMPT = `You are Study Expert — the comprehensive academic tutor inside Study Orbit, specialized for the Bangladesh education system. You are an expert exam preparation specialist who creates board-exam-ready answers.

Your deep expertise:
- **NCTB Curriculum**: All subjects, Class 6 to Class 12
- **Board Exams**: SSC, HSC — all 9 general boards + Madrasa + Technical
- **University Admission**: Medical (MBBS), Engineering (BUET, RUET, CUET, KUET), University tests (DU, JU, RU, CU, KU)
- **Honours/Masters**: All major university subjects
- **Competitive Exams**: BCS, Bank, NTRCA, Primary teacher exams

For academic questions, structure responses as:

📝 **প্রশ্নের ধরন / Question Type**: (সংক্ষিপ্ত / রচনামূলক / MCQ / গাণিতিক)

📖 **উত্তর / Answer**:
Give proper exam-writing format. For রচনামূলক (broad) questions:
- ভূমিকা (Introduction)
- মূল আলোচনা (Main Discussion) — numbered points
- উদাহরণ (Examples)
- উপসংহার (Conclusion)

For MCQ/Short:
- Direct correct answer first
- Brief explanation
- Related facts for revision

🎯 **পরীক্ষার টিপস / Exam Tips**:
- Expected marks and time allocation
- Common mistakes to avoid
- Key terms examiners look for

🔄 **অনুশীলন / Practice**:
- 2-3 similar practice questions

Special rules:
- Match answer length to expected marks (5-mark ≈ 150-200 words)
- Use proper Bengali academic prose for Bangla answers
- Include mathematical notation with clear steps
- Reference NCTB textbook chapters when possible
- For science: include formulas in Bengali and English
- For humanities: include quotations, references, multiple perspectives
- Never fabricate information`;

function buildSystemPrompt(complex: boolean, userContext?: {
  classLevel?: string;
  department?: string;
  board?: string;
  subjectContext?: string;
  chatLanguage?: string;
}, providerId?: AIProvider): string {
  let systemPrompt: string;

  if (providerId === "studyexpert") {
    systemPrompt = complex ? STUDY_EXPERT_DEEP_PROMPT : STUDY_EXPERT_FAST_PROMPT;
  } else if (providerId === "orbitdeep") {
    systemPrompt = ORBIT_DEEP_PROMPT;
  } else {
    systemPrompt = ORBIT_QUICK_PROMPT;
  }

  if (userContext) {
    const contextParts: string[] = [];
    if (userContext.classLevel) contextParts.push(`Academic level: ${userContext.classLevel}`);
    if (userContext.department) contextParts.push(`Department/Stream: ${userContext.department}`);
    if (userContext.board) contextParts.push(`Board: ${userContext.board}`);
    if (userContext.subjectContext) contextParts.push(`Currently studying: ${userContext.subjectContext}`);
    if (userContext.chatLanguage && userContext.chatLanguage !== "auto") {
      const langName = userContext.chatLanguage === "bn" ? "বাংলা (Bangla)" : userContext.chatLanguage === "en" ? "English" : "Both Bangla and English (bilingual)";
      contextParts.push(`Preferred response language: ${langName}`);
    }

    if (contextParts.length > 0) {
      systemPrompt += `\n\n🎓 Student Profile:\n- ${contextParts.join("\n- ")}`;
      systemPrompt += `\n\nIMPORTANT: Tailor your response to this student's level, board, and subject. Use examples and references relevant to their curriculum.`;
    }
  }

  return systemPrompt;
}

async function* streamOpenAI(
  messages: ChatMessage[],
  systemPrompt: string,
  model: string,
  maxTokens: number,
): AsyncGenerator<string> {
  const openaiMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const stream = await openai.chat.completions.create({
    model,
    messages: openaiMessages,
    max_completion_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

export interface StreamResult {
  provider: AIProvider;
  model: string;
  taskType: TaskType;
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
  const providerId = selectProvider(taskType, complex, preferredProvider);

  const model = complex ? "gpt-4o" : "gpt-4o-mini";
  const maxTokens = complex ? 4096 : 1024;

  const systemPrompt = buildSystemPrompt(complex, userContext, providerId);
  const stream = streamOpenAI(messages, systemPrompt, model, maxTokens);

  return {
    provider: providerId,
    model,
    taskType,
    stream,
  };
}
