export const name = "Test Surface";

export const description =
  "How well the repository's test suite serves as a safety net for agent changes — whether tests exist, run reliably, cover meaningful behaviour, and give an agent confidence that a passing suite means nothing is broken.";

export const prompt = `Your task is to evaluate how well this repository's tests serve as a safety net for agent changes.

Step 1 — Find and run the tests
- Locate the test suite and run it. Note whether it passes, how long it takes, and how many tests there are.
- Is there a single command to run all tests? Is it documented?
- Can you run a subset (a single file or test) easily?

Step 2 — Assess what the tests cover
Look at a sample of test files and assess:
- Do tests cover core business logic, or mostly implementation details?
- Are there tests for edge cases and error paths, or only happy paths?
- Is there any coverage reporting available? Run it if so.

Step 3 — Make a small behaviour change and see if tests catch it
Pick a simple function or behaviour that has tests. Make a deliberate small mistake — change a return value, flip a condition, remove a field. Then run the tests and see if they catch it.

Report: would a passing test suite give an agent genuine confidence that its changes are correct, or is the coverage thin enough that tests could pass while hiding real breakage?`;
