# syntax=docker/dockerfile:1

# Base dependencies
FROM node:22.22.3-alpine3.22 AS base

WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts

# Build
FROM base AS build
WORKDIR /app
COPY . ./

ENV NODE_ENV=production

RUN yarn build

# Development
FROM base AS dev
WORKDIR /app
COPY prisma ./prisma
ENV NODE_ENV=development
ENV APP_ENV=development
EXPOSE 3001
CMD ["sh", "-c", "yarn prisma:generate && yarn start:dev"]

# Production
FROM node:22.22.3-alpine3.22 AS production

ARG APP_GIT_SHORT_SHA
ENV APP_GIT_SHORT_SHA=${APP_GIT_SHORT_SHA}
ENV APP_ENV=production
ENV TZ=America/Toronto

WORKDIR /app
RUN apk add --no-cache tzdata openssl && \
    cp /usr/share/zoneinfo/${TZ} /etc/localtime && \
    echo "${TZ}" > /etc/timezone
COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN yarn install --production --frozen-lockfile --ignore-scripts

COPY --from=build /app/dist ./dist

# Generate Prisma Client
RUN yarn prisma:generate

EXPOSE 3001

CMD ["yarn", "start:prod"]
