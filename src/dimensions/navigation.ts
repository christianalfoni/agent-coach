export const name = "Navigation Surface";

export const description =
  "How easy it is for an agent to orient and navigate the repository — whether the structure is predictable, entry points are obvious, and finding a specific file or feature requires minimal searching.";

export const prompt = `Your task is to evaluate how easy this repository is to navigate as an agent starting from scratch.

Step 1 — Orient from the root
Without reading every file, try to answer these questions using only the top-level structure:
- What does this project do?
- Where does the main application code live?
- Where are the tests?
- Where is configuration?

Note how confident you are in each answer and what you had to look at to get there.

Step 2 — Find three specific things
Pick three realistic tasks an agent might need to do and try to locate the relevant code:
- Find where a core domain concept is defined (a key model, type, or entity central to the app)
- Find where the main entry point or bootstrapping happens
- Find where a specific feature or user-facing behaviour is implemented (pick something meaningful from the README or CLAUDE.md)

For each: note how many steps it took, what you had to search through, and whether you ended up confident you found the right place.

Step 3 — Assess the structure
- Are files and folders named consistently and predictably?
- Are any files very large (hard to read in full)?
- Is there an architecture doc, module overview, or anything that gives a high-level map?

Report what was easy, what required searching, and what you never felt confident about.`;
