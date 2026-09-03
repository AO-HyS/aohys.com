#!/usr/bin/env node

import process from "node:process";

export const DOCTOR_APPS = {
  site: {
    defaultPort: 4321,
    localOrigins: ["http://localhost:4321"],
    path: "/",
  },
  dashboard: {
    defaultPort: 5180,
    localOrigins: ["http://127.0.0.1:5180"],
    path: "/dashboard",
  },
};

const PAGES_DEV_SUFFIX = ".aohys-com.pages.dev";
const PRODUCTION_ORIGINS = ["https://aohys.com", "https://www.aohys.com"];
const ENVIRONMENTS = new Set(["local", "preview", "production"]);

function option(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

export function resolveDoctorTarget(argv = process.argv.slice(2)) {
  const read = (name, fallback) => {
    const prefix = `--${name}=`;
    const value = argv.find((arg) => arg.startsWith(prefix));
    return value ? value.slice(prefix.length) : fallback;
  };

  const app = read("app", "site");
  const environment = read("env", "local");
  const config = DOCTOR_APPS[app];
  if (!config) throw new Error(`Unknown app: ${app}. Use site or dashboard.`);
  if (!ENVIRONMENTS.has(environment))
    throw new Error(`Unknown environment: ${environment}`);

  const baseUrl = read("url", config.localOrigins[0]);
  const base = new URL(baseUrl);
  if (environment === "local") {
    if (!config.localOrigins.includes(base.origin))
      throw new Error(
        `Local ${app} Doctor is confined to ${config.localOrigins.join(" or ")}`,
      );
  } else if (environment === "production") {
    if (!PRODUCTION_ORIGINS.includes(base.origin))
      throw new Error(
        `Production ${app} Doctor is confined to ${PRODUCTION_ORIGINS.join(" or ")}`,
      );
  } else {
    if (
      base.protocol !== "https:" ||
      !base.hostname.endsWith(PAGES_DEV_SUFFIX) ||
      base.hostname === `aohys-com${PAGES_DEV_SUFFIX}`
    )
      throw new Error(
        `${environment} ${app} Doctor requires a versioned Cloudflare Pages preview origin`,
      );
  }

  return { app, environment, target: new URL(config.path, base) };
}

if (process.argv[1]?.endsWith("product-verification-doctor.mjs")) {
  if (process.argv.includes("--help")) {
    console.log(
      "Usage: pnpm verify:product:doctor -- --app=<site|dashboard> --env=<local|preview|production> [--url=<origin>]",
    );
    process.exit(0);
  }

  const { app, environment, target } = resolveDoctorTarget();
  const response = await fetch(target, {
    redirect: "manual",
    credentials: "omit",
  });
  const status = response.status;
  if (!(status >= 200 && status < 400))
    throw new Error(
      `Readiness failed for ${app}/${environment}: ${target} returned HTTP ${status}`,
    );

  console.log(
    JSON.stringify({
      app,
      environment,
      target: target.toString(),
      status,
      finalUrl: response.url,
      ready: true,
    }),
  );
}
