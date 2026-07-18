# --- deps: cài dependency riêng để tận dụng cache layer ---
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- builder: build production ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js cần biến NEXT_PUBLIC_* tại thời điểm build (không phải chỉ runtime)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}
RUN pnpm build

# --- runner: image nhẹ chỉ chứa output cần thiết ---
# Yêu cầu next.config.js có: output: 'standalone'
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
