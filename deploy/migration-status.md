# AIW 自托管验收状态

更新日期：2026-11-14（Asia/Shanghai）。

## 当前部署

- 服务器：`155.138.201.101`，Ubuntu 24.04，使用现有 Node.js 和 Nginx。
- 服务：`aiw.service`，以独立 `aiw` 用户运行，监听 `127.0.0.1:5180`。
- 当前发布：`/srv/aiw/releases/20261114-redirect-fix/.next/standalone`，由 `/srv/aiw/current` 指向；上一版 `20261112-01` 保留，可快速回滚。
- 生产环境：`/etc/aiw/production.env`，root 所有、权限 600；备份位于 `/etc/aiw/production.env.pre-pooler`。
- `www.essmote.com` 已在 Spaceship 权威 DNS 切到 A 记录 `155.138.201.101`；权威 DNS 查询不再返回旧 CNAME。
- 根域名 `essmote.com` 仍指向原 Vercel/Cloudflare 配置，尚未切换。
- Nginx 为 `www.essmote.com` 配置 HTTP 到 HTTPS 跳转，并反代到 AIW 的 `127.0.0.1:5180`。
- 证书覆盖 `www.essmote.com`，有效期至 2027-02-12；通过手动 DNS 验证签发，尚未配置自动续期。

## 已通过

- 在服务器安装锁定依赖并完成 Linux 生产构建，systemd 服务运行正常。
- 直接访问 `https://www.essmote.com` 返回 200，`/api/health` 返回 `{"status":"ok"}`。
- 使用 `curl --resolve` 将正式主机名和 TLS SNI 直接指向新服务器时，首页和健康接口均通过。
- Spaceship 权威服务器 `launch1.spaceship.net`、`launch2.spaceship.net` 均返回 `www.essmote.com A 155.138.201.101`，未返回 CNAME。
- Supabase Session pooler 使用 PostgreSQL 连接成功，执行 `SELECT 1` 成功；当前临时使用 `sslmode=no-verify`，待安装/指定 CA 后恢复证书校验。
- Google OAuth 回调已修复：反向代理下的内部 localhost 地址曾导致 `redirect_uri_mismatch`，现在以 `AUTH_URL` 的正式域名生成 token 交换和错误回跳地址。
- next-intl 英语路由已修复：移除了与 `localePrefix: "as-needed"` 冲突的 `/en` 前缀剥除逻辑；`/en` 和 `/en/auth/signin` 返回英语页面。
- 首页、登录页、价格、帮助、联系、隐私政策和服务条款 HTTP 检查通过；五种文书工具未登录时会转到登录页并保留 callbackUrl。
- 匿名会话返回 null，未登录配额接口返回 401；首页引用的静态资源此前均返回 200。

## 待验收与注意事项

- 曾观察到本机递归 DNS 缓存旧的 Vercel/Cloudflare 地址；复查时 Spaceship 权威 DNS、Google DNS 和 Cloudflare DNS 均已返回 `155.138.201.101`。
- Google 登录代码已通过授权 URL 与错误回跳检查；完整 Google 账号授权后的建号/登录/会话流程仍待用户实测。
- 邮件/密码登录、密码重置尚未完整走通。
- 文件上传、AI 生成/取消、管理员操作和支付到账尚未进行完整业务验收；这些流程可能产生生产数据或费用。
- 当前证书为手动 DNS 验证签发，不会自动续期；须在 2027-02-12 前配置自动 DNS 验证或重新手动签发。
- `http://155.138.201.101` 是临时 IP 预览，不适合作为完整业务验收入口：OAuth 回调、Secure Cookie 和绝对链接均依赖正式 HTTPS 域名。

## 回滚

若新服务器测试遇到短时间无法修复的问题，在 Spaceship 将 `www` 的 A 记录 `155.138.201.101` 改回原 Vercel CNAME `d31e4538cc77925a.vercel-dns-017.com`，并移除冲突的 `www` A 记录。根域名当前未切换，无需为回滚修改根域名记录。
