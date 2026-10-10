---
{"id":"report-editions","type":"entity","title":"日报、周报、月报的成刊规则","aliases":["日报","周报","月报","成刊","edition","出刊"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/selection.md","sha256":"e51097149dec4fbb57d81a95d487df60ad5712ae9da26f2bb0903844c98d78b6","anchor":"一条资料怎么变成精选"},{"path":"docs/customize.md","sha256":"4fe488f898c075201a304e7cdfa4aa9b0b402137756f06cd015f93ad890e3d3a","anchor":"1-站名和文案sitesitets"},{"path":"docs/deploy.md","sha256":"10511424551f27f6a7cce34e4cf382e5f8b33d44774549edd68658387587f19f","anchor":"原帖展示与引擎同步2026-年-10-月-6-日"}],"relations":[{"type":"related","target":"event-grouping-and-hotness"},{"type":"related","target":"evidence-and-hallucination-guard"},{"type":"related","target":"publication-layer"}]}
---

# 日报、周报、月报的成刊规则

## Definition and role

出刊是这个框架的产品出口：**日报按规则编，不调用模型**；周报月报从日报汇编，模型只写总述和栏目导读。代码在 `packages/backend/src/reports/`（`edition.ts` 定档与窗口、`compose.ts` 编排与模型调用、`correct.ts` 更正）。

出刊时间默认日报 08:00、周报周一 10:00、月报每月 1 日 10:30（北京时间），在 `site/site.ts` 的 `EDITION_TIMES` 里改。**排程每半小时检查一次，所以写整点或半点。**

## 日报（不调模型）

- 覆盖前一天 08:00 到当天 08:00，按规则编排。
- **一件事一条**，取报道最多的那条新闻里最权威的一篇；同一事件当天的其他进展列在下面；讲多件事的综合稿挂到它提到的最重要那件事下面。
- 最近 7 期报过的不再出现；报过的事件再有进展，只有**当事方自己有新动作**（教程、观点这类 `commentary` 类别不算）、或这条进展**有 4 家以上信源报道**时才进正文，其余进快讯。
- 没有报道入选、但有官方原帖并且已有 3 个以上独立参与方的事件也会补进来（**只进日报，不进精选、不推送**）。
- 排序：入选报道的最高分、当天讨论它的独立参与方、有没有官方原帖，跟进的减分。前 12 条进正文，**同一信源最多 2 条**，再往后最多 10 条一行快讯。第一条是头条，第 2–4 条是今日看点。
- 时段内**有资料经过评判但没有新大事**时照常出刊，用 `REPORTS.quiet` 的标题与导语（导语里 `{start}`、`{end}` 是时段起止）。**没有任何资料经过评判仍算采集或判断失败，不伪装成平静的一天。**

## 周报与月报（模型只写总述与导读）

- 由这一周、这个月的日报汇编：同一事件跨天只算一件，按日报给它的位置（头条、看点、上了几天）、报道面和评分排序，周报取前 20 件、月报取前 30 件，按日报的分节分栏目。
- 模型（`report-period.md`、`report-period-sections.md`）**只写总述和三件以上栏目的一句导读，不增删条目**。
- **防幻觉兜底**：模型写出了条目里没有的名字或数字（拉丁字母的名称、三位以上或带小数点、百分号的数字、词表里的公司），这段话就不用——总述换成按模板生成的一句，栏目不放导读。行业通用词（`taxonomy.ts` 的 `PLAIN_TERMS`）和站名不受这个限制。

## 每期只收一次

每条精选只进一期：按它的时间算，确认入选比它晚的按确认时间；截止以后才确认的进下一期。

每半小时检查一次：到点的刊期出一次，**已经出过的不重写**；停机错过的、失败的，在之后的检查里补上。窗口里没有可收条目时这一期不出，之后每半小时再试，到 10 点还没有当天的日报会告警。

## 往期报告不是快照

日期、周和月份确定的是**哪一期**，不代表内容永久不变：报告保留出刊时写下的标题和摘要，但来源名和引用时间跟随当前公开资料；已撤回的引用及依赖它的导读、封面不再分发。保留报告副本的客户端应在 `Cache-Control` 到期后带 `If-None-Match` 重新请求。

## 版面上的可配置项

报头的出版者一行、旁边的一个词、每种报告页面的描述、一期里一条怎么称呼（`REPORTS.entry`，默认「件大事」）、报头数字后面的单位、分享图上的条数说法，都在 `site/site.ts` 的 `REPORTS` 里。日报报头的「N 个新模型」按 `industry/taxonomy.ts` 的 `RELEASE` 数（没有这类发布的行业设成 `null`，就不显示这个数）。

## Relationships

- 成刊内容来自 [事件归组与热度](event-grouping-and-hotness.md) 之后的公开结果。
- 栏目导读的防幻觉兜底与 [事实证据与防幻觉](../concepts/evidence-and-hallucination-guard.md) 是同一条设计线。

## Sources

- [精选与校准 · 一条资料怎么变成精选](../../docs/selection.md#一条资料怎么变成精选)（`docs/selection.md`）
- [把它改成你的行业 · 站名和文案](../../docs/customize.md#1-站名和文案sitesitets)（`docs/customize.md`）
- [部署 · 原帖展示与引擎同步](../../docs/deploy.md)（`docs/deploy.md`）
