# weiran4j 前端镜像（docs/02-部署.md）。构建上下文是仓库根（pnpm 工作区要用根目录的 lockfile）：
#   docker build -f packages/manage/Dockerfile -t weiran4j-web .
# Nginx 提供静态文件，并把 /api-backend/ 同源反代到后端（packages/manage/nginx.conf）。

# ---- 构建 ----
FROM node:22-alpine AS build
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/manage/package.json packages/manage/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/semi-components/package.json packages/semi-components/package.json
RUN pnpm install --frozen-lockfile --filter @weiran/manage...
COPY packages/manage packages/manage
COPY packages/semi-components packages/semi-components
RUN pnpm --filter @weiran/manage... build

# ---- 运行 ----
FROM nginx:1.27-alpine
LABEL org.opencontainers.image.source="https://github.com/weiran-tech/weiran4j"
COPY packages/manage/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/packages/manage/dist /usr/share/nginx/html
EXPOSE 80
