FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build TypeScript to JavaScript
RUN npx tsc --build

FROM node:20-alpine AS test
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .
ENV NODE_ENV=test
RUN npm test

FROM node:20-alpine AS runtime
ENV NODE_ENV=production TZ=UTC
WORKDIR /app
RUN apk add --no-cache curl
RUN addgroup -S -g 1001 app && adduser -S -G app -u 1001 app

# Copy built JavaScript files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./.env

USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]