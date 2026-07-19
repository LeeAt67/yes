FROM node:22-alpine

# 安装 Python3 支持（AI 代码执行常用）
RUN apk add --no-cache python3 py3-pip bash

WORKDIR /sandbox

# 复制服务端代码
COPY server.js /sandbox/
COPY package.json /sandbox/

# 工作目录（用户代码在此执行，可通过环境变量覆盖）
ENV WORKSPACE=/workspace
RUN mkdir -p /workspace

EXPOSE 3002

CMD ["node", "server.js"]
