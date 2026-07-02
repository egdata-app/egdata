ARG NODE_VERSION=26.3.1
ARG PNPM_VERSION=11.8.0

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
ENV PNPM_HOME="/pnpm"
ENV PNPM_STORE_PATH="/pnpm-store"
ENV PATH="$PNPM_HOME/bin:$PATH"
ENV CI=true
RUN apk add --no-cache ca-certificates wget
RUN wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.shrc" SHELL="$(which sh)" PNPM_VERSION="${PNPM_VERSION}" sh -
RUN pnpm --version
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache --virtual .build-deps gcc g++ make python3
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm-store pnpm install --frozen-lockfile --store-dir "$PNPM_STORE_PATH"
COPY . .

FROM deps AS build
RUN pnpm run build
RUN pnpm prune --prod --ignore-scripts
RUN apk del .build-deps

FROM node:${NODE_VERSION}-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=UTC
RUN apk add --no-cache ca-certificates wget
COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/scripts/start-prod.mjs /app/scripts/start-prod.mjs
COPY --from=build /app/scripts/prod-logger-worker.mjs /app/scripts/prod-logger-worker.mjs
EXPOSE 3000
CMD [ "node", "--enable-source-maps", "scripts/start-prod.mjs" ]
