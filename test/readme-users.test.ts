/**
 * Run the user-creation commands from the README and extended walkthrough
 * against scratch databases. Their roles and limits must support the example.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { spawnChild } from "../app-test/child.ts";
import { childEnv } from "../app-test/child-env.ts";

const REPO = join(import.meta.dir, "..");
const README = readFileSync(join(REPO, "README.md"), "utf8");
const DOMAIN_SWAP = readFileSync(join(REPO, "docs", "DOMAIN-SWAP.md"), "utf8");
/** The FAQ moved out of the README into its own page, one H2 per question (#58). */
const FAQ = readFileSync(join(REPO, "docs", "faq.md"), "utf8");
const ACCOUNTS_QUESTION = "Do my users need Arcade accounts?";

/** Who needs an Arcade account, and why, moved out of the README into its own page (#55). */
const ACCOUNTS_PAGE = "docs/app-users-and-arcade-accounts.md";
/** The same page linked from `docs/faq.md`, its neighbour. */
const ACCOUNTS_LINK_FROM_DOCS = "[`app-users-and-arcade-accounts.md`](./app-users-and-arcade-accounts.md)";
const SLACK_PAGE = "https://docs.arcade.dev/en/references/auth-providers/slack";

const ADD_STEP = "6. **Add yourself and an approver**";
const ASK_STEP = "7. **Open Studio**";

const scratch = mkdtempSync(join(tmpdir(), "cg-readme-users-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** The text under one H2, up to the next H2. */
function section(markdown: string, title: string): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line === `## ${title}`);
  if (start === -1) return "";
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
}

/** The Quickstart's add step, up to the step after it. */
function addStep(markdown: string): string {
  const quickstart = section(markdown, "Quickstart 🚀");
  const start = quickstart.indexOf(ADD_STEP);
  const end = quickstart.indexOf(ASK_STEP);
  return start === -1 || end === -1 || end < start ? "" : quickstart.slice(start, end);
}

/** Every backticked `bun run users add …` in the text, as argv after `users`. */
function addCommands(text: string): string[][] {
  return [...text.matchAll(/`bun run users (add [^`]+)`/g)].map((match) => match[1]!.trim().split(/\s+/));
}

/** The placeholders filled in with a different address each, as a reader would. */
function filled(argv: string[], index: number): string[] {
  return argv.map((arg) => (/^<[\w-]*email>$/.test(arg) ? `reader-${index}@example.test` : arg));
}

function flag(argv: string[], name: string): string | undefined {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? undefined : argv[at + 1];
}

/** Whether the loan officer is refused the $95K and the approver may grant it: act 2, as the user setup step sets it up. */
function coversTheAct(commands: string[][]): boolean {
  const [officer, approver] = commands.map((argv) => Number(flag(argv, "clearance")));
  return officer! < 95_000 && approver! >= 95_000;
}

/** The README with the user setup step moved after step 8, the order in which nobody can sign in. */
function addStepAfterAsk(markdown: string): string {
  const start = markdown.indexOf(ADD_STEP);
  const ask = markdown.indexOf(ASK_STEP);
  const end = markdown.indexOf("\n## ", ask);
  return markdown.slice(0, start) + markdown.slice(ask, end) + markdown.slice(start, ask) + markdown.slice(end);
}

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

async function users(dir: string, args: string[]): Promise<Run> {
  const child = spawnChild(["bun", "--no-env-file", "scripts/users.ts", ...args], {
    cwd: REPO,
    env: childEnv({ IDP_DB_PATH: join(dir, "idp.db"), GOVERNANCE_DB_PATH: join(dir, "governance.db") }),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { code, stdout, stderr };
}

/** Runs every command against one fresh pair of databases; the failures, by command. */
async function runAll(commands: string[][]): Promise<{ failures: string[]; list: string }> {
  const dir = mkdtempSync(join(scratch, "case-"));
  const failures: string[] = [];
  for (const [i, argv] of commands.entries()) {
    const run = await users(dir, filled(argv, i));
    if (run.code !== 0) failures.push(`users ${argv.join(" ")} exited ${run.code}: ${run.stderr.trim()}`);
  }
  const list = await users(dir, ["list"]);
  return { failures, list: list.stdout };
}

describe("the README's users commands", () => {
  const step = addStep(README);
  const quickstartAdds = addCommands(step);
  const tryItOutAdds = addCommands(section(readFileSync(join(REPO, "docs/setup.md"), "utf8"), "Try it out"));

  test("the user setup step adds a loan officer and a VP, right before the app is opened", () => {
    expect(step).not.toBe("");
    expect(quickstartAdds.map((argv) => flag(argv, "role"))).toEqual(["loan_officer", "vp_credit"]);
    const quickstart = section(README, "Quickstart 🚀");
    expect(quickstart.indexOf(ADD_STEP)).toBeLessThan(quickstart.indexOf(ASK_STEP));
  });

  test("the loan officer's clearance is under $95K and the approver's covers it", () => {
    expect(coversTheAct(quickstartAdds)).toBe(true);
  });

  test("prerequisites explain Slack identities and Arcade membership", () => {
    const prerequisites = section(README, "Prerequisites");
    expect(prerequisites).toContain("Slack email addresses");
    expect(prerequisites).toContain("invite the requesting officer to your Arcade project");
    expect(prerequisites).toContain(`](https://github.com/mastra-ai/template-arcade/blob/main/${ACCOUNTS_PAGE})`);
  });

  test("the extended walkthrough adds Bob and Michael, with the demo's roles", () => {
    expect(tryItOutAdds.map((argv) => [flag(argv, "name"), flag(argv, "role")])).toEqual([
      ["Bob", "credit_analyst"],
      ["Michael", "chief_credit_officer"],
    ]);
  });

  test("every one of them runs as written, and adds who it says", async () => {
    const commands = [...quickstartAdds, ...tryItOutAdds];
    expect(commands).toHaveLength(4);
    const { failures, list } = await runAll(commands);
    expect(failures).toEqual([]);
    const rows = list.split("\n").filter((line) => line.startsWith("reader-"));
    expect(rows.map((row) => row.split(/\s{2,}/).slice(1, 4))).toEqual([
      ["Alice", "loan_officer", "50000"],
      ["Charlie", "vp_credit", "250000"],
      ["Bob", "credit_analyst", "0"],
      ["Michael", "chief_credit_officer", "5000000"],
    ]);
  }, 60_000);
});

/** The FAQ's answer to who needs an Arcade account: the text under its H2 in `docs/faq.md`. */
function accountsAnswer(faq: string): string {
  return section(faq, ACCOUNTS_QUESTION);
}

describe("the FAQ the docs point at", () => {
  test("docs/faq.md answers it, and DOMAIN-SWAP links to that answer rather than repeating it", () => {
    const entry = accountsAnswer(FAQ);
    expect(entry).toContain("With Arcade's built-in Slack app, the default, each loan officer who requests an approval has to be invited");
    expect(entry).toContain("With your own Slack app");
    expect(entry).toContain(ACCOUNTS_LINK_FROM_DOCS);
    expect(DOMAIN_SWAP).toContain("[Do my users need Arcade accounts?](./faq.md#do-my-users-need-arcade-accounts)");
    expect(DOMAIN_SWAP).not.toContain("each loan officer who requests an approval has to be invited");
  });

  test("the README keeps no FAQ of its own, and links the page from Further reading", () => {
    expect(section(README, "FAQ")).toBe("");
    expect(section(README, "Further reading")).toContain("](https://github.com/mastra-ai/template-arcade/blob/main/docs/faq.md)");
  });
});

/** The ways the accounts page falls short of answering the question: each one a thing a reader would miss. */
function accountsPageGaps(page: string): string[] {
  const gaps: string[] = [];
  if (!page.startsWith("# Do your app's users need Arcade accounts?\n")) gaps.push("the question as its title");
  if (!page.includes(`](${SLACK_PAGE})`)) gaps.push("a link to Arcade's Slack auth provider page");
  for (const heading of ["## Why", "## Route 1: Arcade's built-in Slack app", "## Route 2: your own Slack app"])
    if (!page.split("\n").includes(heading)) gaps.push(heading);
  return gaps;
}

describe("the page on who needs an Arcade account", () => {
  const path = join(REPO, ACCOUNTS_PAGE);

  test("exists, answers the question for both routes, and links Arcade's Slack page", () => {
    expect(existsSync(path)).toBe(true);
    expect(accountsPageGaps(readFileSync(path, "utf8"))).toEqual([]);
  });

  test("the README and FAQ link to the account requirements", () => {
    expect(section(README, "Prerequisites")).toContain(`](https://github.com/mastra-ai/template-arcade/blob/main/${ACCOUNTS_PAGE})`);
    expect(accountsAnswer(FAQ)).toContain(ACCOUNTS_LINK_FROM_DOCS);
  });

  test("the check bites on a page with the Slack link or a route missing", () => {
    const page = readFileSync(path, "utf8");
    expect(accountsPageGaps(page.replaceAll(SLACK_PAGE, "https://example.com/slack"))).toEqual([
      "a link to Arcade's Slack auth provider page",
    ]);
    expect(accountsPageGaps(page.replace("## Route 2: your own Slack app", "## Your own Slack app"))).toEqual([
      "## Route 2: your own Slack app",
    ]);
  });
});

describe("the checks bite on a planted violation", () => {
  test("a role the policy does not know, and a clearance the role needs left out", async () => {
    const planted = addCommands(addStep(README.replace("--role vp_credit", "--role vp").replace("--clearance 50000", "")));
    const { failures } = await runAll(planted);
    expect(failures).toHaveLength(2);
    expect(failures[0]).toContain("--clearance is required for role loan_officer");
    expect(failures[1]).toContain('role "vp" is not one the policy knows');
  }, 60_000);

  test("an approver whose clearance does not cover the $95K, and a loan officer whose does", () => {
    expect(coversTheAct(addCommands(addStep(README.replace("--clearance 250000", "--clearance 90000"))))).toBe(false);
    expect(coversTheAct(addCommands(addStep(README.replace("--clearance 50000", "--clearance 100000"))))).toBe(false);
  });

  test("the FAQ's answer without the route that needs no Arcade account, or under a renamed question", () => {
    const entry = accountsAnswer(FAQ);
    expect(accountsAnswer(FAQ.replace(entry, entry.replace("With your own Slack app", "With a Slack app")))).not.toContain("With your own Slack app");
    expect(accountsAnswer(FAQ.replace(`## ${ACCOUNTS_QUESTION}`, "## Arcade accounts"))).toBe("");
  });

  test("the add step moved after the step that opens the app", () => {
    const planted = addStepAfterAsk(README);
    expect(planted.length).toBe(README.length);
    expect(addStep(planted)).toBe("");
  });
});
