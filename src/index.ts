#!/usr/bin/env bun
import { readFileSync } from "fs";
import { preprocessSession, formatEvents } from "./preprocessor";
import { runContribution } from "./contribution";
import { judge } from "./judge";
import { findCurrentSession } from "./session";
import { runSetup } from "./setup";
import * as environment from "./dimensions/environment";
import * as instructions from "./dimensions/instructions";
import * as navigation from "./dimensions/navigation";
import * as contract from "./dimensions/contract";
import * as tests from "./dimensions/tests";
import * as verification from "./dimensions/verification";

const DIMENSIONS = { environment, instructions, navigation, contract, tests, verification };
type DimensionId = keyof typeof DIMENSIONS;

function parseArgs() {
  const flags = new Set<string>();
  const positional: string[] = [];
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) flags.add(arg.slice(2));
    else positional.push(arg);
  }
  return { flags, positional };
}

function printUsage() {
  console.error("Usage: claude-beacon <command> [session.jsonl] [options]");
  console.error("");
  console.error("Setup:");
  console.error("  setup                Install slash commands into ~/.claude/commands/");
  console.error("");
  console.error("Dimension commands (uses latest session if no file given):");
  for (const [id, mod] of Object.entries(DIMENSIONS)) {
    console.error(`  ${id.padEnd(14)} ${mod.name}`);
  }
  console.error("");
  console.error("Contribution:");
  console.error("  contribution         Generate agent contribution report (stdout)");
  console.error("  contribution --save  Write to .agent-contributions/<branch>.md");
}

function resolveSession(sessionFile: string | undefined): string {
  if (sessionFile) return sessionFile;
  try {
    const path = findCurrentSession();
    console.error(`Using session: ${path}`);
    return path;
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }
}

const { flags, positional } = parseArgs();
const [command, sessionFile] = positional;

if (!command) {
  printUsage();
  process.exit(1);
}

if (command === "setup") {
  runSetup();
} else if (command === "contribution") {
  await runContribution(resolveSession(sessionFile), flags.has("save"));
} else if (command in DIMENSIONS) {
  const mod = DIMENSIONS[command as DimensionId];
  let raw: string;
  try {
    raw = readFileSync(resolveSession(sessionFile), "utf-8");
  } catch {
    console.error(`Could not read session file`);
    process.exit(1);
  }
  const events = preprocessSession(raw);
  const transcript = formatEvents(events);
  console.error(`Analyzing ${events.length} events for: ${mod.name}`);
  const output = judge(mod.systemPrompt, transcript);
  process.stdout.write(output + "\n");
} else {
  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}
