import { getEnvironmentVariableDefinitions } from "@aohys/environment";
import {
  buildCloudflarePagesDeployPlan,
  validateReleaseEnvironment,
} from "@aohys/release-train";
import {
  RELEASE_ENVIRONMENTS,
  type ReleaseEnvironment,
} from "@aohys/core/domain";

function parseEnvironment(input: string | undefined): ReleaseEnvironment {
  if (RELEASE_ENVIRONMENTS.includes(input as ReleaseEnvironment)) {
    return input as ReleaseEnvironment;
  }

  throw new Error(
    "Usage: tsx scripts/validate-release-env.ts <preview|production>",
  );
}

function collectEnvironmentValues(): Record<string, string | undefined> {
  return Object.fromEntries(
    getEnvironmentVariableDefinitions().map((definition) => {
      const value = process.env[definition.name]?.trim();
      return [definition.name, value ? value : undefined];
    }),
  );
}

try {
  const environment = parseEnvironment(process.argv[2]);
  const plan = buildCloudflarePagesDeployPlan(environment);
  const result = validateReleaseEnvironment(
    environment,
    collectEnvironmentValues(),
  );

  if (!result.ok) {
    console.error(`${environment} release environment is not valid:`);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `${environment} release environment is valid for ${plan.siteUrl}.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
