// Shared test env. Imported for side-effects FIRST in every test file, before
// any module that reads `cfg` (config.ts calls process.exit on invalid env).
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "wall0g-test-"));

process.env.RECEIPTS_DB_PATH = join(dir, "receipts.db");
process.env.AGENTS_DATA_DIR = join(dir, "agents");
// Well-known Anvil account #1 — deterministic, overrides any .env so tests
// never depend on (or leak) the real operator key.
process.env.OPERATOR_PRIVATE_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
process.env.OPERATOR_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
process.env.WALL_AGENT_NFT = "0x0000000000000000000000000000000000000001";
process.env.WALL_REGISTRY = "0x0000000000000000000000000000000000000002";
process.env.WALL_MARKET = "0x0000000000000000000000000000000000000003";

export const TEST_DIR = dir;
