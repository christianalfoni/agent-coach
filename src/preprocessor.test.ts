import { test, expect, describe } from "bun:test";
import { readFileSync } from "fs";
import { homedir } from "os";
import { preprocessSession, formatEvents } from "./preprocessor";

// --- Synthetic fixtures ---

const SIMPLE_SESSION = [
  { type: "file-history-snapshot", messageId: "a", snapshot: {} },
  {
    type: "user",
    message: { role: "user", content: "Set up push.autoSetupRemote" },
  },
  {
    type: "assistant",
    message: {
      role: "assistant",
      content: [
        { type: "tool_use", name: "Bash", input: { command: "git config push.autoSetupRemote true" } },
      ],
    },
  },
  {
    type: "user",
    message: {
      role: "user",
      content: [{ type: "tool_result", content: "(Bash completed with no output)" }],
    },
  },
  {
    type: "assistant",
    message: {
      role: "assistant",
      content: [{ type: "text", text: "Done. push.autoSetupRemote is now enabled." }],
    },
  },
  { type: "last-prompt", lastPrompt: "whatever" },
]
  .map((l) => JSON.stringify(l))
  .join("\n");

describe("preprocessSession", () => {
  test("extracts user messages", () => {
    const events = preprocessSession(SIMPLE_SESSION);
    const userEvents = events.filter((e) => e.kind === "user");
    expect(userEvents).toHaveLength(1);
    expect(userEvents[0]).toMatchObject({ kind: "user", text: "Set up push.autoSetupRemote" });
  });

  test("extracts tool calls with summaries", () => {
    const events = preprocessSession(SIMPLE_SESSION);
    const toolEvents = events.filter((e) => e.kind === "tool");
    expect(toolEvents).toHaveLength(1);
    expect(toolEvents[0]).toMatchObject({ kind: "tool", name: "Bash" });
    expect((toolEvents[0] as any).summary).toContain("git config");
  });

  test("extracts assistant text responses", () => {
    const events = preprocessSession(SIMPLE_SESSION);
    const responses = events.filter((e) => e.kind === "response");
    expect(responses).toHaveLength(1);
    expect(responses[0]).toMatchObject({ kind: "response", text: "Done. push.autoSetupRemote is now enabled." });
  });

  test("drops tool results (user messages that are tool feedback)", () => {
    const events = preprocessSession(SIMPLE_SESSION);
    // No user event should be a tool_result
    const userEvents = events.filter((e) => e.kind === "user");
    expect(userEvents).toHaveLength(1);
  });

  test("drops snapshot, queue-operation, last-prompt entries", () => {
    const events = preprocessSession(SIMPLE_SESSION);
    // Only: 1 user + 1 tool + 1 response
    expect(events).toHaveLength(3);
  });

  test("extracts thinking blocks", () => {
    const withThinking = [
      {
        type: "assistant",
        message: {
          content: [
            { type: "thinking", thinking: "Let me explore the codebase first." },
            { type: "tool_use", name: "Bash", input: { command: "ls" } },
          ],
        },
      },
    ]
      .map((l) => JSON.stringify(l))
      .join("\n");

    const events = preprocessSession(withThinking);
    expect(events.filter((e) => e.kind === "thinking")).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "thinking", text: "Let me explore the codebase first." });
  });

  test("handles empty/blank input", () => {
    expect(preprocessSession("")).toEqual([]);
    expect(preprocessSession("\n\n")).toEqual([]);
  });

  test("skips malformed JSON lines", () => {
    const input = `not-json\n${JSON.stringify({ type: "user", message: { content: "hello" } })}`;
    const events = preprocessSession(input);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "user", text: "hello" });
  });
});

describe("formatEvents", () => {
  test("formats all event kinds", () => {
    const output = formatEvents([
      { kind: "user", text: "Do the thing" },
      { kind: "thinking", text: "I should explore first" },
      { kind: "tool", name: "Bash", summary: "Bash: ls" },
      { kind: "response", text: "Done." },
    ]);
    expect(output).toContain("[User]");
    expect(output).toContain("Do the thing");
    expect(output).toContain("[Thinking]");
    expect(output).toContain("I should explore first");
    expect(output).toContain("[Tool] Bash: ls");
    expect(output).toContain("[Response]");
    expect(output).toContain("Done.");
  });
});

// --- Real session file smoke tests ---

describe("real session files", () => {
  const base = `${homedir()}/.claude/projects`;

  test("processes agent-diff-view session without throwing", () => {
    const path = `${base}/-Users-christianalfoni-Development-agent-diff-view/913494f9-5fa3-4e57-acf9-1450c82c9c26.jsonl`;
    const raw = readFileSync(path, "utf-8");
    const events = preprocessSession(raw);
    expect(events.length).toBeGreaterThan(0);
    // Should have at least one user message
    expect(events.some((e) => e.kind === "user")).toBe(true);
  });

  test("processes large rask-ui session and reduces to signal", () => {
    const path = `${base}/-Users-christianalfoni-Development-rask-ui/1d08d610-00d9-4062-9690-1cd452f20d71.jsonl`;
    const raw = readFileSync(path, "utf-8");
    const events = preprocessSession(raw);

    const formatted = formatEvents(events);
    const originalSize = raw.length;
    const processedSize = formatted.length;

    console.log(`Original: ${originalSize} bytes → Processed: ${processedSize} bytes (${Math.round((processedSize / originalSize) * 100)}%)`);

    // Should be significantly smaller
    expect(processedSize).toBeLessThan(originalSize * 0.5);
    // Should still have meaningful content
    expect(events.filter((e) => e.kind === "user").length).toBeGreaterThan(0);
    expect(events.filter((e) => e.kind === "tool").length).toBeGreaterThan(0);
  });
});
