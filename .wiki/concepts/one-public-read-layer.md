---
{"id":"one-public-read-layer","type":"concept","title":"一个公开读取层","aliases":["单一读取层","publication 唯一出口","公开范围只定义一次"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"几条不变的规则"}],"relations":[{"type":"related","target":"publication-layer"},{"type":"related","target":"outbound-surfaces"},{"type":"related","target":"cache-lifetime"}]}
---

# 一个公开读取层

## Meaning and boundaries

网页、RSS、公开 API、MCP、站点地图、分享图读的都是 `packages/backend/src/publication/` 这一个读取层。**新增出口也走它**，不在出口里另写一套查询。

这条规则解决的是一个具体的失败模式：出口一多，「什么算公开」就会在多个地方各写一份，撤回了文章但 RSS 还在发、API 还在给，是迟早的事。

## 三个定义只存在一处

公开范围、**精选席位**（机器出口每条新闻只出一条代表报道）与事实证据条件只在 `publication/scope.ts` 定义。该文件自己声明：没有别的模块把可见性、放行时间或综合稿规则写进 SQL，归组也从这里取综合稿规则；一条公开记录「持有什么」在出版时由 `publish.ts` 和 `rules.ts` 一次性推导出来。

分工是刻意的：

- **写入时**决定一条记录持有什么（`publish.ts`、`rules.ts`）。
- **读取时**决定此刻它算不算公开（`scope.ts` 的判定条件）。

## 新出口要继承的两件事

1. **撤回**：已撤回的内容在所有出口一起消失。
2. **全文许可**：站内是否显示全文由信源的 `site_fulltext` 决定，默认只显示摘要和原文链接；来源明确允许时才打开。新出口不能绕过这个许可。

## 一个容易误解的推论

已出刊报告保留当期的写作（标题、摘要），但**引用是否可公开、来源名和引用时间仍按当前资料判断**；撤回要同时移除依赖该引用的导读与封面。所以「哪一期」由日期决定，不代表内容冻结。

## 由测试守住

`tests/architecture.test.ts` 检查「公开路由只经公开读取层读内容」。调整边界时，约定与检查要一起更新。

## Related

- 读取层本身见 [公开读取层](../entities/publication-layer.md)。
- 出口清单见 [对外出口](../entities/outbound-surfaces.md)。
- 缓存与重新验证见 [缓存寿命与重新验证](cache-lifetime.md)。

## Sources

- [架构 · 几条不变的规则](../../docs/architecture.md#几条不变的规则)（`docs/architecture.md`）
