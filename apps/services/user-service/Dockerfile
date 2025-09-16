FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci || echo "(Pendiente ajustar dependencias)"
COPY . .
# Placeholder build (si se agrega TS en futuro)

FROM node:20-alpine AS runtime
ENV NODE_ENV=production TZ=UTC
WORKDIR /app
RUN addgroup -S -g 1001 app && adduser -S -G app -u 1001 app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .
USER app
EXPOSE 8081
CMD ["node", "app.ts"]
