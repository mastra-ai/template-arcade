/**
 * Shared agent for the web chat and Mastra Studio.
 * Arcade hooks enforce permissions and supply remediation when a call is denied.
 * See docs/agent-design-history.md for the design rationale and review history.
 */
import { Agent } from "@mastra/core/agent";
import { createAnthropic } from "@ai-sdk/anthropic";

/** Role and reporting instructions; permission and escalation rules live in Arcade hooks. */
export const INSTRUCTIONS = [
  "You are a loan operations assistant inside a commercial bank's loan origination system.",
  "",
  "You act for the loan officer you are talking to. They are signed in, and every tool call you",
  "make is made as them.",
  "",
  "Your tools read and write the bank's loan book: search it, read one application in full,",
  "and record an approval or a denial on one.",
  "",
  "People name an application the way colleagues do — by amount, by borrower, by what is",
  "outstanding — and rarely by its ID. Search for it rather than asking them to look the ID up.",
  "If more than one matches, say which ones.",
  "",
  "Report what each tool gave you, quoting its own words rather than paraphrasing them.",
].join("\n");

export interface ModelOptions {
  /** `MODEL_ID` — `claude-sonnet-5`. Kept in the environment so it can be swapped without a change here. */
  modelId: string;
  /** `ANTHROPIC_API_KEY`. */
  apiKey: string;
  /**
   * The `fetch` the provider makes its HTTP calls with. Unset in the product,
   * which is the whole point of it being here: #16 has to prove that a redacted
   * field is absent from **the request body that leaves this process**, and the
   * only honest place to read that is the socket. A test passes a wrapper that
   * records the body and delegates; reading the code instead, or reading the
   * rendered chat, would be assuming.
   */
  fetch?: typeof globalThis.fetch;
}

/**
 * The language model, or a caller-supplied one.
 *
 * The seam exists for one reason: a suite has to be able to drive the whole
 * governed chain — real control plane, real loan book, real MCP transport —
 * on a machine with no Anthropic key, and separately to drive it with the real
 * model when there is one. Everything downstream of the model is identical in
 * both cases, which is what makes the cheap run worth running.
 */
export type ModelLike = Parameters<typeof buildAgent>[0]["model"];

export function anthropicModel(options: ModelOptions) {
  // `createAnthropic` rather than the default `anthropic` export: the default
  // reads `ANTHROPIC_API_KEY` off `process.env` at call time, and this service
  // reads its environment in exactly one place (`lib/config.ts`).
  return createAnthropic({
    apiKey: options.apiKey,
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  })(options.modelId);
}

/** Stable across turns and processes, so a trace names the same agent every time. */
export const AGENT_ID = "loan-operations";

/** Temperature 0, on every run. `DESIGN.md` → Model. */
export const TEMPERATURE = 0;

/** A toolset, or the function that resolves one when the agent is asked for it (Studio). */
export type AgentTools = Record<string, unknown> | (() => Promise<Record<string, unknown>>);

/** A Mastra memory, or the function that resolves one when the agent is asked for it (Studio). */
export type AgentMemory = NonNullable<ConstructorParameters<typeof Agent>[0]["memory"]>;

/**
 * `memory` is Studio's alone (#36). The chat route passes none: the browser
 * sends its own history with every request (`conversation.ts`), and a memory
 * on top of it would hand the model every earlier message twice.
 */
export function buildAgent(options: {
  model: ConstructorParameters<typeof Agent>[0]["model"];
  tools: AgentTools;
  instructions?: string;
  memory?: AgentMemory;
}): Agent {
  return new Agent({
    id: AGENT_ID,
    name: "Loan Operations Assistant",
    description:
      "Search loan applications and request decisions through Arcade's approval controls. " +
      "In Studio, first open /arcade/authorize on the Studio server and sign in. " +
      'With the demo users seeded, sign in as Alice and try: "Approve loan LN-2291 for $95,000." ' +
      "Alice's limit is $50,000, so the approval requires escalation to an authorized approver.",
    instructions: options.instructions ?? INSTRUCTIONS,
    model: options.model,
    // `exactOptionalPropertyTypes` is on, so the cast has to drop `undefined`
    // rather than widen to it: an optional property may be absent, but it may
    // not be present and undefined.
    tools: options.tools as NonNullable<ConstructorParameters<typeof Agent>[0]["tools"]>,
    ...(options.memory === undefined ? {} : { memory: options.memory }),
    defaultOptions: { modelSettings: { temperature: TEMPERATURE } },
  });
}
