import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const COMMANDS: Record<string, string> = {
  contribution: "Use Bash to run `agent-coach contribution` and then $ARGUMENTS\n",
};

export function runSetup() {
  const commandsDir = join(homedir(), ".claude", "commands");
  mkdirSync(commandsDir, { recursive: true });

  for (const [name, content] of Object.entries(COMMANDS)) {
    writeFileSync(join(commandsDir, `${name}.md`), content);
  }

  console.log(`✓ Installed commands to ${commandsDir}`);
  console.log(`  /contribution`);
  console.log();
  console.log("Restart Claude Code to pick up the new command.");
  console.log();
  console.log("Usage inside Claude Code:");
  console.log("  /contribution Create a PR with this as the description");
}
