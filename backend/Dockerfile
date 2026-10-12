# Node.js Express Backend Dockerfile for DOON Riders
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (ensure devDependencies like typescript are installed)
ENV NODE_ENV=development
COPY package*.json ./
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads

# Expose API port
EXPOSE 5000

# Start server
CMD ["node", "dist/server.js"]
