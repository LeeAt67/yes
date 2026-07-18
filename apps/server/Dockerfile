# ---- 构建阶段 ----
FROM node:22-alpine AS builder

WORKDIR /app

# 安装全部依赖（含 devDeps，需要 typescript 编译）
COPY apps/server/package.json apps/server/package-lock.json ./
RUN npm ci

# 编译 TypeScript
COPY apps/server/tsconfig.json ./
COPY apps/server/src/ src/
RUN npx tsc

# 仅保留生产依赖
RUN npm ci --omit=dev

# ---- 运行阶段 ----
FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/dist /app/dist

ENV PORT=8001
EXPOSE 8001
CMD ["node", "dist/main.js"]
