FROM node:22.16.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache --virtual .build-deps gcc g++ make python3
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .

FROM deps AS build
RUN pnpm run build
RUN pnpm prune --prod --ignore-scripts
RUN apk del .build-deps

FROM node:22.16.0-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=UTC
RUN apk add --no-cache ca-certificates wget
COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
EXPOSE 3000
CMD [ "node", "--enable-source-maps", "node_modules/srvx/bin/srvx.mjs", "--prod", "dist/server/index.js" ]
