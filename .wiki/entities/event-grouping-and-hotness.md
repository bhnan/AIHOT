---
{"id":"event-grouping-and-hotness","type":"entity","title":"事件归组、热度与事件页综述","aliases":["归组","聚簇","事件","热度榜","story","热门"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/grouping.md","sha256":"f34305506b2a54a4d0ab0b26cfbc5b83231a463b34c094cc5c491fa122e9547b","anchor":"用自己的标注样本评测两两关系判断"},{"path":"docs/selection.md","sha256":"e51097149dec4fbb57d81a95d487df60ad5712ae9da26f2bb0903844c98d78b6","anchor":"一条资料怎么变成精选"},{"path":"docs/story-digest-evaluation.md","sha256":"88ea4b62f1e74c0c4ab6e4b880b6c5893dc4a4c343467b3b18a42aa71bda1535","anchor":"4-改完提示词之后"}],"relations":[{"type":"related","target":"selection-calibration"},{"type":"related","target":"prompt-and-model-evaluation"},{"type":"related","target":"publication-layer"}]}
---

# 事件归组、热度与事件页综述

## Definition and role

同一件事，官网发一篇、媒体转十篇、X 上吵一天，读者只需要看到一次。站点把不同来源报道的同一件事聚成一个**事件**，事件页有综述，「热门」按事件排。

代码入口在 `packages/backend/src/events/`：`relate.ts`（两两关系）、`group.ts`（归组与去重）、`recall.ts`（候选召回）、`consolidate.ts`、`merge.ts`、`digest.ts`（综述）、`hot.ts`、`corrections.ts`（人工更正与重写）。

## 两步：先召回，再让模型判断关系

1. **召回**：先用标题和摘要的向量（没配向量服务时比文字重合度）在最近两周里找候选。
2. **判断**：模型判断报道之间的关系，**同时**判断这篇报道相对精选里已有的内容有没有新信息。

## 四种关系

- `SAME_OCCURRENCE`：同一次真实发生，例如同一发布的官方原文和媒体报道。
- `SAME_STORY`：不是同一次发生，但属于同一具体事件的直接进展，例如发布后的上架、评测或回应。
- `UNRELATED`：不同的事，即使主体、产品或话题相同。
- `ROUNDUP`：其中一方是包含多个话题的汇总。

拿不准的合并，写入前再让模型复核一遍（复核可以单独换一家模型，`GROUP_REVIEW_MODEL`）。关系定义和站点实际使用的提示词在 `industry/prompts/group-*.md`。

## 归组是精选的最后一道门

分数够了的资料要**等归组完成才进精选**：模型同时判断它和精选里已有的报道是不是同一条新闻，以及它有没有精选还没给过的具体信息。

- 同一条新闻的几篇报道都可以入选（网页上折成一个阅读组），但 API、RSS 和同步接口**每条新闻只出一条**代表报道：官方一手优先；其次是核实过的官方账号（`publisherRole` + `owner_entity_id` 的 `T1_5`，新闻主体正是这家公司，机构先于个人）；再往后是有全文的、分数高的、发得早的。
- 不是同一条新闻但没有新信息的（换个说法再介绍一遍、只上架到别的平台、只重复已选要点）不进精选，留在「全部动态」。
- 材料不够、确认不了是哪条新闻的，不进精选。

**确认之前资料只在「全部动态」，等得再久也不会自动放行。** 模型调用失败或回答不合格式时资料停在那里：等待超过 10 分钟会告警，后台「运行」页列出这些资料，可在「内容诊断」里点「重新归组」——所以归组用的模型要能稳定按格式回答。

## 热度：按事件算，不按文章算

48 小时内，每个独立来源只算一次，24 小时减半。重复抓取不会多算，一家媒体发十篇也只算一次，所以排在前面的，是真正有很多人在说的事。同一家公司的几个信源在热度里只算一个参与方；社区站信源（`COMMUNITY_FEEDS`）按发帖账号计，一个账号算一个独立来源。

和 6 小时前比，涨得快的标上升，新出现的标「新」。

## 事件页综述

综述由 `industry/prompts/story-digest.md` 生成。提示词换版本本身**不会**重写已有事件的综述：一个事件只在它的报道变化时才重新生成，有新报道时以旧综述为上一版增量改写，所以新提示词随新报道逐步生效，不会一次性产生大量模型调用。想让某几个事件立即重写，用 `rewriteStoryDigest`（每个事件一次模型调用，记进后台审计）。

改这份提示词之前要先并排评测，见 [提示词与模型的评测工具链](../topics/prompt-and-model-evaluation.md)。

## Relationships

- **判定的规则与阈值**（四类关系的排除条款、召回窗口、verdict、复核门槛）见 [事件成员资格与归组判定](../concepts/event-membership-rules.md)——那一页是这一页的下钻，本页只保留概览。
- **一个事件长期会怎样**（状态机、退潮、14 天断线、`storyline` 空槽）见 [事件生命周期与长期追踪的边界](../concepts/event-lifecycle-and-tracking-limits.md)。
- 「同 URL 直接定身份」那条例外通道见 [材料身份](../concepts/material-identity.md)。
- 归组的去重结论与 [精选标准的校准闭环](../topics/selection-calibration.md) 是两件事：评测**不含**第 6 步去重，按资料本身该不该选来标。
- 公开侧的代表稿选择与席位由 [公开读取层](publication-layer.md) 的 `representative.ts` / `scope.ts` 执行。

## Sources

- [事件归组与关系评测](../../docs/grouping.md)（`docs/grouping.md`）
- [精选与校准 · 一条资料怎么变成精选](../../docs/selection.md#一条资料怎么变成精选)（`docs/selection.md`）
- [综述评测 · 改完提示词之后](../../docs/story-digest-evaluation.md#4-改完提示词之后)（`docs/story-digest-evaluation.md`）
