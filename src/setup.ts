import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const COMMANDS: Record<string, string> = {
  environment: "Use Bash to run `claude-beacon environment` and then $ARGUMENTS\n",
  instructions: "Use Bash to run `claude-beacon instructions` and then $ARGUMENTS\n",
  navigation: "Use Bash to run `claude-beacon navigation` and then $ARGUMENTS\n",
  contract: "Use Bash to run `claude-beacon contract` and then $ARGUMENTS\n",
  tests: "Use Bash to run `claude-beacon tests` and then $ARGUMENTS\n",
  verification: "Use Bash to run `claude-beacon verification` and then $ARGUMENTS\n",
  contribution: "Use Bash to run `claude-beacon contribution` and then $ARGUMENTS\n",
};

export function runSetup() {
  const commandsDir = join(homedir(), ".claude", "commands");
  mkdirSync(commandsDir, { recursive: true });

  for (const [name, content] of Object.entries(COMMANDS)) {
    writeFileSync(join(commandsDir, `${name}.md`), content);
  }

  const names = Object.keys(COMMANDS).map((n) => `/${n}`).join("  ");
  console.log(`✓ Installed commands to ${commandsDir}`);
  console.log(`  ${names}`);
  console.log();
  console.log("Restart Claude Code to pick up the new commands.");
}
