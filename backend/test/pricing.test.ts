import "./env.ts";
import { test, expect } from "bun:test";
import { priceFor } from "../src/runtime/pricing.js";
import { dynamicRegistry } from "../src/store/dynamic-registry.js";

test("static price for token 1, default otherwise", () => {
  expect(priceFor(1n)).toBe(1_000_000n);
  expect(priceFor(999n)).toBe(400n); // DEFAULT_PRICE
});

test("registered priceUsdc overrides static/default", async () => {
  await dynamicRegistry.register({
    tokenId: "42",
    ticker: "FOO",
    name: "Foo",
    systemPrompt: "x",
    priceUsdc: "250000",
    createdAt: Date.now(),
  });
  expect(priceFor(42n)).toBe(250_000n);
});

test("invalid/zero registry price falls back, never free", async () => {
  await dynamicRegistry.register({
    tokenId: "43",
    ticker: "BAR",
    name: "Bar",
    systemPrompt: "x",
    priceUsdc: "0",
    createdAt: Date.now(),
  });
  expect(priceFor(43n)).toBe(400n); // floor: zero registry price → DEFAULT_PRICE, never free

  await dynamicRegistry.register({
    tokenId: "44",
    ticker: "BAZ",
    name: "Baz",
    systemPrompt: "x",
    priceUsdc: "abc",
    createdAt: Date.now(),
  });
  expect(priceFor(44n)).toBe(400n); // non-numeric registry price → DEFAULT_PRICE
});
