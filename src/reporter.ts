import chalk from "chalk";
import type { DimensionResult, Finding, Priority } from "./types.ts";

const PRIORITY_COLOR: Record<Priority, chalk.Chalk> = {
  critical: chalk.red,
  high: chalk.rgb(255, 140, 0),
  medium: chalk.yellow,
  low: chalk.blueBright,
};

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

function wrap(text: string, width = 68, indent = "  "): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line.length + word.length + 1 > width) {
      lines.push(indent + line.trimEnd());
      line = word + " ";
    } else {
      line += word + " ";
    }
  }
  if (line.trim()) lines.push(indent + line.trimEnd());
  return lines.join("\n");
}

function bar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const color = score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
  return color("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}

function scoreColor(score: number): chalk.Chalk {
  return score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
}

export function printDimensionResult(result: DimensionResult): void {
  const sc = scoreColor(result.score);
  console.log();
  console.log(
    chalk.bold(result.name) +
    "  " +
    bar(result.score) +
    "  " +
    sc.bold(`${result.score}`) +
    chalk.gray("/100")
  );

  if (result.findings.length === 0) {
    console.log(chalk.green("  ✓ No issues found"));
    return;
  }

  const order: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...result.findings].sort((a, b) => order[a.priority] - order[b.priority]);

  for (const finding of sorted) {
    const col = PRIORITY_COLOR[finding.priority];
    console.log();
    console.log("  " + col.bold(PRIORITY_LABEL[finding.priority]));
    console.log(chalk.gray(wrap(finding.observation, 68, "  ")));
    console.log();
    console.log(wrap(finding.action, 68, "  "));
  }
}

export function printSummary(results: DimensionResult[]): void {
  if (results.length === 0) return;
  const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);

  console.log();
  console.log(chalk.bold("─".repeat(60)));
  console.log();
  console.log(
    chalk.bold("Overall score  ") +
    bar(avg, 24) +
    "  " +
    scoreColor(avg).bold(`${avg}`) +
    chalk.gray("/100")
  );
  console.log();

  if (results.length <= 1) return;

  const allFindings = results
    .flatMap((r) => r.findings.map((f) => ({ ...f, dimension: r.name })))
    .sort((a, b) => {
      const order: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 5);

  if (allFindings.length > 0) {
    console.log(chalk.bold("Top findings:"));
    for (const f of allFindings) {
      const col = PRIORITY_COLOR[f.priority];
      console.log();
      console.log("  " + col.bold(PRIORITY_LABEL[f.priority]) + chalk.gray(`  ${f.dimension}`));
      console.log(wrap(f.observation, 68, "  "));
    }
  }
  console.log();
}

export function printHeader(repoPath: string): void {
  console.log();
  console.log(chalk.bold.cyan("  repo-score") + chalk.gray("  Claude Code readiness"));
  console.log(chalk.gray(`  ${repoPath}`));
  console.log();
}

export function printWorktreeStatus(
  succeeded: boolean,
  durationMs: number,
  error: string | null
): void {
  const seconds = (durationMs / 1000).toFixed(1);
  if (succeeded) {
    console.log(chalk.green(`  ✓ Worktree setup succeeded`) + chalk.gray(` (${seconds}s)`));
  } else {
    console.log(chalk.red(`  ✗ Worktree setup failed`) + chalk.gray(` — dynamic analysis skipped`));
    if (error) console.log(chalk.gray(`    ${error.split("\n")[0]}`));
  }
}
