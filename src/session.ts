import { homedir } from "os";
import { readdirSync, statSync } from "fs";
import { join } from "path";

export function findCurrentSession(): string {
  const cwd = process.cwd();
  const hash = cwd.replace(/\//g, "-");
  const projectDir = join(homedir(), ".claude", "projects", hash);

  let files: string[];
  try {
    files = readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));
  } catch {
    throw new Error(`No Claude Code sessions found for this project.\nExpected: ${projectDir}`);
  }

  if (!files.length) {
    throw new Error(`No session files found in ${projectDir}`);
  }

  const latest = files
    .map((f) => ({ f, mtime: statSync(join(projectDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0];

  if (!latest) {
    throw new Error(`No session files found in ${projectDir}`);
  }

  return join(projectDir, latest.f);
}
