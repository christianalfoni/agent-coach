# Spec: Lighthouse Score for Claude Code

A CLI tool that scores a repository on how well it supports Claude Code workflows — combining static analysis with live agent sessions to produce a prioritized, actionable report.

---

## Problem

Existing "AI readiness" tools are static analyzers. They check for the presence of `CLAUDE.md`, type annotations, and test files, but they never ask the harder question: *when Claude Code actually runs in this repo, does it succeed efficiently, and can it verify that it did?*

The result is repos that look ready on paper but have invisible friction — missing verification paths, ambiguous entry points, navigation surfaces that burn 3x more context than necessary. None of this shows up in a static score.

---

## Goal

An interactive CLI tool that lets you select which dimensions of Claude Code readiness to evaluate, runs static analysis and live agent sessions for the selected dimensions, and produces specific, actionable findings with an optional scoped fix pass.

---

## UX Model

When the CLI starts, it presents the available dimensions and lets the user select which to evaluate:

```
? Which dimensions would you like to score? (space to select, enter to run)

  ◉ Environment Reproducibility   ← always shown first; gates dynamic dimensions
  ◯ Agent Instructions
  ◯ Navigation Surface
  ◯ Type / Contract Surface
  ◯ Test Surface
  ◯ Verification Surface
```

After results are shown for a dimension, the tool prompts:

```
  Found 3 issues in Verification Surface.
  ? Fix them now? (Y/n)
```

This makes the tool a **feedback loop** rather than a one-shot report: select a dimension, review findings, fix, re-run just that dimension, see the delta.

---

## Dimensions

Listed in the order they appear in the CLI selector. Environment Reproducibility is always first because any dynamic dimension depends on a working worktree.

| # | Dimension | Static | Dynamic |
|---|-----------|--------|---------|
| 1 | **Environment Reproducibility** | ✓ | ✓ |
| 2 | Agent Instructions | ✓ | ✓ |
| 3 | Navigation Surface | ✓ | ✓ |
| 4 | Type / Contract Surface | ✓ | ✓ |
| 5 | Test Surface | ✓ | ✓ |
| 6 | Verification Surface | ✓ | ✓ |

Weights are not fixed globally — they are computed per-run based on which dimensions were selected, so a scoped run (one dimension) gives a full 0–100 score for that dimension, not a fraction of a global score.

### 1. Environment Reproducibility

The ability to create a clean, functional worktree is itself a Claude Code readiness signal. Every agent iteration on the repo pays this cost, so friction here multiplies across all dynamic runs.

**Static signals:**
- Single-command setup exists (`make`, `just`, `npm install`, `pip install`, etc.)
- `.env.example` present if env vars are required
- Setup command documented in `CLAUDE.md` / `README`
- No secrets required to get a working test environment

**Dynamic signals (the worktree attempt is the measurement):**
- Does `git worktree add` + setup command succeed without manual intervention?
- How long does setup take? (directly affects agent iteration speed)
- Does the test / typecheck command run successfully in the fresh worktree?
- If setup fails or exceeds a timeout: dynamic phase for all selected dimensions is skipped, with an explicit warning

### 2. Agent Instructions

**Static:**
- Presence and completeness of `CLAUDE.md` / `AGENTS.md`
- Documented: test command, build command, lint command, coding conventions, gotchas

**Dynamic:**
- Did Claude consult `CLAUDE.md` during sessions? If not, it may exist but not be useful
- Did Claude use the correct test/build command on the first attempt, or search for it?

### 3. Navigation Surface

**Static:**
- File size distribution
- Directory depth and naming consistency
- Presence of architecture doc or module-level READMEs
- Dead code indicators

**Dynamic:**
- Ratio of files opened to files changed per session
- Search calls before first edit
- Whether Claude needed multiple passes to locate the correct entry point

### 4. Type / Contract Surface

**Static:**
- Type strictness config (tsconfig strict, mypy, etc.)
- Schema files present (OpenAPI, JSON Schema, GraphQL)
- Pydantic / dataclass / zod coverage

**Dynamic:**
- Did Claude infer types and interfaces correctly without extra lookup?
- Did type errors surface during verification?

### 5. Test Surface

**Static:**
- Test files present
- Estimated runtime (from CI configs)
- Single-command invocation
- Coverage signals

**Dynamic:**
- Did Claude run tests as part of the task?
- Did the tests pass?
- Did Claude pick the correct test command on the first attempt?

### 6. Verification Surface

The novel dimension. Inventories *everything* an agent can use to confirm its changes worked — not just tests.

**Static inventory:**
- Unit test runner (documented and single-command?)
- Type checker (present, fast, documented?)
- Linter
- Build command
- E2E tests (Playwright, Cypress, etc.)
- Dev server with health endpoint
- Storybook / screenshot tooling for UI changes
- `--dry-run` flags on mutation operations
- Database migration dry-runs

**Dynamic scoring:**
- Did Claude attempt verification after completing the task?
- Did the verification command exist and succeed?
- For tasks where verification *should* be possible but Claude skipped it → the path isn't discoverable
- For tasks where Claude *tried* to verify but no tool existed → the surface is missing
- UI-specific: if the repo has frontend components but no visual verification capability, this sub-score is 0 regardless of test coverage elsewhere

---

## Architecture

### Phases per run

```
CLI dimension selector
 └─ Phase 1: Worktree setup         → success/failure + timing
     └─ Phase 2: Static analysis    → per-dimension scores + surface inventory
         └─ Phase 3: Task generation → LLM-derived tasks grounded in the repo
             └─ Phase 4: Dynamic runs → stream to terminal + read final session file → signals
```

### Phase 1 — Worktree setup

Attempted before any dynamic dimension runs. The scorer uses `git worktree add` to create a clean copy, runs the documented setup command, then verifies the environment by running the test/typecheck command.

If setup fails or times out (5 minute default): dynamic phases are skipped for all selected dimensions. The failure is itself scored and reported as findings under Environment Reproducibility.

### Phase 2 — Static analysis

Pure filesystem + config inspection. No network, no LLM. Produces:
- Per-dimension sub-scores for the selected dimensions
- A **surface inventory**: entry points, type files, test commands, verification commands, UI components, etc. — feeds Phase 3.

### Phase 3 — Task generation

An LLM pass over the surface inventory generates 4–6 tasks shaped to the repo. Using LLM-derived tasks (rather than heuristics) is intentional — it mirrors what Claude would actually do when orienting to the repo, and tasks that are hard to generate are themselves a signal.

Task types:

| Type | Prompt shape | Verification command |
|------|-------------|----------------------|
| Field propagation | "Add field `X: T` to model `M`, propagate to all consumers" | typecheck |
| New endpoint | "Add endpoint `POST /foo` following existing patterns" | test suite |
| Behavior change | "Modify function `f` to also do Z, update tests" | test suite |
| UI component | "Add prop `P` to component `C` and render it" | storybook / typecheck |
| Config option | "Add option `O` with default `D`" | build / typecheck |

Each task record:
```jsonc
{
  "id": "task-001",
  "type": "field_propagation",
  "prompt": "...",
  "expected_files": ["src/models/user.ts", "src/api/users.ts"],
  "verification_command": "npx tsc --noEmit",
  "complexity": "low" // low | medium | high
}
```

### Phase 4 — Dynamic runs

For each task, in the working worktree:
1. Spawn Claude Code as a subprocess with `--output-format stream-json` — stream stdout to terminal so the user can watch
2. After Claude exits, read the session JSONL file Claude Code writes to disk
3. Parse signals from the completed session
4. Reset worktree to clean state for next task

**Parsed signals per session:**

```jsonc
{
  "task_id": "task-001",
  "outcome": "completed", // completed | gave_up | errored
  "diff_matches_expected": true,
  "verification": {
    "attempted": true,
    "command_used": "npx tsc --noEmit",
    "command_succeeded": true
  },
  "navigation": {
    "files_opened": 7,
    "files_changed": 2,
    "search_calls_before_first_edit": 3,
    "consulted_claude_md": true
  },
  "efficiency": {
    "tool_calls": 24,
    "wall_clock_seconds": 47,
    "input_tokens": 18400,
    "output_tokens": 2100
  }
}
```

---

## Scoring

Each dimension sub-score is 0–100. Findings are the primary output — the number is a summary.

Each finding has:
- A specific observation ("Claude attempted `npm test` in 3/4 sessions but it failed due to missing env vars")
- A priority: `critical` / `high` / `medium` / `low`
- An action ("Document required env vars in CLAUDE.md and add a `.env.example`")

---

## Output

### Terminal

```
Environment Reproducibility: 48 / 100

  Setup command found      ✓
  .env.example present     ✗  (env vars required but not documented)
  Setup time               2m 14s  (slow — adds overhead to every agent iteration)
  Test suite in worktree   ✗  (failed: missing DATABASE_URL)

Findings:
  [critical] Test suite cannot run in clean environment — missing DATABASE_URL
             → Add .env.example with DATABASE_URL=... and document in CLAUDE.md
  [high]     Setup takes 2m 14s — consider caching or documenting a faster path
             → Add `npm run test:unit` that skips integration tests for fast feedback

? Fix these now? (Y/n)
```

### Artifacts (written to `.repo-score/`)
- `score.json` — full structured output
- `sessions/` — raw session files, kept for inspection

### Fix pass

When the user confirms a fix, a scoped Claude Code session reads the findings for that dimension and attempts to resolve them (CLAUDE.md improvements, adding npm scripts, adding `.env.example`, etc.). After the fix session completes, the dimension re-scores automatically to show the delta.

---

## v1 Scope

- Language-agnostic (static analysis adapts to what's present; dynamic phase is always language-agnostic)
- 4–6 generated tasks per run
- Local execution only (git worktrees, no sandboxing)
- Result cache keyed on git SHA + selected dimensions (`~/.cache/repo-score/<sha>/<dims>.json`) — rerun is free if nothing changed
- Fix pass included in v1 (it falls naturally out of the interactive UX)
