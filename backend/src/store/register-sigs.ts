import { createHash } from "node:crypto";
import { getDb } from "./db.js";

// Single-use register signatures. Even though the signature now binds the full
// payload (C1), consuming it kills the ±10-min replay window entirely: a
// captured request can never be resubmitted.

export class RegisterReplayError extends Error {
  constructor() {
    super("register signature already used");
  }
}

export function consumeRegisterSig(signature: string, tokenId: string): void {
  const sigHash = createHash("sha256").update(signature.toLowerCase()).digest("hex");
  try {
    getDb().run("INSERT INTO consumed_register_sigs VALUES (?,?,?)", [
      sigHash,
      tokenId,
      Date.now(),
    ]);
  } catch (e) {
    if (e instanceof Error && /UNIQUE|constraint/i.test(e.message)) {
      throw new RegisterReplayError();
    }
    throw e;
  }
}
