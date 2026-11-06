FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV CHECKPOINT_DISABLE=1

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CHECKPOINT_DISABLE=1

RUN apk add --no-cache libc6-compat

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/next.config.mjs ./

RUN mkdir -p /app/storage

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && npm start"]
