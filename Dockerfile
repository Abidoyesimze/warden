# Warden backend (Express + SQLite) for Railway or any Docker host.
# Pins Node 22: the version the backend is tested on.
FROM node:22-bookworm-slim

WORKDIR /app

# better-sqlite3 compiles from source when no prebuilt binary matches.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Install only the backend and agent workspaces (not the Next.js frontend).
COPY package.json package-lock.json ./
COPY agent/package.json agent/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace backend --workspace agent --no-audit --no-fund --fetch-retries=5 --fetch-timeout=120000

COPY agent agent
COPY backend backend
COPY fixtures fixtures

ENV NODE_ENV=production
# SQLite DB and uploaded invoices live here; mount a volume at /app/data.
RUN mkdir -p /app/data

CMD ["npm", "run", "start", "-w", "backend"]
