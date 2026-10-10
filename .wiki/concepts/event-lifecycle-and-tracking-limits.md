---
{"id":"event-lifecycle-and-tracking-limits","type":"concept","title":"事件生命周期与长期追踪的边界","aliases":["事件状态","退潮","settled","14 天窗口","长期追踪","storyline","事件中心"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"packages/backend/src/publication/stories.ts","sha256":"3baeb746891a39f3560cf3f94da0191c338d5c761d47571d8b36d5f638169227","anchor":"storyStatusFor / relatedStories"},{"path":"packages/backend/src/publication/followups.ts","sha256":"49bd2cb37e9e9ccbc34a79149fe57f47d07f0c146e7bb65ba9344c22af1397b5","anchor":"loadStoryFollowups"},{"path":"packages/backend/src/events/consolidate.ts","sha256":"6a617e274c557f7f073c385380a6bc841262800d0c84557e36b5dea436d87fe8","anchor":"linkRelatedStories"}],"relations":[{"type":"depends_on","target":"event-membership-rules"},{"type":"related","target":"cache-lifetime"},{"type":"related","target":"report-editions"}]}
---

# 事件生命周期与长期追踪的边界

## Meaning and boundaries

「一个事件后来怎么样了、退潮后还能不能查到」是产品问题，但它由几个很具体的机制决定。这一页把**已经做到的**和**结构性做不到的**分开写清楚，避免设计新功能时踩空。

## 已经在做的

### 1. 状态是算出来的，不是存下来的

`publication/stories.ts` 的 `storyStatusFor(latestAt, now)`：

| 距最近一次进展 | 状态 |
|---|---|
| < 24 小时 | `active` |
| < 72 小时 | `watching` |
| ≥ 72 小时（或从无进展） | `settled` |

**这就是"退潮"的机器可读信号**，已经出现在事件页和公开接口上。注意 `stories.status` 这个**列**在迁移 `0051` 里被删除了——现在的状态一律由最新公开报道算出来，不存字段。

### 2. 后续挂载 + 综述增量改写

新报道若被判 `new-fact-in-story`，会**新建一个事实挂在同一个事件下**，`stories.latest_at` 用 `GREATEST` 前进、`first_report_at` 用 `LEAST` 前移；事件综述在有新报道时以旧综述为上一版**增量改写**（不是每次全量重写，避免一次性大量模型调用）。

### 3. "事件后续"清单已经存在

`publication/followups.ts` 的 `loadStoryFollowups(storyPublicId)`——注释原文是「**"事件后续" on an article page**」：返回该事件下**入选过精选**的事实，按首次出现排序，最多 **8** 条（`SHOWN = 8`），展示在文章页。

### 4. 数据永不删除

`operations/retention.ts` 只清理：过期的投递租约、job 运行记录（30 天，失败 90 天）、反馈截图（8 天）、派生缓存。**事件、报道、精选一律保留**——所以"过几个月回来查"在数据层是成立的。

### 5. 事后纠错（批次层，不是主路径）

`events/consolidate.ts`：

- **合并**：同一篇报道被**牢固**绑到两个事件时，直接比较两个事件的**根事实**，**两个模型都认为是一个故事**才合并；合并会迁移 facts 与 signals、置 `merged_into`、`version+1`、把时间范围取并集、**旧 `public_id` 写进 `story_aliases` 让旧地址继续可用**、重新发布文章并重写综述。
- **互连**：两个事件保持分开但**至少两条**高置信 tie → 互写 `story_links`（`relation = 'related'`），事件页显示"相关事件"（最多 8 个）。
- 讨论帖会在附近出现新事实时被**再匹配一次**（回看 6 小时）；等它回复/引用的帖子最多 48 小时；历史内容（`isHistorical`）**不建立事件**。

### 6. 事件名稳定

事件名取自**开启它的那篇报道所抽出的事实标题**（`frame.title || title`，截断 60 字），**此后没有任何地方重写 `stories.title`**——只有事件合并时才会变。所以"名字"不是聚类产物，是逐篇生长定下来的。

## 结构性做不到的（三个边界）

### 边界一：14 天召回窗口 ⇒ 沉寂后断线

召回只看**最近 14 天**（[事件成员资格](event-membership-rules.md)）。所以：

> 一个事件沉寂超过 14 天后出现的新后续，**召回不到原事件 → 会建成一个全新事件**，叙事断线。

"相关事件"也救不了它——`linkRelatedStories` 同样只看召回窗口内的判定记录。这不是缺陷，是**候选量与费用的取舍**：全局放宽窗口会让每次归组都比对全库。

### 边界二：`storyline` 是个没有生产者的空槽

`story_links.relation` 的合法值是 `('storyline','related')`，而**读取侧全都在用 `storyline`**：

- 事件页把它渲染成 **「同一故事线」**（`apps/web/app/routes/story.tsx`）
- 公开读取层单独分组：`storyline: neighbors.filter(n => n.relation === "storyline")`
- Agent Markdown 把「主线 + 相关」合并输出
- `packages/contracts/src/site.ts` 有对应类型

**但整个仓库没有任何代码写入 `'storyline'`**——唯一的 `INSERT INTO story_links` 写的是 `'related'`（`consolidate.ts`）。这看起来和 `chronicle`（主题页大事记，在 4.0.0 被移出框架）属于同一类：**AIHOT 线上专有功能在开源时被剥掉的痕迹**。

两个后果：① 数据模型、公开读取与页面渲染**早就为"跨事件主线"留好了位置**；② `story_links` 由 `events/` 独占写（`tests/architecture.test.ts` 的 OWNERS 表），**模块写不了它**。

### 边界三：没有"我关注的事件"清单

读者收藏（`/starred`）存在**浏览器本地**，而且单位是**报道**，不是事件。所以"我关注这条线的后续"目前没有服务端载体。

## 产品上的含义

- **退潮沉底是故意的**：热度榜是 48 小时窗口 + 按独立来源计数的快变量；长期跟踪不该改它，应该另建**事件中心**（按 `latest_at` 列事件 + 状态徽章 + 沉寂时长）——现成的索引 `stories_latest_idx ON stories (latest_at DESC) WHERE merged_into IS NULL` 就是为这种查询准备的。
- **"后来怎么样了"取决于有没有人来报**。退潮后再无信源报道时，引擎**不会**自己生成后续：事件页停在最后一次进展，状态变 `settled`。所以正确的表达是「**最后进展：X 时间｜此后无新报道**」，而不是假装事件已结束或已结案。
- **想让沉寂的事件接回后续**，只有两条路：① 对被关注的/未结案的事件做**定向召回**（同实体、同标签、向量近邻），属于改引擎语义；② 给 `storyline` 补一个生产者（同样要动引擎）。

## Related

- 成员资格判定与 14 天窗口的规则见 [事件成员资格与归组判定](event-membership-rules.md)。
- 数据的对外口径（往期报告为什么不是快照）见 [缓存不延长旧内容的寿命](cache-lifetime.md) 与 [日报、周报、月报的成刊规则](../entities/report-editions.md)。

## Sources

- [publication/stories.ts](../../packages/backend/src/publication/stories.ts) — `storyStatusFor`、`relatedStories`
- [publication/followups.ts](../../packages/backend/src/publication/followups.ts) — `loadStoryFollowups`
- [events/consolidate.ts](../../packages/backend/src/events/consolidate.ts) — `linkRelatedStories`、合并与 `story_aliases`
- 旁证（不记账）：迁移 `database/migrations/0002_events_reports.sql` 的 `story_links` 约束与 `stories` 列定义、`database/migrations/0051_drop_unused_state.sql` 删除 `stories.status`
