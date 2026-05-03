# claude-beacon

Analyze your Claude Code sessions to improve your repo and generate better PRs.

Each command reads your latest session, extracts the signal, and gives you — or the active Claude Code agent — something to act on.

## Install

```sh
bun add -g github:christianalfoni/claude-beacon
claude-beacon setup
```

`setup` installs slash commands into `~/.claude/commands/`. After restarting Claude Code, all commands are available in any session.

## Usage

Run commands inside a Claude Code session. claude-beacon automatically picks up the current session — no path needed.

### Improve your repo

Evaluate a quality dimension and tell Claude what to do with the findings:

```
/environment fix the issues you find
/instructions update CLAUDE.md based on these findings
/navigation suggest structural improvements
/contract tighten the types
/tests add missing coverage
/verification document the verification commands in CLAUDE.md
```

### Generate a contribution report

Turn the session into a PR description or a saved file for repo history:

```
/contribution write a PR description from this
/contribution --save and commit the file
```

## Dimensions

| Command | What it evaluates |
|---|---|
| `environment` | Clean setup — deps, env vars, build and test commands |
| `instructions` | CLAUDE.md quality — are agents told what they need? |
| `navigation` | Codebase orientation — can an agent find things quickly? |
| `contract` | Type and schema surface — are data shapes explicit? |
| `tests` | Test safety net — do tests give an agent confidence? |
| `verification` | Self-verification — can an agent confirm its own work? |

## Direct CLI usage

All commands work outside Claude Code too, with an explicit session file:

```sh
claude-beacon environment ~/.claude/projects/.../session.jsonl
claude-beacon contribution --save ~/.claude/projects/.../session.jsonl
```
