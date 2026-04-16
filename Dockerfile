FROM node:alpine AS node-builder

WORKDIR /backend

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY rollup.config.mjs ./
COPY src/ src/
RUN npm run build

FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0

# Copy built JS
COPY --from=node-builder /backend/build/index.js /nakama/data/modules/build/index.js

# Copy config
COPY local.yml /nakama/data/local.yml

CMD ["/bin/sh", "-ecx", "\
/nakama/nakama migrate up --database.address \"$DATABASE_PUBLIC_URL\" && \
exec /nakama/nakama \
  --config /nakama/data/local.yml \
  --database.address \"$DATABASE_PUBLIC_URL\" \
"]