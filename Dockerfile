# syntax=docker/dockerfile:1

# Base dependencies
FROM node:20-alpine3.19 AS base

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts

# Build
FROM base AS build
WORKDIR /app
COPY . ./

RUN yarn build

# Production
FROM node:20-alpine3.19 AS production

WORKDIR /app
COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN yarn install --production --frozen-lockfile --ignore-scripts

COPY --from=build /app/dist ./dist

# Generate Prisma Client
RUN yarn prisma:generate

ENV NODE_ENV=production

EXPOSE 3001

CMD ["yarn", "start:prod"]
