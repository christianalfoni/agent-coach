import type { DimensionResult } from "./types.ts";
import { formatTranscript, type StreamEvent } from "./runner.ts";

const CLAUDE = "/Users/christianalfoni/.local/bin/claude";

export async function judgeSession(
  dimensionName: string,
  dimensionDescription: string,
  events: StreamEvent[]
): Promise<DimensionResult> {
  const transcript = formatTranscript(events);

  const judgePrompt = `You are judging how well a code repository supports Claude Code agent workflows for the "${dimensionName}" dimension.

Dimension: ${dimensionDescription}

Below is the full transcript of an agent session where Claude Code tried to evaluate this dimension:

<session>
${transcript}
</session>

Based on what actually happened in the session, provide:
- A score from 0-100 (be strict — a repo where the agent struggled or could not complete tasks should score low)
- Specific findings grounded in what you observed — not generic advice

Respond only with this JSON, no other text:
{
  "score": <number 0-100>,
  "findings": [
    {
      "priority": "critical|high|medium|low",
      "observation": "<exactly what happened or what was missing, with specifics>",
      "action": "<concrete thing the repo owner should do>"
    }
  ]
}`;

  const proc = Bun.spawn(
    [
      CLAUDE,
      "--output-format", "json",
      "--dangerously-skip-permissions",
      "--max-turns", "1",
      "-p", judgePrompt,
    ],
    {
      cwd: process.cwd(),
      stdout: "pipe",
      stderr: "ignore",
      env: { ...process.env },
    }
  );

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  let resultText = "";
  try {
    const parsed = JSON.parse(output);
    resultText = parsed.result ?? output;
  } catch {
    resultText = output;
  }

  const cleaned = resultText
    .replace(/^```json\s*/m, "")
    .replace(/^```\s*/m, "")
    .replace(/```$/m, "")
    .trim();

  let parsed: { score: number; findings: DimensionResult["findings"] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      score: 0,
      findings: [
        {
          priority: "critical",
          observation: "Judgment agent failed to produce valid output",
          action: "Check that claude is authenticated and working",
        },
      ],
    };
  }

  return {
    name: dimensionName,
    score: parsed.score ?? 0,
    findings: parsed.findings ?? [],
  };
}
