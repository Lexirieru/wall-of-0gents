import "./env.ts";
import { test, expect } from "bun:test";
import { consumePayment, isPaymentConsumed, PaymentReplayError } from "../src/store/payments.js";

const TX = ("0x" + "a".repeat(64)) as `0x${string}`;
const SUB = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`;

test("first consume succeeds, replay throws", () => {
  expect(isPaymentConsumed(TX)).toBe(false);
  consumePayment(TX, 1n, SUB, 500_000n);
  expect(isPaymentConsumed(TX)).toBe(true);

  expect(() => consumePayment(TX, 1n, SUB, 500_000n)).toThrow(PaymentReplayError);
  // even a different (tokenId, subscriber) cannot reuse the same tx
  expect(() => consumePayment(TX, 2n, SUB, 999n)).toThrow(PaymentReplayError);
});

test("case-insensitive on txHash", () => {
  const tx2 = ("0x" + "B".repeat(64)) as `0x${string}`;
  consumePayment(tx2, 1n, SUB, 1n);
  expect(isPaymentConsumed(("0x" + "b".repeat(64)))).toBe(true);
});
