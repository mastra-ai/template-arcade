import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { brokenRelativeLinks, headings, links, section } from "./markdown.ts";

const REPO = join(import.meta.dir, "..");
const README = readFileSync(join(REPO, "README.md"), "utf8");
const ENV = readFileSync(join(REPO, ".env.example"), "utf8");
const SETUP = readFileSync(join(REPO, "docs/setup.md"), "utf8");
const variables = (text: string) => [...new Set(text.match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g) ?? [])];

describe("template README", () => {
  test("keeps the required sections in order, without a placeholder demo", () => {
    expect(headings(README).filter(({ level }) => level === 1).map(({ title }) => title)).toEqual([
      "Agent Action Governance with Arcade",
    ]);
    expect(headings(README).filter(({ level }) => level === 2).map(({ title }) => title)).toEqual([
      "Why we built this", "Prerequisites", "Quickstart 🚀", "Try it out",
      "Customization", "Further reading", "About Mastra templates",
    ]);
    expect(README).not.toContain("CLOUDINARY_DEMO_VIDEO_URL_REQUIRED");
    expect(README).not.toContain("—");
  });

  test("uses the canonical repository and executable setup commands", () => {
    const quickstart = section(README, "Quickstart 🚀");
    expect(quickstart).toContain("npx create-mastra@latest --template https://github.com/mastra-ai/template-arcade --no-install");
    expect(quickstart).toContain("cd loan-approval-limits");
    const commands = ["bun install", "cp .env.example .env", "bun run setup-arcade <APP_PUBLIC_HOST>", "bun run dev", "bun run users add", "bun run studio"];
    let previous = -1;
    for (const command of commands) {
      const position = quickstart.indexOf(command);
      expect(position).toBeGreaterThan(previous);
      previous = position;
    }
    expect(quickstart).not.toContain("git clone");
    for (const line of quickstart.split("\n").filter((line) => /^\S/.test(line))) {
      expect(line).toMatch(/^\d+\. \*\*[^*]+\*\*$/);
    }
  });

  test("documents the required environment and the current Studio agent", () => {
    expect(variables(section(README, "Quickstart 🚀"))).toEqual(expect.arrayContaining([
      "ANTHROPIC_API_KEY", "APP_PUBLIC_HOST", "ARCADE_API_KEY",
    ]));
    const known = new Set([...ENV.matchAll(/^#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]));
    expect(variables(README).filter((variable) => !known.has(variable))).toEqual([]);
    const agent = readFileSync(join(REPO, "lib/agent/agent.ts"), "utf8");
    const name = /name: "([^"]+)"/.exec(agent)?.[1];
    expect(name).toBeDefined();
    expect(section(README, "Quickstart 🚀")).toContain(`**${name}**`);
  });

  test("links to the full setup and keeps its dashboard fallback available", () => {
    expect(links(README)).toContain("https://github.com/mastra-ai/template-arcade/blob/main/docs/setup.md#quickstart-");
    for (const phrase of ["fill in the User Source form", "fill in the gateway form", "Run `bun run setup-arcade <APP_PUBLIC_HOST>` again"]) {
      expect(SETUP).toContain(phrase);
    }
    // The website embeds this README, so repository links must work off GitHub too.
    expect(links(README).filter((target) => target.startsWith("./"))).toEqual([]);
    const localLinks = README.replaceAll("https://github.com/mastra-ai/template-arcade/blob/main/", "./");
    expect(brokenRelativeLinks(localLinks, join(REPO, "README.md"))).toEqual([]);
    expect(brokenRelativeLinks(SETUP, join(REPO, "docs/setup.md"))).toEqual([]);
  });

  test("attributes the partnership and points contributions at the current repository", () => {
    const about = section(README, "About Mastra templates");
    expect(about).toContain("This partnership template was contributed by Arcade");
    expect(links(about)).toContain("https://github.com/mastra-ai/template-arcade");
    expect(about).not.toMatch(/monorepo|synchroni[sz]/i);
  });
});
