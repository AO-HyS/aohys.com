// Guards for untrusted values at runtime edges. No imports, so plain Node .mjs
// scripts can load this file directly.

export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
