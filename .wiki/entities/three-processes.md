---
{"id":"three-processes","type":"entity","title":"三个进程：api、worker、web","aliases":["运行时拓扑","进程模型","apps/"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"三个进程"},{"path":"docs/deploy.md","sha256":"10511424551f27f6a7cce34e4cf382e5f8b33d44774549edd68658387587f19f","anchor":"用-docker推荐"}],"relations":[{"type":"related","target":"module-system"},{"type":"related","target":"publication-layer"},{"type":"related","target":"outbound-surfaces"},{"type":"related","target":"deploy-update-backup"}]}
---

# 三个进程：api、worker、web

## Definition and role

这个框架的运行时由三个进程组成，职责刻意不重叠：模型调用、数据库写入和页面渲染分别落在不同的进程里。

| 进程 | 位置 | 做什么 |
|---|---|---|
| api | `apps/api/` | Fastify。网站自用接口（`/api/site/`）、公开 API（`/api/v1/`）、RSS、MCP、后台接口、图片代理、分享图 |
| worker | `apps/worker/` | pg-boss 任务队列和定时任务：抓信源、调模型、归组、热度、日报、告警、清理 |
| web | `apps/web/` | React Router 服务端渲染的网页。**只通过 HTTP 读 api，不碰数据库** |

业务代码都在 `packages/backend/`，前后端共用的类型和常量在 `packages/contracts/`。这个站自己的名字、文案、品牌和页面在 `site/`，行业的分类、信源、提示词和门槛在 `industry/`，只属于这个站的功能在 `modules/`（见 [模块系统](module-system.md)）。

## 部署形态

- **Docker Compose（推荐）**：`docker compose up -d --build` 起五个容器——`db`（PostgreSQL 17）、`setup`（每次启动先跑迁移和种子数据，然后退出）、`api`、`worker`、`web`。HTTPS 用 `--profile https` 额外起 Caddy。
- **数据与密钥的边界**：`web` 只接收网站地址、API 地址等网页配置，通过 HTTP 读取 API；数据库、模型和管理员密钥，以及数据卷，只交给后端容器。
- **不用 Docker**：需要 Node.js 24.11 以上、PostgreSQL 16 或 17，Linux 或 macOS（Windows 用 WSL2）。三个进程都要带 `NODE_ENV=production`——api 和 worker 不带它就按开发环境运行：启动时不检查生产密钥和管理员密码，`DEV_AUTH_ROLE` 免登录也会生效。开发时用 `npm run dev:api`、`dev:worker`、`dev:web` 起带热更新的进程。

后端**没有构建步骤**：Node.js 24 直接运行 TypeScript。只有网页（`@aihot/web`）需要 `npm run build`。

## 边界由测试守住

「web 只通过 HTTP 访问后端」「packages 不导入 apps」「公开路由只经公开读取层」这些约束不是约定俗成，而是 `tests/architecture.test.ts` 里的检查项。调整模块边界时，要同时更新约定和这些检查。

## Relationships

- 三个进程都读 [站点包与行业包](configuration-packages.md) 里的配置，代码里不写死某个站的值。
- 公开出口全部读 [公开读取层](publication-layer.md)。
- 每个进程都可能装载 [模块系统](module-system.md) 提供的插口。

## Sources

- [架构](../../docs/architecture.md#三个进程)（`docs/architecture.md`）
- [部署](../../docs/deploy.md#用-docker推荐)（`docs/deploy.md`）
