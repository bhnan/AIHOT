---
{"id":"outbound-surfaces","type":"entity","title":"对外出口：网页、RSS、API、MCP、llms.txt","aliases":["公开出口","API v1","MCP","RSS","llms.txt","站点地图","分享图"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"对外出口"},{"path":"docs/customize.md","sha256":"4fe488f898c075201a304e7cdfa4aa9b0b402137756f06cd015f93ad890e3d3a","anchor":"7-页面文案sitepagessitepublicsitechangelogjson"}],"relations":[{"type":"depends_on","target":"publication-layer"},{"type":"related","target":"one-public-read-layer"},{"type":"related","target":"module-system"}]}
---

# 对外出口：网页、RSS、API、MCP、llms.txt

## Definition and role

同一份内容给人看也给 Agent 用。所有出口读的都是 [公开读取层](publication-layer.md)，不在各自的出口里另写查询。

| 地址 | 内容 |
|---|---|
| `/` `/all` `/hot` `/topics` `/daily` `/weekly` `/monthly` | 精选、全部动态、热门事件、主题、日报周报月报 |
| `/feed.xml`、`/feed/full.xml`、`/feed/all.xml`、`/feed/daily.xml`、`/feed/weekly.xml`、`/feed/monthly.xml` | RSS：精选、精选全文、全部、日报、周报、月报；另有按分类的 `/feed/category/<key>.xml` 与分类全文版 `/feed/full/category/<key>.xml` |
| `/api/v1/` | 公开 API，文档在 `/openapi-v1.json`；给 Agent 读的 Markdown 从 `/api/v1/agent` 开始；说明页在 `/agent` |
| `/api/mcp` | MCP 服务：最新、搜索、热点、事件、日报、周报、月报各一个工具，工具名前缀是 `site/site.ts` 的 `mcpPrefix` |
| `/llms.txt`、`/sitemap.xml`、`/robots.txt` | 给大模型和搜索引擎的说明 |
| `/admin` | 后台 |

## 版本与命名约定

- `SITE.interfaceVersion` 是公开接口（MCP、OpenAPI、`llms.txt`）的版本号，**只升不降**；改了接口里已有字段或含义时升主版本。当前示范站是 `4.0.0`。
- MCP 工具名带前缀，示范站是 `myhot_get_latest`、`myhot_search` 这类；**已经有人接入后就不要再改**。

## 站点根目录的固定文件

只有四个文件会发布到网站根目录，来自 `site/public/`：`robots.txt`、`manifest.webmanifest`、`openapi-v1.json`，以及可选的 `.well-known/security.txt`。放进去的其他文件不会出现在网站上；没有的文件访问时是 404。

文件里可以写占位符：`{{siteName}}`、`{{siteUrl}}`、`{{description}}`、`{{tagline}}`、`{{locale}}`、出刊时间 `{{dailyTime}}`/`{{weeklyTime}}`/`{{monthlyTime}}`、公开接口版本 `{{version}}`、逗号分隔的公开分类 `{{categoryList}}`；JSON 文件里 `enum` 或 `examples` 列表中的 `"{{categories}}"` 会换成公开分类的 key 列表。

## 面向 Agent 的接入口

- **MCP**：默认接受 `SITE_URL` 的主机以及 `localhost`、`127.0.0.1`、`[::1]`；额外主机用 `MCP_ALLOWED_HOSTS`（逗号分隔，IPv6 要加方括号）。MCP 的 HTTP 响应使用 `no-store`，且从不推送变更——`subscriptions/listen` 立即返回 404 与 JSON-RPC `-32601`。
- **模块提供的工具**：模块通过 `agent.abilities` 提供 MCP 工具，`scripts/mcp-check.ts` 始终检查完整工具集合。
- **限流说法**：`site/site.ts` 的 `ACCESS.ratePerMinute` 只在反向代理**真的**按 IP 限流后才填，否则说明里不提。

## 公开接口与网页的类别可以不同

`PUBLIC_CATEGORIES.merge` 让某一类在 API、RSS、MCP 里并进另一类发布，网页上照样分开；`feedLabels` 换分类 RSS 标题里的名字。见 [站点包与行业包](configuration-packages.md)。

## 缓存约定

公开网页、导航数据、API、RSS、条目 Markdown、报告分享图、站点地图，以及接入说明 `/api/v1/agent` 和 `/openapi-v1.json` 都遵守应用返回的 `Cache-Control`：前面有 Nginx、CDN 时不要另加更长的缓存期，不要在到期后离线返回旧内容，也不要在转发旧响应时重新起算它的寿命。详见 [缓存寿命与重新验证](../concepts/cache-lifetime.md)。

## Relationships

- 出口的公开范围与代表稿规则由 [公开读取层](publication-layer.md) 决定。
- 新增出口属于扩展点，见 [模块系统](module-system.md)。

## Sources

- [架构 · 对外出口](../../docs/architecture.md#对外出口)（`docs/architecture.md`）
- [把它改成你的行业 · 页面文案](../../docs/customize.md#7-页面文案sitepagessitepublicsitechangelogjson)（`docs/customize.md`）
