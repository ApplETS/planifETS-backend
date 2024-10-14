# syntax=docker/dockerfile:1


# Base dependencies
FROM node:18-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

# Development
FROM base AS development
WORKDIR /app
COPY . ./

RUN yarn install --frozen-lockfile
RUN yarn global add @nestjs/cli
RUN yarn prisma:generate

ENV NODE_ENV=development

CMD [ "yarn", "start:dev" ]

# Build
FROM base AS build
WORKDIR /app
COPY . ./

RUN yarn build

# Production
FROM node:18-alpine AS production
WORKDIR /app
COPY package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production

CMD [ "yarn", "start:prod" ]

EXPOSE 3000