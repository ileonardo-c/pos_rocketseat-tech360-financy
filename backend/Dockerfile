FROM node:20-bookworm-slim
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.5.0 --activate

COPY package.json pnpm-workspace.yaml .npmrc* ./
COPY backend ./backend

RUN pnpm install
RUN pnpm --filter @financy/backend prisma:generate

CMD ["pnpm", "--filter", "@financy/backend", "dev"]
