import { readFileSync } from "fs";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { preprocessSession, formatEvents } from "./preprocessor";
import { runContribution } from "./contribution";
import { judge } from "./judge";
import { listSessions, findCurrentSession } from "./session";
import * as environment from "./dimensions/environment";
import * as instructions from "./dimensions/instructions";
import * as navigation from "./dimensions/navigation";
import * as contract from "./dimensions/contract";
import * as tests from "./dimensions/tests";
import * as verification from "./dimensions/verification";
import { runSetup } from "./setup";
import { runCapture } from "./capture";
import { runInit } from "./init";

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

function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function runInteractive() {
  p.intro(chalk.bold("agent-coach"));

  let sessions;
  try {
    sessions = listSessions();
  } catch (err) {
    p.cancel(String(err));
    process.exit(1);
  }

  const sessionChoice = await p.select({
    message: "Select a session",
    options: sessions.map((s) => ({
      value: s.path,
      label: chalk.dim(formatDate(s.mtime)) + "  " + s.label,
    })),
  });

  if (p.isCancel(sessionChoice)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const analysisChoice = await p.select({
    message: "Select analysis",
    options: [
      ...Object.entries(DIMENSIONS).map(([id, mod]) => ({
        value: id,
        label: id.padEnd(14) + chalk.dim(mod.name),
      })),
      { value: "contribution", label: "contribution  " + chalk.dim("Agent Contribution Report") },
    ],
  });

  if (p.isCancel(analysisChoice)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  p.outro("Running analysis…");
  console.log();

  const sessionFile = sessionChoice as string;
  const command = analysisChoice as string;

  if (command === "contribution") {
    await runContribution(sessionFile, false);
  } else {
    const mod = DIMENSIONS[command as DimensionId];
    const raw = readFileSync(sessionFile, "utf-8");
    const events = preprocessSession(raw);
    const transcript = formatEvents(events);
    console.error(`Analyzing ${events.length} events for: ${mod.name}`);
    const output = judge(mod.systemPrompt, transcript);
    process.stdout.write(output + "\n");
  }
}

async function runDirect(command: string, sessionFile: string | undefined, flags: Set<string>) {
  if (command === "capture") {
    runCapture();
    return;
  }

  if (command === "init") {
    runInit();
    return;
  }

  if (command === "setup") {
    runSetup();
    return;
  }

  const resolved = sessionFile ?? (() => {
    try {
      const path = findCurrentSession();
      console.error(`Using session: ${path}`);
      return path;
    } catch (err) {
      console.error(String(err));
      process.exit(1);
    }
  })();

  if (command === "contribution") {
    await runContribution(resolved, flags.has("save"));
  } else if (command in DIMENSIONS) {
    const mod = DIMENSIONS[command as DimensionId];
    let raw: string;
    try {
      raw = readFileSync(resolved, "utf-8");
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
    process.exit(1);
  }
}

const { flags, positional } = parseArgs();
const [command, sessionFile] = positional;

if (!command) {
  await runInteractive();
} else {
  await runDirect(command, sessionFile, flags);
}
