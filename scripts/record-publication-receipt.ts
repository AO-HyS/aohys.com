import { runConvexFunction } from "./convex-run.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`${name} is required to record a publication receipt.`);
  return value;
}

const targetEnvironment = required("PUBLICATION_TARGET_ENVIRONMENT");
if (targetEnvironment !== "preview" && targetEnvironment !== "production") {
  throw new Error(
    "PUBLICATION_TARGET_ENVIRONMENT must be preview or production.",
  );
}

const receipt = runConvexFunction<{ state: "deployed" }>(
  "publication:recordReceipt",
  {
    publicationRequestKey: required("PUBLICATION_REQUEST_KEY"),
    publicationAttemptId: required("PUBLICATION_ATTEMPT_ID"),
    targetEnvironment,
    gitRef: required("PUBLICATION_GIT_REF"),
    runId: required("PUBLICATION_RUN_ID"),
    runUrl: required("PUBLICATION_RUN_URL"),
    sha: required("PUBLICATION_RELEASE_SHA"),
    smokePassed: true,
  },
  (value) => {
    if (
      typeof value !== "object" ||
      value === null ||
      !("state" in value) ||
      value.state !== "deployed"
    ) {
      throw new Error("Convex returned an invalid publication receipt result.");
    }
    return { state: "deployed" };
  },
);

if (receipt.state !== "deployed") {
  throw new Error(
    "Convex did not confirm the publication receipt as deployed.",
  );
}

console.log("Verified publication receipt recorded.");
