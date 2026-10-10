---
{"id":"source-adapters","type":"entity","title":"六种信源读取器与采集调度","aliases":["信源","采集器","rss","web_list","json_list","x_search","mp_account","external"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/sources.md","sha256":"fa02c4908f3a19f4af33444cb6488e490fb796ee6b74d1bfff69295d21b984d4","anchor":"六种信源"},{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"目录"}],"relations":[{"type":"related","target":"old-content-freshness"},{"type":"related","target":"paid-request-receipts"},{"type":"related","target":"source-onboarding"}]}
---

# 六种信源读取器与采集调度

## Definition and role

`packages/backend/src/sources/` 装着六种信源的读取器，抓取调度在 `collect.ts`；认哪些配置项写在 `config-keys.ts`。信源在后台「信源」页管理：新建、试抓、改频率、启停、看失败原因和最近条目。首次启动时 `industry/sources.json` 里的示范信源会被导入。

| 类型 | 适合 | 需要 |
|---|---|---|
| `rss` | 有 RSS / Atom 的博客、媒体、Substack、公众号转 RSS 服务 | 无 |
| `web_list` | 没有 RSS 的网页列表 | 写选择器；按需配置 Jina Reader 渲染（按次计费） |
| `json_list` | 返回 JSON 的接口（GitHub Releases 等） | 写字段路径 |
| `x_search` | X（推特）账号 | SocialData 的 key，按请求计费 |
| `mp_account` | 微信公众号 | 极致了（Dajiala）的 key，按请求计费 |
| `external` | 你自己的脚本推送进来的内容 | `INGEST_TOKEN` |

**不认识的配置项不会被静默降级**：保存会被拒绝、抓取直接失败并在后台显示原因，不会悄悄退回通用解析。

## 每种信源的要点

- **rss**：`summaryIsBody` 确认文字订阅的摘要就是全文时，不再去抓原文页；`allowCategories` / `denyCategories` 按订阅分类过滤。没有网页的播客单集，原文链接用音频或视频文件。
- **web_list**：关键是 `itemSelector` 要选中**每条新闻**而不是包住所有新闻的容器（选 `.news-list` 通常只取到第一条）。日期依次尝试 `datetime`、`content`、`title` 属性和文字；`parseMode` 支持 `html`、`markdown`、`docusaurus_changelog`、`intercom_changelog`。Jina 要**显式**把 `url` 写成 `https://r.jina.ai/…`，不是抓不到就自动切换。
- **json_list**：路径用点分隔（不是 JSONPath，不写 `$` 或 `[*]`）；`{raw:字段路径}` 原样插入、`{字段路径}` 会编码；不会自动把相对网址补成绝对网址。
- **x_search**：用 SocialData 搜索（`from:账号 -filter:replies`），**不是**把个人主页 URL 填进网页列表。生产自动采集时普通账号会自动合并成一次搜索（每次最多二十几个），省请求数。
- **mp_account**：按 `ghid` / `nickname` 配置（不要写成 `biz` / `name`），每个公众号按自己的间隔检查。不支持「预览抓取」。
- **external**：`POST /api/ingest/items`，走和普通采集一样的判重、精选和归组。每次最多 50 条，超过返回 413；`INGEST_TOKEN` 至少 16 位，不设置时接口一律返回 401；`sourceId` 不存在时自动建一个 `external` 信源，**默认不进公开页面**。

## 先预览，再创建

`/admin/sources/new` 里填配置后可以「预览抓取」：显示条目总数和前 20 条的标题、原文链接、发布时间、摘要，不把条目存入文章库。预览和正式采集**套用同一组过滤**（地址前缀、分类、噪声词、地址改写、`publishedAfter`），看到的就是正式采集会收的条目——但不等于完成生产采集，也不经过详情补齐、精选和公开发布。

预览仍会发出抓取请求；X 和 Jina 预览也可能产生费用，经过付费回执和预算。`COLLECT_ENABLED=false` 只关闭后台自动采集，**不能用它保证手动预览不访问外部服务**。

## 分级、参与方式与全文

- **分级 `tier`**：`T1` 官方一手、`T1_5` 官方账号与准官方创作者、`T2` 媒体与个人、`EXCLUDE_MP` 不参与精选。入选门槛按分级不同。
- **参与方式 `participation_mode`**：`editorial` 进精选和全部动态；`hot_signal` 不单独展示，只作热度证据；`isolated` 不进任何公开页面。
- **一手**：只有 `T1` 算一手，不单独设置。
- **发布方**：`publisherUrlPrefixes` 把别的信源带来的官方文章改记到它名下；`publisherRole` + `owner_entity_id` 让 `T1_5` 账号的新闻可以当代表报道。
- **全文**：`site_fulltext`（站内展示）与 `syndicate_fulltext`（全文 RSS）**默认都关**，只显示摘要和原文链接。公众号、付费墙内容不会因为技术上抓得到就获得全文展示。

## 抓取频率

每个信源有自己的间隔。每天 04:20 按近 7 天的产出自动调整：最短 15 分钟（经 Jina 读的网页列表最短 60 分钟）；最大值一般 60 分钟、X 与 Jina 网页列表 120 分钟、只作热度证据的 180 分钟。抓取失败不推进位置，下次从同一处继续；连续失败的信源在后台标红。

## Relationships

- 旧文与存量条目的处理见 [旧文不刷屏与发布时间](../concepts/old-content-freshness.md)。
- 付费信源（X、公众号、Jina）经过 [付费回执与预算熔断](../concepts/paid-request-receipts.md)。
- 接入与试抓的操作步骤见 [信源接入与试抓](../topics/source-onboarding.md)。

## Sources

- [信源](../../docs/sources.md#六种信源)（`docs/sources.md`）
- [架构 · 目录](../../docs/architecture.md#目录)（`docs/architecture.md`）
