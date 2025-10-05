FROM node:24.6.0-alpine AS base
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
RUN apk del .build-deps

FROM node:24.6.0-alpine
WORKDIR /app
RUN apk add --no-cache ca-certificates wget
COPY --from=build /app/.output /app/.output
EXPOSE 3000
CMD [ "node", "--enable-source-maps", ".output/server/index.mjs" ]