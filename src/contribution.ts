import { mkdirSync, writeFileSync } from "fs";
import { spawnSync } from "child_process";

const SYSTEM_PROMPT = `You are a code review analyst reviewing a preprocessed AI coding session transcript.

Your job is to produce an Agent Contribution Report that makes the change immediately understandable to someone who consumes the library, app, or service — without them needing to read any code or implementation details.

A session may contain one or more user stories. Identify them by grouping related changes around a shared piece of consumer value.

Skip mechanical housekeeping that has no consumer impact: git commits, version bumps, pushes, PR creation, package publishes, and environment/tooling setup unless the tooling change is itself the deliverable the user asked for.

Rules for the Before/After section:
- First identify what kind of interface the consumer uses. This determines your visual language:
  - **Library / SDK**: show code the consumer writes against the public API. Never show internal implementation files.
  - **REST / GraphQL API**: show HTTP requests and responses (curl or fetch style).
  - **VS Code extension**: show ASCII UI mockups of panels/dialogs, keyboard shortcuts, and command palette entries. No internal source code.
  - **Web app / UI**: show ASCII mockups of screens or step-by-step user flows. No internal source code.
  - **CLI tool**: show terminal session examples with commands and output.
- Use Mermaid diagrams when a *flow* or *sequence* changed — steps removed, data moving differently, a new interaction pattern. Keep them to 5-7 nodes.
- Combine formats if needed (e.g. ASCII mockup + Mermaid flow for a UI change that also changes a process).
- Never show internal implementation code (build scripts, internal functions, private modules) — only what the consumer directly touches.
- Never describe the change in prose alone when a visual would be clearer.
- The before/after must be self-contained — a reviewer should understand the impact without reading anything else.

Rules for the report sections:
- References: list only files directly read or edited during the session. Use paths relative to the repo root. These should be markdown links so reviewers can navigate directly to the file.
- Assumptions, decisions, discussions: flat bullet lists, one line each. No elaboration unless essential.
- Discussions: only moments where Claude changed its mind mid-task. Omit section if none.
- Testing: what was actually run or verified. Be honest — "Not tested" if nothing was run.

Output format (strict markdown):

# Agent Contribution Report

## [User story title — written as consumer value, e.g. "Type component children without leaving the Rask namespace"]

### 🔴 Current behavior
[code block or Mermaid diagram showing the consumer experience before]

### 🟢 New behavior
[code block or Mermaid diagram showing the consumer experience after]

### 🤔 Assumptions
- [one line]

### 🧠 Decisions
- [one line]

### 🔄 Discussions
- [one line, only if direction changed mid-session — omit section if none]

### 🧪 Testing
- [what was verified, or "Not tested — no test runs observed"]

### 📁 References
- [relative/path/to/file.ts](relative/path/to/file.ts)

---

[Repeat full block per user story]`;

function getCurrentBranch(): string {
  const result = spawnSync("git", ["branch", "--show-current"], { encoding: "utf-8" });
  return result.stdout?.trim() || "main";
}

export async function runContribution(sessionFile: string, save: boolean): Promise<void> {
  const { readFileSync } = await import("fs");
  const { preprocessSession, formatEvents } = await import("./preprocessor");

  let raw: string;
  try {
    raw = readFileSync(sessionFile, "utf-8");
  } catch {
    console.error(`Could not read session file: ${sessionFile}`);
    process.exit(1);
  }

  const events = preprocessSession(raw);
  const preprocessed = formatEvents(events);

  console.error(`Analyzing session → ${events.length} events after preprocessing`);

  const result = spawnSync(
    "claude",
    [
      "--print",
      "--system-prompt",
      SYSTEM_PROMPT,
      "--allowedTools",
      "Read,Grep,Glob,Bash",
      "--permission-mode",
      "bypassPermissions",
      "--model",
      "sonnet",
      `Here is a preprocessed transcript of an AI coding session. Produce the Agent Contribution Report for it.\n\nSession transcript:\n---\n${preprocessed}\n---`,
    ],
    {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "inherit"],
    }
  );

  if (result.error) {
    console.error(`Failed to run claude: ${result.error.message}`);
    process.exit(1);
  }

  let output = result.stdout?.trim();
  if (!output) {
    console.error("No output from claude");
    process.exit(1);
  }

  const headerIndex = output.indexOf("# Agent Contribution Report");
  if (headerIndex > 0) output = output.slice(headerIndex);

  if (save) {
    const dest = `.agent-contributions/${getCurrentBranch()}.md`;
    mkdirSync(".agent-contributions", { recursive: true });
    writeFileSync(dest, output + "\n");
    console.error(`Written to ${dest}`);
  } else {
    process.stdout.write(output + "\n");
  }
}
