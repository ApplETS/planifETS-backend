# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    tzdata \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts

FROM base AS build

WORKDIR /app
COPY . ./

ENV NODE_ENV=production

RUN yarn build

FROM base AS dev

WORKDIR /app
COPY prisma ./prisma

ENV NODE_ENV=development
ENV APP_ENV=development
ENV TZ=America/Toronto

EXPOSE 3001

CMD ["sh", "-c", "yarn prisma:generate && yarn start:dev"]

FROM node:22-bookworm-slim AS production

ARG APP_GIT_SHORT_SHA

ENV APP_GIT_SHORT_SHA=${APP_GIT_SHORT_SHA}
ENV APP_ENV=production
ENV TZ=America/Toronto

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    tzdata \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
COPY prisma ./prisma

RUN yarn install --production --frozen-lockfile --ignore-scripts

COPY --from=build /app/dist ./dist

RUN yarn prisma:generate

EXPOSE 3001

CMD ["yarn", "start:prod"]
