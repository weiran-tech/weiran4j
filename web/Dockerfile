# weiran4j 前端镜像（docs/02-部署.md）。构建上下文是仓库根（pnpm 工作区要用根目录的 lockfile）：
#   docker build -f web/Dockerfile -t weiran4j-web .
# Nginx 提供静态文件，并把 /api/ 同源反代到后端（web/nginx.conf）。

# ---- 构建 ----
FROM node:22-alpine AS build
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/package.json
COPY weiran4j/package.json weiran4j/package.json
RUN pnpm install --frozen-lockfile --filter @weiran/web...
COPY web web
RUN pnpm --filter @weiran/web build

# ---- 运行 ----
FROM nginx:1.27-alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/web/dist /usr/share/nginx/html
EXPOSE 80
