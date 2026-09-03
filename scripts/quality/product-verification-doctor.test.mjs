import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveDoctorTarget } from "./product-verification-doctor.mjs";

const script = new URL("./product-verification-doctor.mjs", import.meta.url)
  .pathname;

test("doctor exposes a bounded help contract", () => {
  const output = execFileSync(process.execPath, [script, "--help"], {
    encoding: "utf8",
  });
  assert.match(output, /--app=<site\|dashboard>/);
  assert.match(output, /--env=<local\|preview\|production>/);
});

test("production doctor is read-only and confined to canonical origins", () => {
  let error;
  try {
    execFileSync(process.execPath, [script, "--env=production"], {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (caught) {
    error = caught;
  }
  assert.ok(error);
  assert.match(
    String(error.stderr),
    /Production site Doctor is confined to https:\/\/aohys\.com or https:\/\/www\.aohys\.com/,
  );

  const { environment, target } = resolveDoctorTarget([
    "--app=site",
    "--env=production",
    "--url=https://www.aohys.com",
  ]);
  assert.equal(environment, "production");
  assert.equal(target.toString(), "https://www.aohys.com/");
});

test("doctor is confined to the declared loopback app origins", () => {
  const source = readFileSync(script, "utf8");
  assert.match(source, /localOrigins: \["http:\/\/localhost:4321"\]/);
  assert.match(source, /localOrigins: \["http:\/\/127\.0\.0\.1:5180"\]/);
  assert.match(source, /localOrigins\.includes\(base\.origin\)/);
  assert.match(
    source,
    /confined to \$\{config\.localOrigins\.join\(" or "\)\}/,
  );
});

test("preview requires a versioned Cloudflare Pages preview origin", () => {
  let error;
  try {
    execFileSync(
      process.execPath,
      [
        script,
        "--app=site",
        "--env=preview",
        "--url=https://aohys-com.pages.dev",
      ],
      { encoding: "utf8", stdio: "pipe" },
    );
  } catch (caught) {
    error = caught;
  }
  assert.ok(error);
  assert.match(
    String(error.stderr),
    /versioned Cloudflare Pages preview origin/,
  );
});

test("doctor accepts a reachable 2xx or 3xx route and never follows a redirect", () => {
  const source = readFileSync(script, "utf8");
  assert.match(source, /status >= 200 && status < 400/);
  assert.match(source, /redirect: "manual"/);
  assert.match(source, /credentials: "omit"/);
  assert.doesNotMatch(source, /redirect: "follow"/);
});

test("doctor defaults each app to its declared local origin", () => {
  const source = readFileSync(script, "utf8");
  assert.match(source, /read\("url", config\.localOrigins\[0\]\)/);
  assert.doesNotMatch(
    source,
    /http:\/\/127\.0\.0\.1:\$\{config\.defaultPort\}/,
  );
});

test("doctor declares collision-free local verification ports", () => {
  const source = readFileSync(script, "utf8");
  assert.match(
    source,
    /site: \{/,
    "site and dashboard origins must be declared",
  );
  assert.match(source, /defaultPort: 4321/);
  assert.match(source, /defaultPort: 5180/);
  assert.doesNotMatch(source, /defaultPort: 300[0-9]/);
});
