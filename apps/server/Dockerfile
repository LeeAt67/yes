FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/

RUN npm ci

COPY apps/server/ apps/server/

RUN npm run build -w apps/server

RUN npm ci --omit=dev

FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/server/dist /app/dist

ENV PORT=8001
EXPOSE 8001
CMD ["node", "dist/index.js"]