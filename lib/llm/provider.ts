import Groq from "groq-sdk";

export type LlmProvider = "groq" | "ollama" | "lmstudio";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
}

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionResult {
  content: string | null;
  tool_calls?: {
    id: string;
    function: { name: string; arguments: string };
  }[];
}

function resolveProvider(): LlmProvider {
  const p = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  if (p === "ollama" || p === "lmstudio") return p;
  return "groq";
}

function openAiBaseUrl(): string {
  if (resolveProvider() === "lmstudio") {
    return (process.env.LMSTUDIO_BASE_URL || "http://127.0.0.1:1234").replace(/\/$/, "");
  }
  return (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
}

async function openAiCompatibleChat(opts: {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  temperature?: number;
}): Promise<ChatCompletionResult> {
  const res = await fetch(`${openAiBaseUrl()}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      tools: opts.tools,
      temperature: opts.temperature ?? 0.2,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: { message: ChatCompletionResult }[];
  };
  return data.choices[0]?.message ?? { content: null };
}

export async function chatCompletion(opts: {
  messages: ChatMessage[];
  tools?: ToolDef[];
  temperature?: number;
  model?: string;
}): Promise<ChatCompletionResult> {
  const provider = resolveProvider();
  const model =
    opts.model ||
    process.env.GROQ_MODEL ||
    (provider === "ollama" ? "llama3.1" : "llama-3.1-8b-instant");

  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) throw new Error("GROQ_API_KEY not set");
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model,
      messages: opts.messages as Groq.Chat.ChatCompletionMessageParam[],
      tools: opts.tools as Parameters<typeof groq.chat.completions.create>[0]["tools"],
      tool_choice: opts.tools?.length ? "auto" : undefined,
      temperature: opts.temperature ?? 0.2,
    });
    const msg = completion.choices[0]?.message;
    return {
      content: msg?.content ?? null,
      tool_calls: msg?.tool_calls?.map((tc) => ({
        id: tc.id,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    };
  }

  return openAiCompatibleChat({ model, ...opts });
}

export function llmProviderName(): LlmProvider {
  return resolveProvider();
}
