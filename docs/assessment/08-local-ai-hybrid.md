# 08 — Local AI Execution & Hybrid Architecture

Multiple users objected to sending financial data to cloud APIs. This document answers what
can run locally today, and designs the hybrid local/cloud mode.

## Feasibility audit — what already runs without the cloud

The codebase is unusually well-positioned for local mode, because the "ML" layer was
deliberately duplicated into plain TypeScript:

| Capability | Offline today? | Evidence |
|------------|:--------------:|----------|
| Archetype classification | **Yes** | `lib/ml/classify.ts` runs inline in the Next.js process when `ML_MODE=inline` (default without `RENDER_ML_BASE_URL` — `lib/ml/runInline.ts` L6–11) |
| Burn rate / runway | **Yes** | `lib/ml/burnRate.ts` inline |
| canIAfford what-if | **Yes** | `lib/ml/canIAfford.ts` inline |
| CSV parsing + categorization | **Yes** | `lib/csv/parseBankCsv.ts` — even runs in the browser in demo mode |
| Benchmarks | **Yes** | Static JSON + local math |
| DECIDE chat | **Partially** | Without `GROQ_API_KEY`, `fallbackDecide` (regex intent parsing + real tool call) answers offline — degraded language, honest numbers |
| DECIDE natural-language quality | No | Groq (cloud) |
| Voice narration | No | ElevenLabs (cloud); voice *input* is the browser API |
| Exa price hints | No | Cloud, already optional |
| Persistence | Yes with local Postgres/SQLite; demo mode needs nothing | `DATABASE_URL` optional by design |

**Conclusion: the whole deterministic product runs completely offline already.** Only
natural-language chat, TTS, and price grounding are cloud-bound — and all three are already
optional, key-gated, and have fallbacks or degrade gracefully. What's missing is a *local LLM
option* and a *user-facing mode switch*.

## Local LLM integration (Ollama / LM Studio)

Both Ollama (`http://localhost:11434/v1`) and LM Studio (`http://localhost:1234/v1`) expose
OpenAI-compatible chat-completions APIs **with tool-calling support** — the same
tools/function-call shape the DECIDE route already uses via `groq-sdk` (which is itself
OpenAI-shaped).

### Provider abstraction (the one refactor required)

Extract LLM calls in `app/api/decide/route.ts` behind a provider interface:

```typescript
// lib/llm/provider.ts
export interface ChatProvider {
  chat(req: { messages: Message[]; tools?: Tool[]; toolChoice?: string }): Promise<ChatResult>;
  name: "groq" | "ollama" | "lmstudio" | "none";
}
```

- `groqProvider` — current behavior, unchanged.
- `openAICompatProvider(baseUrl, model)` — covers Ollama and LM Studio with one
  implementation (the `groq-sdk` can even be pointed at a custom `baseURL`, so this can be a
  config change rather than a new client).
- `noneProvider` — routes to the existing `fallbackDecide`.

Selection: env (`LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL`) for self-hosters, plus a
per-user setting for the hosted product. Recommended local models: Llama 3.1 8B / Qwen 2.5 7B
instruct variants — the DECIDE task (intent extraction + one tool call + short narration) is
well within small-model capability; the critic pass matters more locally and should stay on.

### Local embeddings & inference for the ML roadmap

- The planned transaction classifier ([05](05-ai-ml-audit.md)) should default to local
  inference: a small sentence-embedding model via Ollama's `/api/embeddings` or
  `transformers.js` (WASM/WebGPU, runs in the browser — pairs with the browser-side CSV parse
  so narrations never leave the device even in cloud mode).
- Archetype/burn math stays pure TS — no model runtime needed.

## Hybrid architecture — user-selectable modes

```mermaid
flowchart LR
    subgraph client [Device / self-hosted]
        ui[Next.js UI]
        parse[CSV parse + categorize]
        math[Deterministic math lib/ml]
        localdb[(Local DB / localStorage)]
        ollama[Ollama or LM Studio]
    end
    subgraph cloud [Cloud (optional)]
        groq[Groq LLM]
        eleven[ElevenLabs TTS]
        exa[Exa search]
        pg[(Hosted Postgres)]
    end
    ui --> parse --> math
    math --> localdb
    ui -- "local-only mode" --> ollama
    ui -- "cloud mode (spine summary only)" --> groq
    ui -.optional.-> eleven
    ui -.optional.-> exa
    localdb -. "cloud mode sync" .-> pg
```

### Mode definitions

| | **Local-only mode** | **Cloud mode (default)** |
|---|---|---|
| Math/analytics | Inline TS (already default) | Inline TS or Render service |
| Chat LLM | Ollama/LM Studio if detected, else deterministic fallback | Groq |
| Data sent off-device | **Nothing** | Spine summary only (income, burn, archetype, goal — never transaction rows; current behavior) |
| Persistence | localStorage or local SQLite/Postgres | Hosted Postgres, descriptions encrypted |
| Voice narration / Exa | Disabled (or local TTS later) | Optional, keyed |
| Distribution | Self-host (`docker compose up`: Next.js + Ollama) or the PWA/desktop wrapper | Vercel-hosted |

### Implementation steps

1. Provider abstraction + `LLM_PROVIDER` env selection (small, contained refactor of the
   decide route; fallback path already exists as the safety net).
2. Settings surface: "Privacy mode" toggle (Local-only / Cloud) persisted per user; in
   local-only, the server refuses to call any cloud API even if keys are configured.
3. Local endpoint autodetect + health check (ping `LLM_BASE_URL/models`), with a clear status
   indicator in the chat UI ("answers generated on this machine").
4. Self-host recipe: `docker-compose.yml` (Next.js + Postgres + Ollama with a pulled model) +
   docs — this is also the credible answer to "why should I trust you": *you don't have to*.
5. Later: `transformers.js` browser embeddings for classification; local TTS (e.g. Piper) if
   narration matters in local mode.

### Trust payoff

This converts the top criticism into the differentiator: CRED/GPay/PhonePe structurally cannot
offer a local-only mode — their business model requires server-side data. FORE can make
"your statement never leaves your machine" a product tier, not a promise.
