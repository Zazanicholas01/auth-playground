FROM oven/bun:1

WORKDIR /opt/deps

COPY package.json ./
RUN bun install --production

ENV NODE_PATH=/opt/deps/node_modules
WORKDIR /app

USER bun

CMD ["bun", "/app/index.js"]
