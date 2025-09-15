FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage de pruebas (placeholder: cuando existan tests se ejecutarán aquí)
FROM builder AS test
ENV NODE_ENV=test
# RUN npm test --runInBand

# Prune dev deps para runtime
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime
ENV NODE_ENV=production TZ=UTC
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["node", "dist/cmd/server/main.js"]
