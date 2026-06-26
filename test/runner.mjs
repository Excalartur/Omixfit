// Sets a localStorage shim, then loads the bundled smoke test (whose top-level
// store init reads localStorage). Keeps the engine code unmodified for tests.
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};
globalThis.window = { matchMedia: () => ({ matches: false }) };
await import("./smoke.cjs");
