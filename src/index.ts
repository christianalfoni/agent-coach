#!/usr/bin/env bun
import { readFileSync } from "fs";
import { preprocessSession, formatEvents } from "./preprocessor";
import { runContribution } from "./contribution";
import { judge } from "./judge";
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
  console.error("Usage: claude-beacon <command> <session.jsonl> [options]");
  console.error("");
  console.error("Dimension commands (analyze a session for improvement signals):");
  for (const [id, mod] of Object.entries(DIMENSIONS)) {
    console.error(`  ${id.padEnd(14)} ${mod.name}`);
  }
  console.error("");
  console.error("Output commands:");
  console.error("  contribution    Generate agent contribution report (stdout)");
  console.error("  contribution --save  Write report to .agent-contributions/<branch>.md");
}

const { flags, positional } = parseArgs();
const [command, sessionFile] = positional;

if (!command) {
  printUsage();
  process.exit(1);
}

if (command === "contribution") {
  if (!sessionFile) {
    console.error("Usage: claude-beacon contribution <session.jsonl> [--save]");
    process.exit(1);
  }
  await runContribution(sessionFile, flags.has("save"));
} else if (command in DIMENSIONS) {
  if (!sessionFile) {
    console.error(`Usage: claude-beacon ${command} <session.jsonl>`);
    process.exit(1);
  }
  const mod = DIMENSIONS[command as DimensionId];
  let raw: string;
  try {
    raw = readFileSync(sessionFile, "utf-8");
  } catch {
    console.error(`Could not read session file: ${sessionFile}`);
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
