FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build
# Seed the skin catalog at build time; the server also refreshes it daily, so a failure is not fatal.
RUN node dist/scripts/build-catalog.js || echo '{"updated":0,"tiers":[],"skins":[]}' > catalog.seed.json

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/catalog.seed.json ./
# Owned by node so the named volume mounted here is writable.
RUN mkdir /data && chown node /data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/health || exit 1
CMD ["node", "dist/src/index.js"]
