# claude-beacon

Lighthouse scores for Claude Code readiness.

Unlike static analysis tools that check for the presence of files, `repo-score` actually runs Claude Code against your repo and measures what happens — then passes the session transcript to a judgment agent that produces a specific, grounded report.

## How it works

For each dimension, the tool:

1. **Spawns a Claude Code agent** with a targeted prompt (e.g. "orient to this repo and find the test command") and streams its work to your terminal in real time
2. **Reads the full session transcript** after the agent finishes
3. **Passes the transcript to a judgment agent** which scores the dimension 0–100 and produces prioritized findings grounded in what actually happened — not generic advice
4. **Saves the report** to `.repo-score/<dimension>.json` in your repo

## Dimensions

| Dimension | What the agent does |
|---|---|
| **Environment Reproducibility** | Creates a git worktree, runs setup, verifies tests pass in a clean environment |
| **Agent Instructions** | Orients to the repo cold, finds and runs test/build/lint commands, notes what was documented vs discovered |
| **Navigation Surface** | Tries to locate key files and features, assesses how much searching was needed |
| **Type / Contract Surface** | Finds the type system, traces a core data shape, assesses how much is explicitly typed |
| **Test Surface** | Runs the test suite, samples coverage, deliberately introduces a bug to see if tests catch it |
| **Verification Surface** | Makes real changes across different zones of the repo and tries to verify each one |

## Usage

```bash
# Interactive — choose a dimension from a menu
bun run src/index.ts /path/to/your/repo

# Non-interactive — run a specific dimension directly
bun run src/index.ts /path/to/your/repo --dimension environment
```

Available dimensions: `environment`, `instructions`, `navigation`, `contract`, `tests`, `verification`

## Addressing findings

After each run the report is saved to `.repo-score/<dimension>.json`. To address the findings, open Claude Code in your repo and send:

```
Please fix the issues in @.repo-score/<dimension>.json
```

Re-run the dimension afterward to see the delta.

## Requirements

- [Bun](https://bun.com)
- [Claude Code](https://claude.ai/code) installed and authenticated (`claude` in PATH)
- A git repository (required for Environment Reproducibility; recommended for all dimensions)

## Build a binary

```bash
bun run build
```

Produces a standalone `repo-score` binary with no runtime dependencies.
