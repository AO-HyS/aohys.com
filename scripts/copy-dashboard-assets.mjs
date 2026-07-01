import { cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboardDist = path.join(root, "apps/dashboard/dist");
const siteDashboardDist = path.join(root, "apps/site/dist/dashboard-app");

await rm(siteDashboardDist, { force: true, recursive: true });
await cp(dashboardDist, siteDashboardDist, { recursive: true });

console.log(`Copied dashboard assets to ${siteDashboardDist}`);
