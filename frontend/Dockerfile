FROM node:20-alpine
WORKDIR /app

RUN corepack enable
RUN corepack prepare pnpm@10.5.0 --activate

COPY package.json pnpm-workspace.yaml .npmrc* ./
COPY frontend ./frontend

RUN pnpm install

CMD ["pnpm", "--filter", "frontend", "dev", "--", "--host", "0.0.0.0"]
