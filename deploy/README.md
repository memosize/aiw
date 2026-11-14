# 从 Vercel 迁出，保留 Supabase

当前部署和已完成的检查见 [迁移验收状态](migration-status.md)。IP 预览站点配置为 `ip-preview.conf`，仅用于切流前检查。

## 已有 Nginx 的服务器

当前目标服务器 `155.138.201.101` 已有 Nginx 占用 80/443，未安装 Docker，且已有其他应用。应使用本目录的 `aiw.service` 和 `nginx.conf.example` 接入现有服务，不直接启动 Compose 中的代理。

此路径部署约定：独立系统用户 `aiw`，独立目录 `/srv/aiw`，应用监听 `127.0.0.1:5180`（启用前再次确认空闲）。在相同 Linux 架构环境构建 Next.js 后，将 `.next/standalone/` 内容、`public/` 和 `.next/static/` 分别放入发布目录根目录、`public/` 和 `.next/static/`，再将 `/srv/aiw/current` 软链接指向发布目录。不要上传 macOS 的构建产物到 Linux。发布目录及 Next.js 缓存需允许 `aiw` 用户读写。

生产环境放在 `/etc/aiw/production.env`（root 所有，权限 600，由 systemd 读取），内容使用 `KEY=value`；公开变量还须在构建时提供。保留现网认证密钥及 Supabase 配置。服务模板要求 `node` 位于 systemd 默认 PATH；若使用 nvm 等方式安装，先将 ExecStart 改为稳定的 Node 绝对路径。

确认真实域名及 HTTPS 证书方案后，为 aiw 单独创建 Nginx 站点，校验 `nginx -t` 后 reload。示例只有 HTTP，需通过现有证书管理方式补齐 HTTPS，再验收登录、支付和 AI 流式响应。不要覆盖现有站点配置。systemd 模板由管理员安装到 `/etc/systemd/system/aiw.service`；更新后执行 daemon-reload，再启用服务。此处为部署模板，尚未安装到服务器。

本方案运行现有 Next.js 页面和 API，通过 Caddy 自动申请 HTTPS 证书；数据库、认证表、文件存储和外部 AI 服务继续使用现有配置。无需迁移数据库，也不需要增加 Hono 服务。

## 准备配置

服务器需安装支持 BuildKit secrets 的 Docker Engine 和 Docker Compose v2，允许访问外网，并开放 TCP 80、443。Supabase、邮件和 AI 服务必须能从服务器访问。

在 aiw 项目根目录执行：

```sh
cp deploy/compose.env.example deploy/compose.env
cp deploy/build.env.example deploy/build.env
cp .env.example .env.production
```

- `deploy/compose.env`：设置实际域名（仅主机名，不含 https://）、证书通知邮箱和镜像标签。
- `.env.production`：从原 Vercel Production 环境复制完整配置。保留原 Supabase URL、密钥，以及原 `AUTH_SECRET` / `BETTER_AUTH_SECRET`，不要使用示例密钥。若当前登录使用 `DATABASE_URL`，继续填写原 Supabase PostgreSQL 连接串；它与 Supabase HTTP API 配置互不替代。检查 Supabase 网络访问限制是否允许新服务器。
- `deploy/build.env`：同步生产环境的所有 `NEXT_PUBLIC_*` 配置，包括现有项目中额外增加的变量。此文件只放公开变量，不放 Supabase service role、数据库密码、支付或 AI 密钥。示例中的登录开关需按现网设置。公开变量编译后固定，变更后必须重新构建镜像。

继续使用原正式域名时，`NEXT_PUBLIC_WEB_URL`、`AUTH_URL`、OAuth 回调和支付通知 URL 保持原值。使用测试域名时，将站点 URL、认证 URL 和支付跳转 URL 改到测试域名，并在对应供应商配置测试回调。生产环境密钥不应进入测试支付流程。

环境文件已被 Git 和 Docker 构建上下文忽略；构建公开变量通过 BuildKit 临时挂载。运行时环境由 Compose 注入。不要提交这些文件。

## 构建与启动

```sh
docker compose --env-file deploy/compose.env config --quiet
docker compose --env-file deploy/compose.env build web
docker compose --env-file deploy/compose.env up -d
docker compose --env-file deploy/compose.env ps
docker compose --env-file deploy/compose.env logs --tail=100 web proxy
```

首次建议使用测试子域名，将其 A/AAAA 记录指向新服务器；Caddy 申请公开证书需要域名解析正确且公网能访问 80/443。不要保留指向其他服务器的错误 AAAA 记录。`web` 仅在 Docker 内网监听，通过代理对外提供服务。若服务器已有 Nginx/Caddy 占用这些端口，应将现有反向代理接入应用，避免直接启动第二个代理。

健康检查 `/api/health` 仅确认应用 HTTP 服务可用，不会查询生产数据库。Compose 不会因为容器变为 unhealthy 自动重启；应监测健康状态和错误日志。

## 切流前验收

1. 打开首页、中文页面及静态资源，检查 canonical URL 和 HTTPS 跳转。
2. 验证邮箱登录、Google 登录、会话保持、退出及密码重置；使用新域名时旧域名 Cookie 不会自动共享。
3. 验证已有用户、订单和积分读取；使用受控测试订单验证支付签名、回调和积分只到账一次。
4. 验证 AI 生成持续逐段输出、长请求和取消请求；Caddy 配置已关闭代理响应缓冲。
5. 验证文件上传、邮件发送、后台管理，以及现网额外配置的定时任务和第三方回调。

确认后将正式域名 DNS 从 Vercel 改到服务器。使用相同数据库时，旧实例和新实例都可能处理请求，必须保留现有支付幂等机制，避免重复执行定时任务。观察生产日志并确认核心流程正常后，再停止旧 Vercel 部署及相关计费资源。

## 更新与回退

每次发布前设置新的 `AIW_IMAGE_TAG`（例如日期加 Git 提交号），保留上一版镜像、代码与对应环境配置。构建成功后执行 `up -d`。单实例更新会有短暂中断，本配置不提供零停机发布。

回退应用时，将标签改回上一版，并执行：

```sh
docker compose --env-file deploy/compose.env up -d --no-build
```

迁移期保留旧 Vercel 部署；必要时将 DNS 恢复原记录，注意 DNS 缓存不会立即更新。此方案不执行数据库结构变更或数据搬运。
