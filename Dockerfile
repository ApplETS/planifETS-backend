# syntax=docker/dockerfile:1

FROM node:22.22.3-bullseye-slim AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts

FROM node:22.22.3-bullseye-slim AS prod-deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts --production

FROM node:22.22.3-bullseye-slim AS build

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . ./

ENV NODE_ENV=production
RUN yarn prisma:generate
RUN yarn build

FROM node:22.22.3-bullseye-slim AS dev

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock ./
COPY prisma ./prisma

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    tzdata \
  && rm -rf /var/lib/apt/lists/*

RUN yarn prisma:generate

ENV NODE_ENV=development
ENV APP_ENV=development
ENV TZ=America/Toronto

EXPOSE 3001
CMD ["sh", "-c", "yarn prisma:generate && yarn start:dev"]

FROM node:22.22.3-bullseye-slim AS production

ARG APP_GIT_SHORT_SHA
ENV APP_GIT_SHORT_SHA=${APP_GIT_SHORT_SHA}
ENV NODE_ENV=production
ENV APP_ENV=production
ENV TZ=America/Toronto

WORKDIR /app

COPY package.json ./
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    tzdata \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 3001
CMD ["yarn", "start:prod"]
