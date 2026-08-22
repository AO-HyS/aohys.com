import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateAlertCatalog } from "./validate-alert-catalog.mjs";

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));

test("every actionable alert is baseline-derived and operationally complete", async () => {
  const catalog = await readJson(
    "../../docs/observability/alert-catalog.v1.json",
  );
  const baseline = await readJson(
    "../../docs/research/im-12-performance-baseline.json",
  );
  assert.deepEqual(validateAlertCatalog(catalog, baseline), []);
  assert.equal(catalog.alerts[0].threshold.value, 1);
  assert.ok(catalog.alerts.every((alert) => alert.owner && alert.runbook));
  assert.ok(catalog.alerts.every((alert) => alert.signal.correlation.release));
  assert.ok(
    catalog.alerts.every((alert) => alert.deduplication.quietPeriodMinutes > 0),
  );
});

test("unproven and report-only signals cannot acquire numeric thresholds", async () => {
  const catalog = await readJson(
    "../../docs/observability/alert-catalog.v1.json",
  );
  const baseline = await readJson(
    "../../docs/research/im-12-performance-baseline.json",
  );
  catalog.reportOnlySignals[0].numericThreshold = 200000;
  const errors = validateAlertCatalog(catalog, baseline);
  assert.ok(
    errors.some((error) => error.includes("numericThreshold must be null")),
  );
});

test("an arbitrary threshold fails when it differs from the measured baseline", async () => {
  const catalog = await readJson(
    "../../docs/observability/alert-catalog.v1.json",
  );
  const baseline = await readJson(
    "../../docs/research/im-12-performance-baseline.json",
  );
  catalog.alerts[0].threshold.value = 2;
  const errors = validateAlertCatalog(catalog, baseline);
  assert.ok(
    errors.some((error) =>
      error.includes("must equal its measured baseline value"),
    ),
  );
});

test("an alert cannot point at an unmeasured signal or lose release correlation", async () => {
  const catalog = await readJson(
    "../../docs/observability/alert-catalog.v1.json",
  );
  const baseline = await readJson(
    "../../docs/research/im-12-performance-baseline.json",
  );
  catalog.alerts[0].signal.metricPath = "/observations/publicSite/missing";
  delete catalog.alerts[0].signal.correlation.release;
  const errors = validateAlertCatalog(catalog, baseline);
  assert.ok(errors.some((error) => error.includes("metricPath must resolve")));
  assert.ok(errors.some((error) => error.includes("must map release")));
});

test("threshold derivation must use the measured signal rather than a budget constant", async () => {
  const catalog = await readJson(
    "../../docs/observability/alert-catalog.v1.json",
  );
  const baseline = await readJson(
    "../../docs/research/im-12-performance-baseline.json",
  );
  catalog.alerts[0].threshold.derivation.jsonPointer =
    "/budgets/publicSite/workArchiveEagerImages/expected";
  const errors = validateAlertCatalog(catalog, baseline);
  assert.ok(
    errors.some((error) =>
      error.includes("directly from its signal metricPath"),
    ),
  );
});
