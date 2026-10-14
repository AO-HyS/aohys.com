import path from "node:path";
import { pathToFileURL } from "node:url";

// Evaluates Convex modules the way a Convex push does and prints, per module,
// the exports that are public functions at runtime, plus the routes served by
// the http.ts router. Used by
// public-function-guard.mjs; types can be widened, runtime flags cannot.

const [root, ...modules] = process.argv.slice(2);

function isPublicRegistration(value: unknown): boolean {
  if (!value || (typeof value !== "object" && typeof value !== "function"))
    return false;
  const flags = value as Record<string, unknown>;
  if (flags.isHttp === true || flags.isPublic === true) return true;
  const registered =
    flags.isQuery === true ||
    flags.isMutation === true ||
    flags.isAction === true ||
    flags.isConvexFunction === true;
  return registered && flags.isInternal !== true;
}

const publicExports: Record<string, string[]> = {};
let httpRoutes: string[] | undefined;
for (const relative of modules) {
  const loaded = (await import(
    pathToFileURL(path.join(root ?? ".", relative)).href
  )) as Record<string, unknown>;
  publicExports[relative] = Object.keys(loaded).filter((name) =>
    isPublicRegistration(loaded[name]),
  );
  const router = loaded.default as
    | { isRouter?: unknown; getRoutes?: () => Array<[string, string]> }
    | undefined;
  if (
    relative.endsWith("/convex/http.ts") &&
    router?.isRouter === true &&
    typeof router.getRoutes === "function"
  )
    httpRoutes = router
      .getRoutes()
      .map(([routePath, method]) => `${method} ${routePath}`);
}
console.log(JSON.stringify({ publicExports, httpRoutes }));
