import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderCloudflarePagesStaticHeaders } from "../apps/site/src/security-headers.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const headersPath = path.join(root, "apps/site/public/_headers");
const expectedHeaders = renderCloudflarePagesStaticHeaders();
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
  const currentHeaders = await readFile(headersPath, "utf8");

  if (currentHeaders !== expectedHeaders) {
    throw new Error(
      "apps/site/public/_headers is out of sync. Run `pnpm --filter @aohys/site sync:headers`.",
    );
  }
} else {
  await writeFile(headersPath, expectedHeaders);
  console.log(`Synced ${path.relative(root, headersPath)} from apps/site/src/security-headers.ts`);
}
