#!/usr/bin/env bun
import * as p from "@clack/prompts";
import { resolve } from "path";
import chalk from "chalk";
import { DIMENSIONS, DIMENSION_LABELS, type DimensionId } from "./types.ts";
import { runAgent } from "./runner.ts";
import { judgeSession } from "./judge.ts";
import { printHeader, printDimensionResult, printSummary } from "./reporter.ts";
import * as environment from "./dimensions/environment.ts";
import * as instructions from "./dimensions/instructions.ts";
import * as navigation from "./dimensions/navigation.ts";
import * as contract from "./dimensions/contract.ts";
import * as tests from "./dimensions/tests.ts";
import * as verification from "./dimensions/verification.ts";

const DIMENSION_MODULES = { environment, instructions, navigation, contract, tests, verification };

function parseArgs() {
  const args = process.argv.slice(2);
  let repoPath = process.cwd();
  let dimensionFlag: DimensionId | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dimension" && args[i + 1]) {
      dimensionFlag = args[++i] as DimensionId;
    } else if (args[i] === "--version" || args[i] === "-v") {
      console.log("0.1.0");
      process.exit(0);
    } else if (!args[i].startsWith("--")) {
      repoPath = resolve(args[i]);
    }
  }

  return { repoPath, dimensionFlag };
}

async function selectDimension(dimensionFlag: DimensionId | null): Promise<DimensionId> {
  if (dimensionFlag) {
    if (!DIMENSIONS.includes(dimensionFlag)) {
      console.error(`Unknown dimension: ${dimensionFlag}. Valid: ${DIMENSIONS.join(", ")}`);
      process.exit(1);
    }
    return dimensionFlag;
  }

  const selected = await p.select<DimensionId>({
    message: "Which dimension would you like to evaluate?",
    options: DIMENSIONS.map((id) => ({
      value: id,
      label: DIMENSION_LABELS[id],
      hint: undefined,
    })),
  });

  if (p.isCancel(selected)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  return selected as DimensionId;
}

async function main() {
  const { repoPath, dimensionFlag } = parseArgs();

  printHeader(repoPath);

  const dimensionId = await selectDimension(dimensionFlag);
  const mod = DIMENSION_MODULES[dimensionId];

  p.log.step(`Running agent for: ${mod.name}`);
  console.log();

  const { events, totalCostUsd } = await runAgent(repoPath, mod.prompt);

  console.log();
  console.log();
  p.log.step("Judging session...");

  const result = await judgeSession(mod.name, mod.description, events);

  console.log();
  printDimensionResult(result);
  printSummary([result]);

  if (totalCostUsd != null) {
    console.log(chalk.gray(`  Session cost: $${totalCostUsd.toFixed(4)}`));
    console.log();
  }

  // Save report
  const artifactDir = `${repoPath}/.repo-score`;
  await Bun.spawn(["mkdir", "-p", artifactDir]).exited;
  const reportPath = `${artifactDir}/${dimensionId}.json`;
  await Bun.write(
    reportPath,
    JSON.stringify({ repoPath, dimension: dimensionId, result, events }, null, 2)
  );

  console.log(chalk.gray(`  Report saved to .repo-score/${dimensionId}.json`));
  console.log();
  console.log(chalk.dim(`  To address these findings, send this to Claude Code:`));
  console.log(chalk.cyan(`  Please fix the issues in @.repo-score/${dimensionId}.json`));
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
