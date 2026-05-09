# claude-debrief

Captures your Claude Code sessions and turns them into rich PRs — with an agent performance evaluation before you add reviewers.

## How it works

- A **Stop hook** captures every Claude Code session as compressed markdown to `~/.claude-debrief/sessions/`
- The **`/pr` slash command** reads all sessions for the current branch, synthesizes a PR description from the reasoning in those sessions (not just the diff), creates or updates the GitHub PR, then prints an agent evaluation to the terminal

## Install

```sh
npm install -g claude-debrief
```

Then initialise in each project you want to use it in:

```sh
claude-debrief init
```

`init` does four things:
1. Creates `.claude-debrief/pr-template.md` — edit to fit your project
2. Creates `.claude-debrief/evaluation-prompt.md` — edit to tune the evaluation
3. Creates `.claude/commands/pr.md` — the `/pr` slash command
4. Registers the Stop hook in `.claude/settings.json`

## Usage

Work with Claude Code as normal — sessions are captured automatically.

When you're ready to open a PR, run inside a Claude Code session:

```
/pr
```

Claude will:
1. Read all sessions for the current branch from `~/.claude-debrief/`
2. Synthesize a PR description using your template (before/after behavior, decisions, references)
3. Create or update the GitHub PR via `gh`
4. Print an agent evaluation to the terminal — review it before adding reviewers

## Configuration

Both files are created by `init` and are meant to be edited and committed:

| File | Purpose |
|------|---------|
| `.claude-debrief/pr-template.md` | Shape of the PR description |
| `.claude-debrief/evaluation-prompt.md` | How to evaluate agent sessions |

## Agent evaluation

The evaluation is printed to the terminal after the PR is created — not posted to GitHub. It's a prompt to reflect before handing off to reviewers:

```
## Agent Evaluation  47/60

| Dimension    | Score |
|--------------|-------|
| Environment  | 8/10  |
| Instructions | 7/10  |
| Navigation   | 9/10  |
| Contract     | 9/10  |
| Tests        | 6/10  |
| Verification | 8/10  |

**Before you add reviewers**
- Run pnpm lint — not run this session despite CLAUDE.md guidance

**Suggested improvements**
- Add a "one logical change per commit" rule to CLAUDE.md
```

## Session storage

Sessions are stored at `~/.claude-debrief/sessions/<workspace>/<branch>/<session-id>.md` and cleaned up automatically after 30 days.
