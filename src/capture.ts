import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { spawnSync } from "child_process";
import { preprocessSession, formatEvents } from "./preprocessor";

interface HookInput {
  session_id: string;
  transcript_path: string;
}

function getCurrentBranch(): string | null {
  const result = spawnSync("git", ["branch", "--show-current"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0 || !result.stdout.trim()) return null;
  return result.stdout.trim();
}

function getWorkspaceKey(): string {
  return process.cwd().replace(/\//g, "-");
}

function cleanupOldSessions(branchDir: string): void {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let files: string[];
  try {
    files = readdirSync(branchDir).filter((f) => f.endsWith(".md"));
  } catch {
    return;
  }
  for (const file of files) {
    const filePath = join(branchDir, file);
    try {
      if (statSync(filePath).mtimeMs < thirtyDaysAgo) {
        unlinkSync(filePath);
      }
    } catch {
      // ignore
    }
  }
}

export function runCapture(): void {
  // Read hook input from stdin — never block Claude Code on failure
  let input: HookInput;
  try {
    const raw = readFileSync(0, "utf-8"); // fd 0 = stdin
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const { session_id, transcript_path } = input;
  if (!session_id || !transcript_path) process.exit(0);

  // Skip if not in a git repo
  const branch = getCurrentBranch();
  if (!branch) process.exit(0);

  // Read and preprocess the session transcript
  let raw: string;
  try {
    raw = readFileSync(transcript_path, "utf-8");
  } catch {
    process.exit(0);
  }

  const events = preprocessSession(raw);
  if (!events.length) process.exit(0);

  const markdown = formatEvents(events);

  // Write to ~/.claude-debrief/sessions/<workspace>/<branch>/<session-id>.md
  // Filename is stable per session — overwrites on each turn
  const workspace = getWorkspaceKey();
  const branchDir = join(homedir(), ".claude-debrief", "sessions", workspace, branch);
  mkdirSync(branchDir, { recursive: true });

  const filePath = join(branchDir, `${session_id}.md`);
  writeFileSync(filePath, markdown, "utf-8");

  // Cleanup sessions older than 30 days
  cleanupOldSessions(branchDir);
}
