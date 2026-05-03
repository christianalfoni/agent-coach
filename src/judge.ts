import { spawnSync } from "child_process";

export function judge(systemPrompt: string, transcript: string): string {
  const result = spawnSync(
    "claude",
    [
      "--print",
      "--system-prompt",
      systemPrompt,
      "--allowedTools",
      "none",
      "--permission-mode",
      "bypassPermissions",
      "--model",
      "sonnet",
      `Here is a preprocessed Claude Code session transcript. Analyze it according to your instructions.\n\nSession transcript:\n---\n${transcript}\n---`,
    ],
    {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "inherit"],
    }
  );

  if (result.error) {
    console.error(`Failed to run claude: ${result.error.message}`);
    process.exit(1);
  }

  return result.stdout?.trim() ?? "";
}
