import { runConvexFunction } from "./convex-run.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required to record a publication outcome.`);
  }
  return value;
}

const targetEnvironment = required("PUBLICATION_TARGET_ENVIRONMENT");
if (targetEnvironment !== "preview" && targetEnvironment !== "production") {
  throw new Error(
    "PUBLICATION_TARGET_ENVIRONMENT must be preview or production.",
  );
}

const outcome = required("PUBLICATION_WORKFLOW_OUTCOME");
if (outcome !== "failure" && outcome !== "cancelled") {
  throw new Error("PUBLICATION_WORKFLOW_OUTCOME must be failure or cancelled.");
}

const result = runConvexFunction<{
  state: "release-failed" | "deployed";
}>(
  "publication:reconcileWorkflowOutcome",
  {
    publicationRequestKey: required("PUBLICATION_REQUEST_KEY"),
    publicationAttemptId: required("PUBLICATION_ATTEMPT_ID"),
    targetEnvironment,
    gitRef: required("PUBLICATION_GIT_REF"),
    runId: required("PUBLICATION_RUN_ID"),
    runUrl: required("PUBLICATION_RUN_URL"),
    outcome,
  },
  (value) => {
    if (
      typeof value !== "object" ||
      value === null ||
      !("state" in value) ||
      (value.state !== "release-failed" && value.state !== "deployed")
    ) {
      throw new Error("Convex returned an invalid publication outcome result.");
    }
    return { state: value.state };
  },
);

if (result.state === "deployed") {
  console.log("Publication was already deployed; late outcome ignored.");
} else {
  console.log("Terminal publication workflow outcome recorded.");
}
