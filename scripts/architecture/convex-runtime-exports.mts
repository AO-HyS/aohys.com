import path from "node:path";
import { pathToFileURL } from "node:url";

// Evaluates Convex modules the way a Convex push does and prints, per module,
// each export that is a public function at runtime with what happens when an
// anonymous caller invokes it through the same entry point Convex uses, plus
// the routes served by the http.ts router. Used by public-function-guard.mjs;
// types can be widened and registrations replaced, runtime behavior cannot.

const [root, ...modules] = process.argv.slice(2);

// Every syscall except the identity lookup is recorded and refused, so a
// handler that reads or writes before rejecting the caller is visible.
const touched: string[] = [];
const refuse = (op: string): never => {
  touched.push(op);
  throw new Error(`guard: syscall ${op} before authorization`);
};
Object.assign(globalThis, {
  Convex: {
    syscall: (op: string) => refuse(op),
    asyncSyscall: (op: string) =>
      op === "1.0/getUserIdentity"
        ? Promise.resolve("null")
        : Promise.resolve().then(() => refuse(op)),
    jsSyscall: (op: string) => refuse(op),
  },
});

type Flags = Record<string, unknown>;

function isPublicRegistration(value: unknown): value is Flags {
  if (!value || (typeof value !== "object" && typeof value !== "function"))
    return false;
  const flags = value as Flags;
  if (flags.isHttp === true || flags.isPublic === true) return true;
  const registered =
    flags.isQuery === true ||
    flags.isMutation === true ||
    flags.isAction === true ||
    flags.isConvexFunction === true;
  return registered && flags.isInternal !== true;
}

async function invokeAnonymously(flags: Flags) {
  const args = JSON.stringify([{}]);
  const call = (invoke: unknown, ...rest: string[]) =>
    typeof invoke === "function"
      ? (invoke as (...values: string[]) => Promise<unknown>)(...rest)
      : Promise.reject(new Error("guard: no Convex entry point"));
  if (flags.isQuery === true) return call(flags.invokeQuery, args);
  if (flags.isMutation === true) return call(flags.invokeMutation, args);
  if (flags.isAction === true) return call(flags.invokeAction, "", args);
  throw new Error("guard: not a query, mutation or action");
}

const publicExports: Record<
  string,
  Array<{ name: string; rejection: string | null; touched: string[] }>
> = {};
let httpRoutes: string[] | undefined;
for (const relative of modules) {
  const loaded = (await import(
    pathToFileURL(path.join(root ?? ".", relative)).href
  )) as Record<string, unknown>;
  publicExports[relative] = [];
  for (const [name, value] of Object.entries(loaded)) {
    if (!isPublicRegistration(value)) continue;
    touched.length = 0;
    let rejection: string | null = null;
    try {
      await invokeAnonymously(value);
    } catch (error) {
      rejection = error instanceof Error ? error.message : String(error);
    }
    publicExports[relative].push({ name, rejection, touched: [...touched] });
  }
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
