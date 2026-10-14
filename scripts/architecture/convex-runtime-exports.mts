import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Evaluates Convex modules the way a Convex push does and prints, per module,
// each export that is a public function at runtime with what happens when an
// anonymous caller and a signed-in caller outside the allowlist invoke it
// through the entry point Convex uses, plus the routes served by the http.ts
// router. Used by public-function-guard.mjs, which runs it with a minimal
// environment; types can be widened and registrations replaced, runtime
// behavior cannot.

const [root, ...modules] = process.argv.slice(2);

// The two reads safeGetAuthUser makes for a signed-in caller. Everything else
// (other syscalls, network) is refused and recorded, so work done before the
// caller is rejected is visible.
const OUTSIDER = {
  identity: { subject: "guard-user", sessionId: "guard-session" },
  session: { _id: "guard-session", userId: "guard-user" },
  user: { _id: "guard-user", email: "outsider@guard.invalid" },
};
type Caller = "anonymous" | "outsider";
let caller: Caller = "anonymous";
const touched: string[] = [];
const refuse = (operation: string): never => {
  touched.push(operation);
  throw new Error(`guard: ${operation} before authorization`);
};

function authLookup(argsJson: string): string | undefined {
  const parsed = JSON.parse(argsJson) as { args?: { model?: unknown } };
  const model = parsed.args?.model;
  if (model === "session") return JSON.stringify(OUTSIDER.session);
  if (model === "user") return JSON.stringify(OUTSIDER.user);
  return undefined;
}

async function asyncSyscall(operation: string, argsJson: string) {
  if (operation === "1.0/getUserIdentity")
    return caller === "anonymous" ? "null" : JSON.stringify(OUTSIDER.identity);
  if (
    caller === "outsider" &&
    (operation === "1.0/runUdf" || operation === "1.0/actions/query")
  ) {
    const result = authLookup(argsJson);
    if (result !== undefined) return result;
  }
  return refuse(operation);
}

Object.assign(globalThis, {
  Convex: {
    syscall: (operation: string) => refuse(operation),
    asyncSyscall,
    jsSyscall: (operation: string) => refuse(operation),
  },
  fetch: () => Promise.resolve().then(() => refuse("fetch")),
  WebSocket: function WebSocket() {
    refuse("WebSocket");
  },
  EventSource: function EventSource() {
    refuse("EventSource");
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

function invoke(flags: Flags) {
  const args = JSON.stringify([{}]);
  const call = (entry: unknown, ...rest: string[]) =>
    typeof entry === "function"
      ? (entry as (...values: string[]) => Promise<unknown>)(...rest)
      : Promise.reject(new Error("guard: no Convex entry point"));
  if (flags.isQuery === true) return call(flags.invokeQuery, args);
  if (flags.isMutation === true) return call(flags.invokeMutation, args);
  if (flags.isAction === true) return call(flags.invokeAction, "", args);
  return Promise.reject(new Error("guard: not a query, mutation or action"));
}

async function outcome(flags: Flags, as: Caller) {
  caller = as;
  touched.length = 0;
  let rejection: string | null = null;
  try {
    await invoke(flags);
  } catch (error) {
    rejection = error instanceof Error ? error.message : String(error);
  }
  return { rejection, touched: [...touched] };
}

type Entry = {
  name: string;
  nodeRuntime: boolean;
  anonymous?: Awaited<ReturnType<typeof outcome>>;
  outsider?: Awaited<ReturnType<typeof outcome>>;
};

const publicExports: Record<string, Entry[]> = {};
let httpRoutes: string[] | undefined;
for (const relative of modules) {
  const filePath = path.join(root ?? ".", relative);
  // Node actions are never invoked here; the guard rejects public exports in
  // them instead.
  const nodeRuntime = /^\s*["']use node["']/u.test(
    readFileSync(filePath, "utf8"),
  );
  const loaded = (await import(pathToFileURL(filePath).href)) as Record<
    string,
    unknown
  >;
  publicExports[relative] = [];
  for (const [name, value] of Object.entries(loaded)) {
    if (!isPublicRegistration(value)) continue;
    publicExports[relative].push(
      nodeRuntime
        ? { name, nodeRuntime }
        : {
            name,
            nodeRuntime,
            anonymous: await outcome(value, "anonymous"),
            outsider: await outcome(value, "outsider"),
          },
    );
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
