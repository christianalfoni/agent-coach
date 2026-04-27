export const name = "Verification Surface";

export const description =
  "How well the repository lets an agent verify its own work after making a change — specifically whether tools exist (typecheck, tests, linter, build) to confirm correctness, whether those tools are discoverable, and whether the agent can close the loop with confidence after an edit. A repo where an agent has to guess whether its change worked scores very low regardless of other qualities.";

export const prompt = `Your task is to evaluate how well this repository lets an agent verify its own work across different parts of the codebase.

Step 1 — Map the repo
Explore the structure and identify 2-3 distinct zones that would be verified differently. For example: business logic, UI components, API/schema, config, shared types. Note what each zone looks like.

Step 2 — Make one small change per zone
For each zone, make a small but real change — a new utility function, an added field to a type, a new constant, a new component prop. Keep changes safe and avoid anything touching auth, payments, or destructive operations.

Step 3 — Verify each change independently
After each change, try every verification tool relevant to that zone:
- Type checker (tsc, mypy, etc.)
- Test suite
- Linter
- Build command
- Visual tools (Storybook, Playwright, etc.) for UI zones
- Anything else the repo provides

For each tool: note whether it existed, whether it was easy to find, and whether it succeeded.

Step 4 — Report per zone
For each zone, answer: could you say with confidence that your change is correct? Or are you guessing?

Be honest about gaps. Do not clean up your changes — leave them in place.`;
