import chalk from "chalk";

export interface StreamEvent {
  type: "system" | "assistant" | "user" | "result";
  subtype?: string;
  message?: {
    role: string;
    content: ContentBlock[];
  };
  result?: string;
  is_error?: boolean;
  usage?: { input_tokens: number; output_tokens: number };
  total_cost_usd?: number;
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: Array<{ type: string; text?: string }> | string };

export interface RunResult {
  events: StreamEvent[];
  outcome: "success" | "error";
  totalCostUsd?: number;
}

const CLAUDE = "/Users/christianalfoni/.local/bin/claude";

// Single-line progress display — overwrites the current line as tool calls arrive
class ProgressDisplay {
  private currentLine = "";
  private lastWasProgress = false;

  tool(name: string, input: Record<string, unknown>) {
    const preview = toolPreview(name, input);
    const line = chalk.cyan(`  ▶ ${name}`) + chalk.gray(`  ${preview}`);
    if (this.lastWasProgress) process.stdout.write("\r\x1b[K");
    process.stdout.write(line);
    this.currentLine = line;
    this.lastWasProgress = true;
  }

  text(content: string) {
    const first = content.trim().split("\n")[0].slice(0, 100);
    if (!first) return;
    if (this.lastWasProgress) {
      process.stdout.write("\n");
      this.lastWasProgress = false;
    }
    console.log(chalk.dim(`  ${first}`));
  }

  end() {
    if (this.lastWasProgress) {
      process.stdout.write("\n");
      this.lastWasProgress = false;
    }
  }
}

function toolPreview(name: string, input: Record<string, unknown>): string {
  if (name === "Bash") return String(input.command ?? "").slice(0, 100);
  if (name === "Read") return String(input.file_path ?? "");
  if (name === "Write" || name === "Edit") return String(input.file_path ?? "");
  if (name === "Glob") return String(input.pattern ?? "");
  if (name === "Grep") return `"${input.pattern}" in ${input.path ?? "."}`;
  return JSON.stringify(input).slice(0, 80);
}

export async function runAgent(repoPath: string, prompt: string): Promise<RunResult> {
  const events: StreamEvent[] = [];
  const display = new ProgressDisplay();

  const proc = Bun.spawn(
    [
      CLAUDE,
      "--output-format", "stream-json",
      "--verbose",
      "--dangerously-skip-permissions",
      "--max-turns", "30",
      "-p", prompt,
    ],
    {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "ignore",
      env: { ...process.env },
    }
  );

  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line) as StreamEvent;
          events.push(event);

          if (event.type === "assistant" && event.message) {
            for (const block of event.message.content) {
              if (block.type === "tool_use") {
                display.tool(block.name, block.input);
              } else if (block.type === "text" && block.text.trim()) {
                display.text(block.text);
              }
            }
          }
        } catch {
          // not a JSON line
        }
      }
    }
  } finally {
    reader.releaseLock();
    display.end();
  }

  const exitCode = await proc.exited;
  const resultEvent = events.find((e) => e.type === "result");

  return {
    events,
    outcome: exitCode === 0 ? "success" : "error",
    totalCostUsd: resultEvent?.total_cost_usd,
  };
}

export function formatTranscript(events: StreamEvent[]): string {
  const lines: string[] = [];

  for (const event of events) {
    if (event.type === "assistant" && event.message) {
      for (const block of event.message.content) {
        if (block.type === "text" && block.text.trim()) {
          lines.push(`ASSISTANT: ${block.text.trim()}`);
        } else if (block.type === "tool_use") {
          const input = JSON.stringify(block.input).slice(0, 300);
          lines.push(`TOOL_CALL [${block.name}]: ${input}`);
        }
      }
    } else if (event.type === "user" && event.message) {
      for (const block of event.message.content) {
        if (block.type === "tool_result") {
          const text = Array.isArray(block.content)
            ? block.content.map((c) => c.text ?? "").join("").trim()
            : String(block.content ?? "").trim();
          lines.push(`TOOL_RESULT: ${text.slice(0, 500)}`);
        }
      }
    } else if (event.type === "result") {
      lines.push(`SESSION_RESULT: ${event.result ?? ""}`);
    }
  }

  return lines.join("\n");
}
