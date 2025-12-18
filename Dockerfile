# syntax=docker/dockerfile:1

# Base dependencies
FROM node:22-alpine3.20 AS base

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts

# Build
FROM base AS build
WORKDIR /app
COPY . ./

ARG SENTRY_AUTH_TOKEN
ENV NODE_ENV=production

RUN yarn build

# Production
FROM node:22-alpine3.20 AS production

ARG APP_GIT_SHORT_SHA
ENV APP_GIT_SHORT_SHA=${APP_GIT_SHORT_SHA}
ENV APP_ENV=production

WORKDIR /app
COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN yarn install --production --frozen-lockfile --ignore-scripts

COPY --from=build /app/dist ./dist

# Generate Prisma Client
RUN yarn prisma:generate

EXPOSE 3001

CMD ["yarn", "start:prod"]
