# BellRinger Open — container image (Docker and Podman).
#
# No dependencies and no build step, so there is nothing to install: the
# source is copied in and run directly with Node.
#
#   docker build -t bellringer-open .
#   docker run --rm -p 3000:3000 bellringer-open
#
#   podman build -t bellringer-open .
#   podman run --rm -p 3000:3000 bellringer-open

FROM node:22-alpine

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

WORKDIR /app

# Application source. The project has zero runtime dependencies, so there is
# no npm install step.
COPY server.js server.js
COPY server/ server/
COPY src/ src/
COPY public/ public/
COPY config.json config.json
COPY package.json package.json

# Run as an unprivileged user. The app only reads these files.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "server.js"]