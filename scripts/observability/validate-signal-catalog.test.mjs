import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateSignalCatalog } from "./validate-signal-catalog.mjs";

const catalogUrl = new URL(
  "../../docs/observability/signal-catalog.v1.json",
  import.meta.url,
);

test("the versioned signal catalog satisfies its structural and PII contract", async () => {
  const catalog = JSON.parse(await readFile(catalogUrl, "utf8"));
  assert.deepEqual(validateSignalCatalog(catalog), []);
  assert.equal(catalog.provider.canonicalProjectId, "489978");
  assert.equal(catalog.provider.historicalConflictingProjectId, "492205");
});

test("the validator rejects missing ownership and PII properties", () => {
  const errors = validateSignalCatalog({
    schemaVersion: 1,
    provider: {},
    journeys: [
      {
        id: "contact",
        owner: "",
        purpose: "test",
        privacy: "test",
        retention: { days: 30, rationale: "test" },
        signals: [{ event: "lead", properties: ["email", "message"] }],
      },
    ],
  });
  assert.ok(errors.some((error) => error.includes("owner")));
  assert.ok(errors.some((error) => error.includes("email")));
  assert.ok(errors.some((error) => error.includes("message")));
});
