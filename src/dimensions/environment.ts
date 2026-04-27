export const name = "Environment Reproducibility";

export const description =
  "How well the repository supports clean, automated environment setup for agent iteration — specifically whether a git worktree can be created, dependencies installed without manual steps, and the test or build command run successfully in that isolated environment.";

export const prompt = `Your task is to evaluate how well this repository supports clean environment setup for agent workflows.

Follow these steps:
1. Create a git worktree of this repository at /tmp/repo-score-env-$$
2. In the worktree, find and run the setup command (look for npm install, pip install, make setup, yarn install, etc.)
3. Note how long setup takes
4. Try to run the test or build command to verify the environment actually works
5. Clean up the worktree when done (git worktree remove --force)

As you work, note:
- Whether setup requires manual steps or missing documentation
- Whether any environment variables or secrets are needed but not documented
- Whether the test/build command succeeds in a clean environment
- Any friction an agent would encounter when trying to iterate in this repo

Be thorough and report exactly what you find.`;
