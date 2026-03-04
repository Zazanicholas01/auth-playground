FROM node:18-alpine

WORKDIR /opt/deps

COPY package.json ./
RUN npm install --omit=dev

ENV NODE_PATH=/opt/deps/node_modules
WORKDIR /app

USER node

CMD ["node", "/app/index.js"]
