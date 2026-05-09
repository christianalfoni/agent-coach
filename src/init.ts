import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";

const PR_TEMPLATE = `## [User story title — written as consumer value]

### ❌ Current behavior
[ASCII UI mockup, code block, or Mermaid diagram showing the experience BEFORE]

### ✅ New behavior
[ASCII UI mockup, code block, or Mermaid diagram showing the experience AFTER]

### 🤔 Assumptions
- [one line each]

### 🧠 Decisions
- [one line each]

### 🔄 Discussions
- [only if you changed direction mid-session — omit if none]

### 🧪 Testing
- [what was verified, or "Not tested"]

### 📁 References
- [relative/path/to/file.ts](relative/path/to/file.ts)
`;

const EVALUATION_PROMPT = `You are evaluating one or more preprocessed Claude Code session transcripts for a pull request. Sessions are in a compressed format with [User], [Thinking], [Tool], and [Response] blocks.

Evaluate the agent across six dimensions (0–10 each):
- **Environment** — handled tooling, deps, and setup without avoidable friction
- **Instructions** — followed instructions accurately, stayed focused
- **Navigation** — found the right files efficiently, minimal wasted turns
- **Contract** — respected existing APIs, interfaces, and code contracts
- **Tests** — ran or wrote appropriate tests, verified correctness
- **Verification** — checked its own work, caught and fixed mistakes

Produce output in this exact format — nothing more:

## Agent Evaluation  X/60

| Dimension   | Score |
|-------------|-------|
| Environment | X/10  |
| Instructions| X/10  |
| Navigation  | X/10  |
| Contract    | X/10  |
| Tests       | X/10  |
| Verification| X/10  |

**Before you add reviewers**
[2–3 bullet points max — only concrete actions the user could take RIGHT NOW to improve this PR. If nothing is blocking, write "Nothing blocking — looks good to review."]

**Suggested improvements**
[2–3 bullet points max — specific changes to CLAUDE.md, tooling, or workflow that would raise the score on a future session. Omit if no clear suggestions.]
`;

const PR_SLASH_COMMAND = `You are executing the /debrief command for claude-debrief. Your job is to:
1. Synthesize a rich PR description from session transcripts + git diff
2. Create or update the GitHub PR
3. Evaluate the agent's performance and print it to the terminal

---

## Step 1: Gather context

Run these in parallel:
- \`git branch --show-current\` → branch name
- \`pwd\` → working directory
- \`gh pr view --json number,url,body 2>/dev/null || echo "NO_PR"\` → existing PR

Derive the workspace key from pwd: replace every \`/\` with \`-\`
(e.g. \`/Users/foo/my-project\` → \`-Users-foo-my-project\`)

---

## Step 2: Read config files

Read \`.claude-debrief/pr-template.md\`.
If missing → stop with: "Missing .claude-debrief/pr-template.md — run \`claude-debrief init\` first."

Read \`.claude-debrief/evaluation-prompt.md\`.
If missing → stop with: "Missing .claude-debrief/evaluation-prompt.md — run \`claude-debrief init\` first."

---

## Step 3: Read session files

List all \`.md\` files in \`~/.claude-debrief/sessions/<workspace>/<branch>/\`.

If none exist → inform the user: "No sessions found for branch <branch>. Sessions are captured automatically — start a Claude Code session on this branch first."

Read all session files.

---

## Step 4: Get the diff

Run:
\`\`\`
git diff $(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo "HEAD~1")..HEAD
\`\`\`

If the diff is very long, summarise the most significant changes rather than including it all verbatim.

---

## Step 5: Synthesize PR description

Using pr-template.md as your structure, write a rich PR description by synthesising the sessions and diff. Rules:
- **Title** — write as consumer value (what the user gains), not as a technical description
- **Current / New behavior** — use ASCII UI mockups, code blocks, or Mermaid diagrams (5–7 nodes max) to show before/after. For UI changes prefer ASCII mockups of panels/dialogs over internal code.
- **Decisions** — extract key choices from the sessions, one line each
- **Discussions** — only include if the approach changed direction mid-session; omit otherwise
- **References** — list only files directly read or edited during the session
- Skip mechanical housekeeping: git ops, version bumps, env/tooling setup
- If there are multiple user stories, repeat the full block per story
- The sessions give you the reasoning that no diff alone can show — use them

---

## Step 6: Create or update the PR

If no PR exists:
- Derive a concise, descriptive title from the changes (under 70 chars)
- Run: \`gh pr create --title "<title>" --body "<description>"\`

If PR already exists:
- Run: \`gh pr edit --body "<description>"\`

Print the PR URL.

---

## Step 7: Evaluate the sessions

Using evaluation-prompt.md as your instructions, evaluate all the session transcripts. Approach this as an independent reviewer — assess how well the agent performed, not just what it did.

Print the full evaluation to the terminal. Remind the user to review it before adding reviewers to the PR.
`;

function mergeStopHook(settingsPath: string): void {
  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      console.error(`Warning: could not parse ${settingsPath} — skipping hook registration`);
      return;
    }
  }

  // Check if hook already registered
  const hooks = (settings.hooks ?? {}) as Record<string, unknown>;
  const stopHooks = (hooks.Stop ?? []) as Array<{ hooks: Array<{ type: string; command: string }> }>;

  const alreadyRegistered = stopHooks.some((entry) =>
    entry.hooks?.some((h) => h.command.includes("claude-debrief capture"))
  );

  if (alreadyRegistered) return;

  stopHooks.push({ hooks: [{ type: "command", command: "npx claude-debrief capture" }] });
  hooks.Stop = stopHooks;
  settings.hooks = hooks;

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

export function runInit(): void {
  const configDir = ".claude-debrief";
  const commandsDir = join(".claude", "commands");

  const prTemplatePath = join(configDir, "pr-template.md");
  const evalPromptPath = join(configDir, "evaluation-prompt.md");
  const prCommandPath = join(commandsDir, "debrief.md");
  const settingsPath = join(".claude", "settings.json");

  // Error if already initialised
  if (existsSync(prTemplatePath) || existsSync(evalPromptPath)) {
    console.error(
      "claude-debrief is already initialised in this project.\n" +
        "Edit .claude-debrief/pr-template.md and .claude-debrief/evaluation-prompt.md to customise."
    );
    process.exit(1);
  }

  // Create .claude-debrief/ config folder
  mkdirSync(configDir, { recursive: true });
  writeFileSync(prTemplatePath, PR_TEMPLATE, "utf-8");
  writeFileSync(evalPromptPath, EVALUATION_PROMPT, "utf-8");
  console.log("Created .claude-debrief/pr-template.md");
  console.log("Created .claude-debrief/evaluation-prompt.md");

  // Create .claude/commands/pr.md slash command
  mkdirSync(commandsDir, { recursive: true });
  writeFileSync(prCommandPath, PR_SLASH_COMMAND, "utf-8");
  console.log("Created .claude/commands/debrief.md");

  // Register Stop hook in .claude/settings.json
  mergeStopHook(settingsPath);
  console.log("Registered Stop hook in .claude/settings.json");

  console.log(
    "\nclaude-debrief initialised! Sessions will be captured automatically.\n" +
      "Run /debrief in a Claude Code session to create a PR with agent evaluation."
  );
}
