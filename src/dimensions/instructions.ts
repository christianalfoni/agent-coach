export const name = "Agent Instructions";

export const description =
  "How well the repository documents itself for an agent starting from scratch — specifically whether CLAUDE.md or equivalent exists, whether it documents the commands needed to work in the repo (test, build, lint), and whether those commands actually work as documented.";

export const prompt = `You are a fresh agent that has just been dropped into this repository for the first time. You have no prior knowledge of it.

Your task is to orient yourself to this repo as quickly as possible, then verify what you find. Work through these steps:

1. Look for any agent instruction files (CLAUDE.md, AGENTS.md, .cursorrules, or similar) and read them
2. Look for a README and note what it tells you about running the project
3. Based on what you found (or didn't find), try to locate the following commands:
   - How to run tests
   - How to build the project
   - How to run the linter or type checker
4. Actually run each command you find and note whether it succeeds
5. Note anything that surprised you, was missing, was wrong, or required extra discovery

Be explicit about what came from documentation vs. what you had to figure out yourself. If a documented command fails or doesn't exist, say so.`;
