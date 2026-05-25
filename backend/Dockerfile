FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN corepack enable
RUN corepack prepare pnpm@10.5.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

RUN pnpm install --frozen-lockfile --filter @financy/backend...

COPY backend ./backend
COPY scripts ./scripts
RUN pnpm --filter @financy/backend prisma:generate

CMD ["pnpm", "--filter", "@financy/backend", "dev"]
