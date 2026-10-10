---
{"id":"publication-layer","type":"entity","title":"公开读取层 publication/","aliases":["publication/","读取层","公开出口的公共读路径"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"几条不变的规则"},{"path":"docs/deploy.md","sha256":"10511424551f27f6a7cce34e4cf382e5f8b33d44774549edd68658387587f19f","anchor":"配域名和-https"}],"relations":[{"type":"implements","target":"one-public-read-layer"},{"type":"related","target":"outbound-surfaces"},{"type":"related","target":"three-processes"}]}
---

# 公开读取层 publication/

## Definition and role

`packages/backend/src/publication/` 是**唯一的公开读取层**：网页、RSS、公开 API、MCP、站点地图、分享图、Agent Markdown 读的都是它。新增公开出口也走同一条路径，不再各写一份查询。

它回答的是「现在对外能给出什么」，因此也是撤回、全文许可和代表报道规则的唯一执行点。

在本仓库的这份 checkout 里，该目录有 25 个文件，按职责大致分成：

| 关注点 | 文件（举例） |
|---|---|
| 公开范围与席位 | `scope.ts` |
| 条目与详情 | `items.ts`、`detail.ts`、`rules.ts` |
| 事件与综述 | `stories.ts`、`story-text.ts`、`story-evidence.ts` |
| 热度与时序 | `hot.ts`、`timeline.ts`、`pool.ts` |
| 报告 | `reports.ts`、`coverage.ts`、`followups.ts` |
| 各出口 | `feeds.ts`（RSS）、`v1.ts`（API）、`llms.ts`、`sitemap.ts`、`og.ts`、`agent.ts` |
| 出版与代表稿 | `publish.ts`、`representative.ts`、`groups.ts`、`links.ts` |

## 两条与读取层直接相关的规则

1. **公开范围只在这里定义**：公开范围、精选席位（机器出口每条新闻只出一条）与事实证据条件只在 `publication/scope.ts` 定义。该文件自己写着：没有别的模块把可见性、放行时间或综合稿规则写进 SQL，归组也从这里取综合稿规则；一条公开记录「持有什么」是在出版时由 `publish.ts` 和 `rules.ts` 一次性推导出来的。
2. **缓存不延长旧内容的寿命**：可变内容按响应的 `Cache-Control` 到期重新验证，站点地图的进程、磁盘与 HTTP 缓存共用同一个截止时间，不能在发送时重新计时；MCP 的 HTTP 响应使用 `no-store`。详见 [缓存寿命与重新验证](../concepts/cache-lifetime.md)。

## 已出刊报告的特殊口径

已出刊报告保留当期写作，但引用是否可公开、来源名和引用时间仍按**当前**资料判断；撤回要同时移除依赖该引用的导读与封面。因此「哪一期」由日期、周和月份决定，**不代表内容永久不变**。

## Relationships

- 实现 [一个公开读取层](../concepts/one-public-read-layer.md) 这条不变规则。
- 给 [对外出口](outbound-surfaces.md) 提供全部数据。
- 代表报道与席位规则影响 [事件归组与热度](event-grouping-and-hotness.md) 和 [日报、周报、月报](report-editions.md)。

## Sources

- [架构 · 几条不变的规则](../../docs/architecture.md#几条不变的规则)（`docs/architecture.md`）
- [部署 · 配域名和 HTTPS](../../docs/deploy.md#配域名和-https)（`docs/deploy.md`）
