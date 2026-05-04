# agent-coach

A coach for your Claude Code agent — analyzes sessions to improve your repo and generate better PRs.

## Install

```sh
npm install -g agent-coach
agent-coach setup
```

`setup` installs the `/contribution` slash command into `~/.claude/commands/`. Restart Claude Code to activate it.

## Usage

### Interactive mode

Run `agent-coach` with no arguments to launch the interactive session browser:

```sh
agent-coach
```

- Pick a session from your current project
- Pick a dimension to evaluate, or generate a contribution report
- Output goes to stdout

### Claude Code command

After running `setup`, use `/contribution` inside any Claude Code session:

```
/contribution Create a PR with this as the description
/contribution summarize what changed and open a PR
```

`agent-coach contribution` picks up the latest session automatically, generates the report, and Claude acts on your instructions.

To save the report to the repo instead of stdout:

```sh
agent-coach contribution --save
```

Writes to `.agent-contributions/<branch>.md`.

## Dimensions

Each dimension analyzes the current session for signals relevant to that aspect of agent-readiness. Findings reflect what actually happened — not a synthetic audit.

| Dimension | What it evaluates |
|---|---|
| `environment` | Clean setup — deps, env vars, build and test commands |
| `instructions` | CLAUDE.md quality — are agents told what they need? |
| `navigation` | Codebase orientation — can an agent find things quickly? |
| `contract` | Type and schema surface — are data shapes explicit? |
| `tests` | Test safety net — do tests give an agent confidence? |
| `verification` | Self-verification — can an agent confirm its own work? |

## Direct CLI usage

All commands work with an explicit session file:

```sh
agent-coach environment ~/.claude/projects/.../session.jsonl
agent-coach contribution --save ~/.claude/projects/.../session.jsonl
```
