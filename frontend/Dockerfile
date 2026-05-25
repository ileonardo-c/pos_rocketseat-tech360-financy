FROM node:20-bookworm-slim
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.5.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

RUN pnpm install --frozen-lockfile --filter @financy/frontend...

COPY frontend ./frontend

CMD ["pnpm", "--filter", "@financy/frontend", "dev", "--host", "0.0.0.0", "--port", "5173"]
