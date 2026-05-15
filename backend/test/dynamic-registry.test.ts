import "./env.ts";
import { test, expect } from "bun:test";
import { dynamicRegistry } from "../src/store/dynamic-registry.js";

test("register / get / list / remove", async () => {
  await dynamicRegistry.register({
    tokenId: "100",
    ticker: "AAA",
    name: "Agent A",
    systemPrompt: "sp",
    priceUsdc: "100000",
    createdAt: Date.now(),
  });
  expect(dynamicRegistry.get(100n)?.ticker).toBe("AAA");

  const list = await dynamicRegistry.list();
  expect(list.some((e) => e.tokenId === "100")).toBe(true);

  await dynamicRegistry.remove("100");
  expect(dynamicRegistry.get(100n)).toBeUndefined();
});

test("concurrent registers do not corrupt the file", async () => {
  await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      dynamicRegistry.register({
        tokenId: `200${i}`,
        ticker: `T${i}`,
        name: `T${i}`,
        systemPrompt: "x",
        priceUsdc: "100000",
        createdAt: Date.now(),
      }),
    ),
  );
  const list = await dynamicRegistry.list();
  for (let i = 0; i < 20; i++) {
    expect(list.some((e) => e.tokenId === `200${i}`)).toBe(true);
  }
});
