# Next.js Frontend Dockerfile for DOON Riders
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies required for Next.js build)
COPY package*.json ./
RUN npm ci --include=dev

# Copy frontend source
COPY . .

# Build Next.js application with standard production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output or built files and public assets
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
