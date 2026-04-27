export type Priority = "critical" | "high" | "medium" | "low";

export interface Finding {
  priority: Priority;
  observation: string;
  action: string;
}

export interface DimensionResult {
  name: string;
  score: number;
  findings: Finding[];
}

export const DIMENSIONS = [
  "environment",
  "instructions",
  "navigation",
  "contract",
  "tests",
  "verification",
] as const;

export type DimensionId = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<DimensionId, string> = {
  environment: "Environment Reproducibility",
  instructions: "Agent Instructions",
  navigation: "Navigation Surface",
  contract: "Type / Contract Surface",
  tests: "Test Surface",
  verification: "Verification Surface",
};
