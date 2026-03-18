# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Gera os Prisma clients (tenant + master)
RUN npx prisma generate

# Compila o frontend React
RUN npm run build

# ── Stage 2: produção ─────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./

# Instala apenas dependências de produção (tsx está em dependencies)
RUN npm ci --omit=dev

# Copia artefatos do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY server ./server
COPY prisma ./prisma
COPY scripts ./scripts
COPY tsconfig*.json ./

EXPOSE 3001

CMD ["sh", "scripts/start.sh"]
