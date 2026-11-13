# syntax=docker/dockerfile:1
# MedNeed production image. Build:  docker build -t medneed .
# Run:    docker run -p 3000:3000 --env-file .env.production -v medneed-data:/data medneed

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public && npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/data/uploads \
    PRESCRIPTION_DIR=/data/prescriptions
# Unprivileged user; /data is the only writable place (mount a volume there unless S3 is used for both).
RUN groupadd --system --gid 1001 medneed && useradd --system --uid 1001 --gid medneed medneed \
 && mkdir -p /data/uploads /data/prescriptions && chown -R medneed:medneed /data && chmod 700 /data/prescriptions
COPY --from=build --chown=medneed:medneed /app/public ./public
COPY --from=build --chown=medneed:medneed /app/.next/standalone ./
COPY --from=build --chown=medneed:medneed /app/.next/static ./.next/static
USER medneed
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
