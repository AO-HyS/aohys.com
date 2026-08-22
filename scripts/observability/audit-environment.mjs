import { fileURLToPath } from "node:url";

const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/;

export function auditObservabilityEnvironment(values) {
  const errors = [];
  const environment = values.AOHYS_ENV;
  if (!["local", "preview", "production"].includes(environment)) {
    return ["AOHYS_ENV must be local, preview, or production"];
  }

  const publicRelease = values.PUBLIC_RELEASE_SHA?.trim().toLowerCase();
  const dashboardRelease = values.VITE_RELEASE_SHA?.trim().toLowerCase();
  if (environment === "production") {
    let hostname;
    try {
      hostname = new URL(values.PUBLIC_SITE_URL ?? "").hostname;
    } catch {
      hostname = undefined;
    }
    if (hostname !== "aohys.com")
      errors.push("production host must be aohys.com");
    if (!values.PUBLIC_POSTHOG_KEY?.trim())
      errors.push("production PostHog key is required");
    if (!publicRelease || !RELEASE_SHA_PATTERN.test(publicRelease)) {
      errors.push("PUBLIC_RELEASE_SHA must be a full git SHA");
    }
    if (!dashboardRelease || !RELEASE_SHA_PATTERN.test(dashboardRelease)) {
      errors.push("VITE_RELEASE_SHA must be a full git SHA");
    }
    if (
      publicRelease &&
      dashboardRelease &&
      publicRelease !== dashboardRelease
    ) {
      errors.push("browser, edge, and backend release SHAs must match");
    }
  } else if (values.ANALYTICS_CAPTURE_ENABLED === "true") {
    errors.push("analytics capture must remain disabled outside production");
  }

  return errors;
}

const isCli =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const errors = auditObservabilityEnvironment(process.env);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Observability environment contract valid.");
  }
}
