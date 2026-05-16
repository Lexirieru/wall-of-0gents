# Wall of 0gents operator node — production image (Railway).
FROM oven/bun:1.3-slim

WORKDIR /app

# Install deps from the lockfile first (cached layer).
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# App source.
COPY . .

# Listens on $PORT (Railway injects it; HTTP_PORT falls back to it).
# Data is written under paths set by AGENTS_DATA_DIR / RECEIPTS_DB_PATH —
# point those at a mounted Railway Volume (e.g. /data).
ENV NODE_ENV=production
EXPOSE 8402

CMD ["bun", "run", "src/index.ts"]
