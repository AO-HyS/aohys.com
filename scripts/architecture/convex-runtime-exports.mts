import path from "node:path";
import { pathToFileURL } from "node:url";

// Evaluates Convex modules the way a Convex push does and prints, per module,
// each export that is a public function at runtime with what happens when an
// anonymous caller and a signed-in caller outside the allowlist invoke it
// through the entry point Convex uses, plus the routes served by the http.ts
// router. Used by public-function-guard.mjs, which runs it with a minimal
// environment, a timeout and never on "use node" modules; types can be
// widened and registrations replaced, runtime behavior cannot.

const [root, ...modules] = process.argv.slice(2);

// The two reads safeGetAuthUser makes for a signed-in caller, each answered
// once per invocation. Everything else (other syscalls, network) is refused and
// recorded, so work done before the caller is rejected is visible; refusals
// outside an invocation (module scope, timers, late work) are kept for the
// whole run, and the receipt is printed only once the event loop drains.
const OUTSIDER = {
  identity: { subject: "guard-user", sessionId: "guard-session" },
  session: { _id: "guard-session", userId: "guard-user" },
  user: { _id: "guard-user", email: "outsider@guard.invalid" },
};
type Caller = "anonymous" | "outsider";
const AUTH_LOOKUP = "_reference/childComponent/betterAuth/adapter/findOne";
let caller: Caller = "anonymous";
let answered = new Set<string>();
const touched: string[] = [];
const strayRefusals: string[] = [];
let invoking = false;
const refuse = (operation: string): never => {
  (invoking ? touched : strayRefusals).push(operation);
  throw new Error(`guard: ${operation} before authorization`);
};

type LookupCall = {
  udfType?: unknown;
  reference?: unknown;
  args?: {
    model?: unknown;
    where?: Array<{ field?: unknown; value?: unknown }>;
  };
};

function authLookup(operation: string, argsJson: string): string | undefined {
  const call = JSON.parse(argsJson) as LookupCall;
  const isQuery =
    (operation === "1.0/runUdf" && call.udfType === "query") ||
    operation === "1.0/actions/query";
  if (!isQuery || call.reference !== AUTH_LOOKUP) return undefined;
  const model = call.args?.model;
  const key = call.args?.where?.[0];
  if (typeof model !== "string" || answered.has(model) || key?.field !== "_id")
    return undefined;
  if (model === "session" && key.value === OUTSIDER.identity.sessionId) {
    answered.add(model);
    return JSON.stringify(OUTSIDER.session);
  }
  if (model === "user" && key.value === OUTSIDER.identity.subject) {
    answered.add(model);
    return JSON.stringify(OUTSIDER.user);
  }
  return undefined;
}

async function asyncSyscall(operation: string, argsJson: string) {
  if (invoking && operation === "1.0/getUserIdentity")
    return caller === "anonymous" ? "null" : JSON.stringify(OUTSIDER.identity);
  if (invoking && caller === "outsider") {
    const result = authLookup(operation, argsJson);
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
  answered = new Set();
  touched.length = 0;
  invoking = true;
  let rejection: string | null = null;
  try {
    await invoke(flags);
  } catch (error) {
    rejection = error instanceof Error ? error.message : String(error);
  }
  invoking = false;
  return { rejection, touched: [...touched] };
}

type Entry = {
  name: string;
  anonymous: Awaited<ReturnType<typeof outcome>>;
  outsider: Awaited<ReturnType<typeof outcome>>;
};

const loadedModules = new Map<string, Record<string, unknown>>();
for (const relative of modules)
  loadedModules.set(
    relative,
    (await import(
      pathToFileURL(path.join(root ?? ".", relative)).href
    )) as Record<string, unknown>,
  );

const publicExports: Record<string, Entry[]> = {};
let httpRoutes: string[] | undefined;
for (const [relative, loaded] of loadedModules) {
  publicExports[relative] = [];
  for (const [name, value] of Object.entries(loaded)) {
    if (!isPublicRegistration(value)) continue;
    publicExports[relative].push({
      name,
      anonymous: await outcome(value, "anonymous"),
      outsider: await outcome(value, "outsider"),
    });
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

let printed = false;
process.on("beforeExit", () => {
  if (printed) return;
  printed = true;
  console.log(JSON.stringify({ publicExports, httpRoutes, strayRefusals }));
});
