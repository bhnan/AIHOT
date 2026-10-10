---
{"id":"old-content-freshness","type":"concept","title":"旧文不刷屏与发布时间的可信度","aliases":["旧文不刷屏","48 小时","存量条目","回灌","publishedAfter","发布时间可信"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/sources.md","sha256":"fa02c4908f3a19f4af33444cb6488e490fb796ee6b74d1bfff69295d21b984d4","anchor":"规则旧文不刷屏"},{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"几条不变的规则"}],"relations":[{"type":"related","target":"source-adapters"},{"type":"related","target":"report-editions"}]}
---

# 旧文不刷屏与发布时间的可信度

## Meaning and boundaries

一条资料「新不新」决定它进不进「今天」、要不要推送。这条规则**所有入口共用**（自动采集、首次导入、外部推送），目的是防止一次性导入历史内容刷屏。

按原文时间归档、不进入「今天」也不推送的三类：

1. 首次发现时原文**已经发布超过 48 小时**的资料（代码里是 `packages/backend/src/content/materials.ts` 的 `STALE_ON_DISCOVERY_MS`）。
2. 新信源**第一次导入的存量条目**。
3. 标记为**回灌**的推送（条目的 `raw._aihot.backfill` 为 `true`）。

## 没有可信发布时间的资料先不公开

没有可信发布时间的资料**先不公开**：不进公开列表、精选、报告、热点和推送；从原信源或原文页读到日期后，再判断新旧。

这带来几处对外的可见差别：日期未知时，文章页、结构化数据和 Agent Markdown 标「收录时间」，RSS 不写 `pubDate`，OpenAPI 注明事件时间线和日报快讯的 `publishedAt` 这时是收录时间。

## 新信源第一次导入只取一段

新信源第一次导入时，只取列表里前 `_aihot.initialBackfillLimit` 条（默认 30）、`_aihot.initialBackfillMonths` 个月以内（默认 12）的条目。

**之后的抓取只收发布时间在信源第一次导入前 48 小时以内或之后的条目**——列表里更早的存量不再进来，不会为整个订阅存档付费；第一次导入以后发布的条目，排在长列表第几条都会收。列表上没有发布时间的条目照收，等读到日期再判断。X 账号按抓取位置往后读，不受这条限制。

## 固定起点

只想从某个时间之后开始监控，可在 RSS、网页列表、JSON 配置里设 `publishedAfter`（例如 `"2026-10-01T00:00:00.000Z"`，必须是完整的 UTC 时间）。预览、首次和后续采集都只接受**严格晚于**它且发布日期可信的条目，未知日期也会排除。

**一个限制**：起点当天的单页更新章节若仍使用同一发布日期，之后追加的内容也不会被纳入——选起点时要把这个考虑进去。

## 时间怎么读

- 不带时区的日期时间用 `publishedAtUtcOffset`（默认 `+08:00`）；自带时区的时间保留原时区语义；纯 `YYYY-MM-DD` 按 UTC 零点读。
- 数字时间戳用 `publishedAtUnit: "epoch_s"` 或 `"epoch_ms"`；`20261001` 这类用 `"yyyymmdd"`。
- **详情页补日期与正文提取**：先用 `detail.publishedAtUtcOffset`，未设则继承信源的 `publishedAtUtcOffset`，两处都未设时默认 `+08:00`。
- 不完整的月份、产品版本号和不存在的日历日期**不作为**发布日期。

## Related

- 信源侧的配置与频率见 [六种信源读取器与采集调度](../entities/source-adapters.md)。
- 已核实的历史日期可以人工纠正，见 [后台](../entities/admin-console.md)（只接受新旧日期都早于七天窗口的明确更正）。

## Sources

- [信源 · 规则：旧文不刷屏](../../docs/sources.md#规则旧文不刷屏)（`docs/sources.md`）
- [架构 · 几条不变的规则](../../docs/architecture.md#几条不变的规则)（`docs/architecture.md`）
