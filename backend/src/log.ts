// Structured logger. JSON one-line for prod (Railway/aggregators); a tidy
// human format in an interactive terminal. Force with LOG_FORMAT=json|pretty.

type Level = "info" | "warn" | "error";

const MODE =
  process.env.LOG_FORMAT ?? (process.stdout.isTTY ? "pretty" : "json");
const PRETTY = MODE === "pretty";

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  info: "\x1b[36m", // cyan
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};

function fmtFields(fields?: Record<string, unknown>): string {
  if (!fields) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    const val = typeof v === "string" || typeof v === "number" || typeof v === "boolean"
      ? String(v)
      : JSON.stringify(v);
    parts.push(`${C.dim}${k}=${C.reset}${val}`);
  }
  return parts.length ? "  " + parts.join(" ") : "";
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (!PRETTY) {
    out(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields }));
    return;
  }
  const t = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const tag = level.toUpperCase().padEnd(5);
  out(`${C.dim}${t}${C.reset} ${C[level]}${tag}${C.reset} ${msg}${fmtFields(fields)}`);
}

export const log = {
  info: (msg: string, fields?: Record<string, unknown>) => emit("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit("error", msg, fields),
};
