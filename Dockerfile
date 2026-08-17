# Multi-stage Dockerfile for Movie Diary
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY server/package*.json ./server/
COPY web/package*.json ./web/

RUN npm install

# Copy source files
COPY . .

# Generate Prisma Client & Build both server and web
RUN npx prisma generate --schema=server/prisma/schema.prisma
RUN npm run build

# Production runner image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY server/package*.json ./server/
COPY web/package*.json ./web/

# Install only production dependencies
RUN npm install --omit=dev

# Copy generated Prisma Client & build artifacts
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/web/dist ./web/dist

EXPOSE 4000

# Push DB schema on startup and start server
CMD ["sh", "-c", "npx prisma db push --schema=server/prisma/schema.prisma && node server/dist/index.js"]
