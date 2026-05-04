import { homedir } from "os";
import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";

export interface SessionInfo {
  path: string;
  mtime: Date;
  label: string;
}

function extractFirstUserMessage(filePath: string): string {
  try {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n").slice(0, 50)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed);
        if (entry.type === "user") {
          const content = entry.message?.content;
          if (typeof content === "string" && content.trim()) return content.trim().slice(0, 80);
          if (Array.isArray(content)) {
            for (const part of content) {
              if (part.type === "text" && part.text?.trim()) return part.text.trim().slice(0, 80);
            }
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    // ignore
  }
  return "Unknown session";
}

function getProjectDir(): string {
  const cwd = process.cwd();
  const hash = cwd.replace(/\//g, "-");
  return join(homedir(), ".claude", "projects", hash);
}

export function listSessions(): SessionInfo[] {
  const projectDir = getProjectDir();

  let files: string[];
  try {
    files = readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));
  } catch {
    throw new Error(`No Claude Code sessions found for this project.\nExpected: ${projectDir}`);
  }

  if (!files.length) throw new Error(`No session files found in ${projectDir}`);

  return files
    .map((f) => {
      const path = join(projectDir, f);
      const mtime = new Date(statSync(path).mtimeMs);
      const label = extractFirstUserMessage(path);
      return { path, mtime, label };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

export function findCurrentSession(): string {
  const sessions = listSessions();
  const latest = sessions[0];
  if (!latest) throw new Error("No session files found");
  return latest.path;
}
