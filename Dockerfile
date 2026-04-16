FROM node:alpine AS node-builder

WORKDIR /backend

COPY package*.json .
RUN npm install

COPY tsconfig.json .
COPY rollup.config.mjs .
COPY src/ src/
RUN npm run build

FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0

COPY --from=node-builder /backend/build/index.js /nakama/data/modules/build/index.js
COPY local.yml /nakama/data/
COPY entrypoint.sh /nakama/entrypoint.sh

USER root
RUN chmod +x /nakama/entrypoint.sh

ENTRYPOINT ["/nakama/entrypoint.sh"]