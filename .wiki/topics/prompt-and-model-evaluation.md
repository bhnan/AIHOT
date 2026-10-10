---
{"id":"prompt-and-model-evaluation","type":"topic","title":"提示词与模型的评测工具链","aliases":["评测","eval-relations","eval-story-digests","eval-tools","并排对比"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/grouping.md","sha256":"f34305506b2a54a4d0ab0b26cfbc5b83231a463b34c094cc5c491fa122e9547b","anchor":"用自己的标注样本评测两两关系判断"},{"path":"docs/story-digest-evaluation.md","sha256":"88ea4b62f1e74c0c4ab6e4b880b6c5893dc4a4c343467b3b18a42aa71bda1535","anchor":"2-并排对比"},{"path":"docs/deploy.md","sha256":"10511424551f27f6a7cce34e4cf382e5f8b33d44774549edd68658387587f19f","anchor":"工具与修复"}],"relations":[{"type":"related","target":"selection-calibration"},{"type":"related","target":"event-grouping-and-hotness"},{"type":"related","target":"paid-request-receipts"}]}
---

# 提示词与模型的评测工具链

## Summary

框架里凡是要改提示词或换模型的地方，都配了一个**在同一批样本上并排比较**的工具，用数据而不是页面印象来决定。三个脚本共用 `scripts/eval-tools.ts`。

| 脚本 | 评什么 | 需要标注数据 |
|---|---|---|
| `scripts/eval-selection.ts` | 预筛 + 两次评分（精选门槛） | 是，见 [精选标准的校准闭环](selection-calibration.md) |
| `scripts/eval-relations.ts` | 两篇报道之间的四种关系 | 是，成对样本 |
| `scripts/eval-story-digests.ts` | 事件综述提示词 | 否，可从库里导出真实事件 |

## 两两关系评测：`eval-relations.ts`

它**只评测模型对两篇报道之间关系的判断**，直接复用站点归组时用的 `PAIR_SYSTEM`、`pairUser()`、`PairSchema` 和提示词版本——**提示词变了，评测也跟着变**。它不重新跑候选召回，也不把结果写回事件归组。

标注数据放 `.data/`（不提交 Git），`industry/relation-gold.example.jsonl` 有四条虚构示例：

```json
{"caseId":"release-001","a":{"title":"...","source":"...","firstParty":true,"publishedAt":"2026-09-01T09:00:00+08:00","summary":"..."},"b":{"title":"...","source":"...","firstParty":false,"publishedAt":"2026-09-01T09:20:00+08:00","summary":"..."},"samplingContext":{"benchmarkSplit":"development","samplingStratum":"same-release"},"gold":{"relation":"SAME_OCCURRENCE"}}
```

`a`、`b` 还可以带与站点内部 `ReportView` 一致的可选 `frame`：

```json
{"subject":"Acme","action":"发布","object":"Acme-2","occurredAt":"2026-09-01"}
```

```bash
node --env-file=.env scripts/eval-relations.ts --gold .data/relation-gold.jsonl --split development
node --env-file=.env scripts/eval-relations.ts --gold .data/relation-gold.jsonl \
  --models default,deepseek-flash --split development --n 200 --seed 7 --thresholds 0.75,0.8
```

| 参数 | 默认值 | 说明 |
|---|---:|---|
| `--gold` | `.data/relation-gold.jsonl` | 标注样本文件（JSONL） |
| `--models` | 「归组复核」当前的模型 | 逗号分隔的模型名 |
| `--split` | `all` | `development`、`holdout` 或自己定的分组 |
| `--n` | `200` | 最多评测多少条 |
| `--seed` | `7` | 抽样随机种子，种子相同则样本相同 |
| `--concurrency` | `6` | 同时发出的模型请求数 |
| `--thresholds` | production 的 `STORY_REVIEW_MIN_CONFIDENCE,TIE_MIN_CONFIDENCE` | 判断「连进同一事件」的置信度门槛 |

报告写到 `.data/eval/relations-*.json`，每个模型得到：**4 × 4 的对照表**（每种标注关系被判成了哪种）、每种关系的查准/查全/F1 与样本数、`coverage`、`accuracy` 与四类 macro-F1、`completeAccuracy`（把调用失败或回答不合格式也算作没正确完成），以及各个置信度门槛下的查准/查全/F1（把 `SAME_OCCURRENCE`、`SAME_STORY` 都算作「连进同一事件」），另有出错条数、token 用量、平均与总耗时、每条样本的判断与 `difference` 说明和回执编号。

## 综述评测：`eval-story-digests.ts`

改 `industry/prompts/story-digest.md` **之前**，先在同一批事件上把现有提示词和候选提示词并排跑一遍，**人工比较**。

**第一步，从库里导出真实事件**（只读数据库，不调用模型，不改动任何事件）：

```bash
node --env-file=.env scripts/eval-story-digests.ts --stories <事件id>,<事件id> --out .data/story-digest-cases.jsonl
```

事件 id 是事件页地址 `/story/<id>` 里的那一段。报道按站点生成综述时的同一套规则取——**只是顺带提及的、综合稿、撤下的和尚未公开的报道不算**；已有综述的事件按「更正后重写」组装（不带上一版综述）。想测有新报道时的增量更新，把 `inputMode` 改为 `incremental`，填 `story.previousDigest` 和 `knownArticleIds`。也可以按 `industry/story-digest-eval.example.jsonl` 的格式手写。

**第二步，并排对比**：

```bash
node --env-file=.env scripts/eval-story-digests.ts --cases .data/story-digest-cases.jsonl --system my-candidate.md
```

- 每个案例用现有提示词和候选提示词**各跑一次**：同一个模型，同一份输入，发给模型的系统提示词、输入和采样参数与站点生成综述时完全相同。
- 候选文件的写法与 `industry/prompts/` 相同（`{{siteName}}`、`{{> 文件名}}`）；渲染后与现有提示词完全相同时拒绝运行。不传 `--system` 时只跑现有提示词。
- 开始前打印调用次数（案例数 × 模型数 × 提示词数），**超过 `--max-calls`（默认 18）一次都不发**。
- 结果写到 `.data/eval/`（一份 JSON、一份 Markdown）：两边标题和综述并排，附 token 用量和记录编号，失败的调用写明原因。

**人工看什么**（这个工具**不让模型给模型打分**，没有可靠的自动分数）：

- 是否先讲清核心变化和当前结论，而不是按日期复述下方的时间线；
- 有没有空泛的宣传腔和套话；
- 条件、适用对象、收费与额度、地域等限制是否仍绑在对应对象上；
- 有没有报道和事实证据里没有的内容，有没有评论报道本身（「报道未披露……」）或把写作要求写进正文；
- 更正后重写时，失效的旧说法是否清掉了。

## 让新提示词立即生效

提示词换版本**不会重写**已有事件的综述——它随新报道逐步生效，不会一次性产生大量模型调用。想让某几个事件立即用新提示词重写：

```bash
node --env-file=.env --input-type=module -e '
const { rewriteStoryDigest } = await import("@aihot/backend/events/corrections");
const { sql } = await import("@aihot/backend/db");
const [s] = await sql`SELECT id FROM stories WHERE public_id = ${"<事件id>"}`;
if (!s) throw new Error("没有这个事件 id");
console.log(await rewriteStoryDigest(s.id, "综述提示词已更新", "ops-script"));
await sql.end();'
```

每个事件一次模型调用，记进后台审计。

## Explanation and evidence

- 三个脚本的模型调用都经过[回执和预算熔断](../concepts/paid-request-receipts.md)：**原样重跑复用已收到的结果**，所以改一版候选再跑时，现有提示词那一半不花钱。
- CI 检查 JSONL 解析、固定种子的抽样、各项指标，以及本地假模型服务下的并发复用和重试用量统计，**不访问外部模型服务**。
- `eval-selection.ts` 的 `--n`、`--concurrency` 和模型名写错时**直接报错**。

## Related

- 门槛与评分标准的校准见 [精选标准的校准闭环](selection-calibration.md)。
- 被评的对象见 [事件归组、热度与事件页综述](../entities/event-grouping-and-hotness.md)。

## Sources

- [事件归组与关系评测](../../docs/grouping.md#用自己的标注样本评测两两关系判断)（`docs/grouping.md`）
- [综述评测 · 并排对比](../../docs/story-digest-evaluation.md#2-并排对比)（`docs/story-digest-evaluation.md`）
- [部署 · 工具与修复](../../docs/deploy.md)（`docs/deploy.md`）
