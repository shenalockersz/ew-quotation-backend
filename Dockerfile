# --- install deps (cached) ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- runtime ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# install curl for healthcheck
RUN apk add --no-cache curl
# bring only node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# bring your source (relies on .dockerignore to exclude node_modules/.env etc.)
COPY . .
# Make sure your app listens on 0.0.0.0:3001
ENV PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD curl -fsS http://127.0.0.1:${PORT}/v1/api/health || exit 1
# entry file is under src/
CMD ["node", "src/server.js"]
