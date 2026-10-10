---
{"id":"deploy-update-backup","type":"topic","title":"部署、更新与备份","aliases":["部署","上线","更新","升级","备份","Docker","HTTPS"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/deploy.md","sha256":"10511424551f27f6a7cce34e4cf382e5f8b33d44774549edd68658387587f19f","anchor":"更新"},{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"数据库迁移"}],"relations":[{"type":"related","target":"three-processes"},{"type":"related","target":"development-checks"},{"type":"related","target":"cache-lifetime"}]}
---

# 部署、更新与备份

## Summary

**推荐 Docker Compose**：一台装了 Docker（带 Compose）的机器，云服务器建议至少 2 核 4 GB（构建镜像时要用）。

```bash
git clone https://github.com/KKKKhazix/AIHOT.git myhot
cd myhot
node scripts/init-env.ts --llm-key <你的模型 API Key>
docker compose up -d --build
```

打开 `http://服务器地址:3000`，后台在 `/admin`。第一次启动会导入示范信源，一两分钟后开始有内容；第一次导入的一百多条资料大约半小时处理完。

**启动前检查 `SITE_URL`**：本机试用保留 `http://localhost:3000`；部署到服务器时改成读者实际访问的地址。RSS、分享链接、站点地图和 Agent Markdown 中的绝对链接都用它，**不会随浏览器访问的地址自动改变**。

## 五个容器与密钥边界

`db`（PostgreSQL 17）、`setup`（每次启动先跑迁移和种子数据，然后退出）、`api`、`worker`、`web`。`web` 只接收网站地址、API 地址等网页配置，通过 HTTP 读取 API；**数据库、模型和管理员密钥，以及数据卷，只交给后端容器**。

## 域名与 HTTPS

```bash
SITE_URL=https://example.com
SITE_DOMAIN=example.com
PORT=127.0.0.1:3000        # 3000 端口只给本机的 Caddy 用，不直接对外
TRUST_PROXY=true           # 访客地址从 Caddy 转来的请求头里读
```

```bash
docker compose --profile https up -d --build
```

已经有 Nginx 就不必用 Caddy：反向代理到 `http://127.0.0.1:3000`，带上 `X-Forwarded-For`，并设 `TRUST_PROXY=true`。缓存要求见 [缓存不延长旧内容的寿命](../concepts/cache-lifetime.md)。

## 在中国大陆的服务器上

- 构建时 npm 走国内镜像：`docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com`。
- 拉取镜像慢，先给 Docker 配镜像加速。
- 海外信源抓不到时在 `.env` 设 `EGRESS_PROXY_URL`：**抓信源和图片时走这个代理，调用模型接口不走**。
- 对外服务需要先完成 ICP 备案，备案号填在 `site/site.ts` 的 `icp`。

## 更新的顺序

```bash
git pull
docker compose build
docker compose stop api worker web
docker compose run --rm setup && docker compose up -d
```

要点：

- **先备份**，再构建；**构建完成后停止旧服务**，再跑迁移和新版服务。
- 迁移成功后再启动服务；**迁移失败时先看错误，不要继续启动**。
- **旧的 API 和 worker 要在迁移前停下**：迁移可能删表删列，旧代码还在跑会出错。
- 正常关闭 worker 会等进行中的付费调用收尾（**最长三分多钟**）。
- 非 Docker 部署按同样顺序：备份 → 构建 → 停止 API/worker/web → `scripts/migrate.ts` → `scripts/seed.ts` → 启动。
- 新迁移遇到长期占锁会报出文件名和等待超时：**先处理占锁事务再重跑 setup，不要跳过迁移或改写迁移账本**。
- 并发索引创建中断可能留下无效索引：核实报错中的对象后，用 `DROP INDEX CONCURRENTLY <索引名>` 清理失败索引再重跑；**有效但定义不同的同名索引须先核对差异**。

## 不用 Docker

需要 Node.js 24.11 以上、PostgreSQL 16 或 17，Linux 或 macOS（Windows 用 WSL2）。

```bash
npm ci
node scripts/init-env.ts --llm-key <你的模型 API Key>
createdb myhot
```

`.env` 里加上 `DATABASE_URL` 和 `API_BASE_URL=http://127.0.0.1:3001`，然后：

```bash
node --env-file=.env scripts/migrate.ts
node --env-file=.env scripts/seed.ts
npm run build -w @aihot/web

NODE_ENV=production node --env-file=.env apps/api/src/main.ts          # 接口，3001 端口
NODE_ENV=production node --env-file=.env apps/worker/src/main.ts       # 后台任务
cd apps/web && NODE_ENV=production node --env-file=../../.env server.ts   # 网页，3000 端口
```

**三个进程都要带 `NODE_ENV=production`**（见 [安全阀](../concepts/safety-valves.md)）。三个进程要一直运行，生产环境用 systemd 或 pm2 守护；**停止 worker 时至少给它 210 秒**（`TimeoutStopSec` / `kill_timeout`），让进行中的付费调用收尾。

## 备份

在 `.env` 里配置 `DB_BACKUP_STORE_*`（任何 S3 兼容的对象存储），**每天 04:10 自动备份**。`SECRET_ID`、`SECRET_KEY`、`BUCKET`、`REGION` 四项都要填；不填 `DB_BACKUP_STORE_DOMAIN` 时按腾讯云 COS 拼地址。

一次完整备份包含同一时间戳的数据库 `.dump` 和文件包 `.tar.gz`。文件包保留 `uploads/` 以及仍存本地的 `feedback-screenshots/`，**不包含图片缓存或本地备份目录**；已经转发到飞书的图片只保留数据库中的外部引用。

**恢复要同时取回这一对文件**：用兼容版本的 `pg_restore` 恢复 `.dump` 到空数据库，再把文件包解压到数据目录根目录（Docker 中为 `/data`，非 Docker 用 `AIHOT_DATA_DIR`，默认 `.data`）。只恢复数据库**不能**找回仍由 `local:` 引用的反馈截图。

手动导出（只含数据库，不含附件目录）：

```bash
docker compose exec -T db pg_dump -U aihot aihot | gzip > myhot-$(date +%F).sql.gz
```

数据在三个 Docker 卷里：`db`、`data`、`caddy`。`docker compose down` 不删它们，`docker compose down -v` 会。

## 看日志

```bash
docker compose logs -f --tail 100 api worker web
```

后台「运行」页看每个定时任务最近的结果，「信源」页看每个信源的抓取状况。

## Related

- 迁移约定见 [开发检查与测试](development-checks.md)。
- 上线前的行业改写见 [改成你的行业](customize-to-another-industry.md)。

## Sources

- [部署](../../docs/deploy.md)（`docs/deploy.md`）
- [架构 · 数据库迁移](../../docs/architecture.md#数据库迁移)（`docs/architecture.md`）
