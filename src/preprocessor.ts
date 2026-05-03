export type ProcessedEvent =
  | { kind: "user"; text: string }
  | { kind: "thinking"; text: string }
  | { kind: "tool"; name: string; summary: string }
  | { kind: "response"; text: string };

type ContentItem = {
  type: string;
  text?: string;
  thinking?: string;
  name?: string;
  input?: Record<string, unknown>;
  type_?: string;
};

type SessionEntry = {
  type: string;
  message?: {
    role?: string;
    content?: string | ContentItem[];
  };
};

function summarizeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "Read":
      return `Read ${input.file_path}`;
    case "Write":
      return `Write ${input.file_path}`;
    case "Edit":
      return `Edit ${input.file_path}`;
    case "Bash":
      return `Bash: ${String(input.command ?? "").slice(0, 120)}`;
    case "Grep":
      return `Grep "${input.pattern}"${input.path ? ` in ${input.path}` : ""}`;
    case "Glob":
      return `Glob ${input.pattern}`;
    case "Agent":
      return `Spawn agent: ${String(input.description ?? input.prompt ?? "").slice(0, 80)}`;
    case "TodoWrite":
      return `Update todos`;
    default:
      return `${name}: ${JSON.stringify(input).slice(0, 100)}`;
  }
}

const SKIP_TYPES = new Set([
  "file-history-snapshot",
  "queue-operation",
  "ai-title",
  "last-prompt",
  "pr-link",
  "attachment",
]);

export function preprocessSession(jsonl: string): ProcessedEvent[] {
  const events: ProcessedEvent[] = [];

  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry: SessionEntry;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (SKIP_TYPES.has(entry.type)) continue;

    if (entry.type === "user") {
      const content = entry.message?.content;
      if (typeof content === "string" && content.trim()) {
        events.push({ kind: "user", text: content.trim() });
      } else if (Array.isArray(content)) {
        // Filter out pure tool_result messages (feedback back to Claude)
        const humanParts = content.filter((c) => c.type === "text");
        for (const part of humanParts) {
          if (part.text?.trim()) {
            events.push({ kind: "user", text: part.text.trim() });
          }
        }
      }
      continue;
    }

    if (entry.type === "assistant") {
      const content = entry.message?.content;
      if (!Array.isArray(content)) continue;

      for (const item of content) {
        if (item.type === "thinking" && item.thinking?.trim()) {
          events.push({ kind: "thinking", text: item.thinking.trim() });
        } else if (item.type === "text" && item.text?.trim()) {
          events.push({ kind: "response", text: item.text.trim() });
        } else if (item.type === "tool_use" && item.name) {
          events.push({
            kind: "tool",
            name: item.name,
            summary: summarizeTool(item.name, (item.input as Record<string, unknown>) ?? {}),
          });
        }
      }
      continue;
    }
  }

  return events;
}

export function formatEvents(events: ProcessedEvent[]): string {
  const lines: string[] = [];

  for (const event of events) {
    switch (event.kind) {
      case "user":
        lines.push(`[User]\n${event.text}\n`);
        break;
      case "thinking":
        lines.push(`[Thinking]\n${event.text}\n`);
        break;
      case "tool":
        lines.push(`[Tool] ${event.summary}`);
        break;
      case "response":
        lines.push(`[Response]\n${event.text}\n`);
        break;
    }
  }

  return lines.join("\n");
}
