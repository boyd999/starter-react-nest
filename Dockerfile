# syntax=docker/dockerfile:1
# One image for every service. It is a bare Node runtime on purpose: source
# comes from the bind mount, node_modules from a named volume (see
# docker-compose.yml), so nothing here needs rebuilding when either changes.

FROM node:22-alpine
RUN corepack enable
WORKDIR /app

# Pre-install the pinned Yarn so containers don't each download it at startup.
# `corepack install` with no args reads the version from packageManager, so
# there's no version here to keep in sync with package.json.
COPY package.json ./
RUN corepack install
