import "./env.ts";
import { test, expect } from "bun:test";
import { pinJson, pinText, fetchText, isValidHash } from "../src/storage/og-storage-impl.js";

test("isValidHash only accepts 0x + 64 lowercase hex", () => {
  expect(isValidHash("0x" + "a".repeat(64))).toBe(true);
  expect(isValidHash("0x" + "A".repeat(64))).toBe(false);
  expect(isValidHash("notahash")).toBe(false);
  expect(isValidHash("../../../etc/passwd")).toBe(false);
  expect(isValidHash("0x" + "a".repeat(63))).toBe(false);
});

test("pinJson is deterministic and roundtrips", async () => {
  const h1 = await pinJson({ b: 2, a: 1 });
  const h2 = await pinJson({ a: 1, b: 2 });
  expect(h1).toBe(h2); // key order independent (top level)
  expect(isValidHash(h1)).toBe(true);
  const back = await fetchText(h1);
  expect(JSON.parse(back!)).toEqual({ a: 1, b: 2 });
});

test("fetchText rejects traversal / unknown", async () => {
  expect(await fetchText("../../../etc/passwd")).toBeNull();
  expect(await fetchText("0x" + "f".repeat(64))).toBeNull();
});

test("pinText roundtrips", async () => {
  const h = await pinText("hello world");
  expect(await fetchText(h)).toBe("hello world");
});
