import { type ReleaseEnvironment } from "@aohys/core/domain";
import { buildCloudflarePagesDeployPlan } from "./deploy-plan.js";

// The ordered steps of a release. scripts/release.ts runs them and prints them
// with --plan; the release workflow calls `pnpm release <environment>`.
export interface ReleaseStep {
  name: string;
  command: readonly string[];
  // Set for the step only.
  env?: Readonly<Record<string, string>>;
  // Removed from the step's environment, so the deploy key decides the target.
  unsetEnv?: readonly string[];
}

export function buildReleasePlan(
  environment: ReleaseEnvironment,
): ReleaseStep[] {
  const pages = buildCloudflarePagesDeployPlan(environment);
  const script = (name: string, scriptName = name): ReleaseStep => ({
    name,
    command: ["pnpm", "run", scriptName],
  });

  return [
    script("validate release environment", `release:env:${environment}`),
    script("audit observability environment", "observability:audit:deploy"),
    script("audit PostHog environment separation", "audit:posthog-env"),
    script(
      "sync Cloudflare Pages runtime",
      `sync:cloudflare-pages-runtime:${environment}`,
    ),
    script("audit Cloudflare Pages runtime", "audit:cloudflare-pages-runtime"),
    script("sync Convex runtime", `sync:convex-env:${environment}`),
    {
      name: "deploy Convex",
      command: [
        "pnpm",
        "--filter",
        "@aohys/backend",
        "exec",
        "convex",
        "deploy",
        "--typecheck",
        "enable",
        "--codegen",
        "enable",
        "--message",
        `${environment} release`,
      ],
      unsetEnv: ["CONVEX_DEPLOYMENT"],
    },
    ...(environment === "preview"
      ? [script("seed preview dashboard", "seed:dashboard:preview")]
      : []),
    script("apply published dashboard content", "publish:content:build"),
    {
      name: "verify published content",
      command: ["pnpm", "run", "verify:published-content"],
      env: { AOHYS_DASHBOARD_CONTENT_APPLIED: "1" },
    },
    {
      name: "deploy Cloudflare Pages",
      command: ["pnpm", "exec", ...pages.command],
    },
    ...(environment === "production"
      ? [
          script(
            "ensure production domain",
            "ensure:cloudflare-production-domain",
          ),
        ]
      : []),
  ];
}

// A step as a shell command line, as the retired package.json chains wrote it.
export function formatReleaseStep(step: ReleaseStep): string {
  const quote = (value: string) =>
    /^[\w@:./=-]+$/u.test(value) ? value : JSON.stringify(value);
  return [
    ...(step.unsetEnv ?? []).flatMap((name) => ["env", "-u", name]),
    ...Object.entries(step.env ?? {}).map(
      ([name, value]) => `${name}=${value}`,
    ),
    ...step.command.map(quote),
  ].join(" ");
}
