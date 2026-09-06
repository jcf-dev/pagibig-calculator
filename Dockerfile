# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /workspace/labs/pagibig-calculator

FROM base AS deps
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=site_shell . /workspace/packages/site-shell
RUN pnpm install --frozen-lockfile

FROM base AS builder
RUN corepack enable
ARG NEXT_PUBLIC_SITE_URL=https://joween.dev
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /workspace/labs/pagibig-calculator/node_modules ./node_modules
COPY --from=site_shell . /workspace/packages/site-shell
COPY . .
RUN pnpm build

FROM node:24-alpine AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /workspace/labs/pagibig-calculator/public ./public
COPY --from=builder --chown=nextjs:nodejs /workspace/labs/pagibig-calculator/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/labs/pagibig-calculator/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
