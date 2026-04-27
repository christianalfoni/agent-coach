export const name = "Type / Contract Surface";

export const description =
  "How well the repository expresses its data shapes and interfaces explicitly — whether types, schemas, and contracts are present, strict, and useful for an agent trying to make changes without introducing type errors or breaking data assumptions.";

export const prompt = `Your task is to evaluate how well this repository expresses its data shapes and contracts.

Step 1 — Find the type system
- Is there a type configuration (tsconfig.json, mypy.ini, pyrightconfig.json, etc.)? Is strict mode enabled?
- Are there schema files (OpenAPI, GraphQL, JSON Schema, Zod, Pydantic, etc.)?
- Run the type checker if one exists and note whether it passes cleanly.

Step 2 — Pick a core data shape and trace it
Find the most important domain model or data structure in the codebase (a User, an Order, a central entity — whatever fits this project). Then:
- Is it fully typed or does it rely on \`any\`, untyped dicts, or implicit shapes?
- Can you tell from the types alone what fields are required vs optional?
- If you added a new required field, would the type checker catch all the places that need updating?

Step 3 — Assess API and boundary contracts
- Are external API responses typed or validated at the boundary?
- Are there runtime validators (Zod, Pydantic, io-ts, etc.) or only compile-time types?
- Could an agent safely make a change to a shared type and know where it would break?

Report what is explicitly typed and enforced vs. what relies on implicit conventions or is effectively untyped.`;
