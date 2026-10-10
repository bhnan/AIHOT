---
{"id":"paid-request-receipts","type":"concept","title":"付费请求的回执与预算熔断","aliases":["回执","receipts","预算熔断","付费上限","重复付费"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"几条不变的规则"},{"path":"docs/deploy.md","sha256":"10511424551f27f6a7cce34e4cf382e5f8b33d44774549edd68658387587f19f","anchor":"花多少钱"},{"path":"docs/grouping.md","sha256":"f34305506b2a54a4d0ab0b26cfbc5b83231a463b34c094cc5c491fa122e9547b","anchor":"运行"}],"relations":[{"type":"related","target":"safety-valves"},{"type":"related","target":"prompt-and-model-evaluation"},{"type":"related","target":"source-adapters"}]}
---

# 付费请求的回执与预算熔断

## Meaning and boundaries

**每个付费请求（模型、X、公众号、Jina）先记一张回执，拿到结果先存再用。** 进程重启、任务重试时复用已经付过钱的结果，不重复花钱。实现在 `packages/backend/src/providers/receipts.ts`。

它约束的是所有会花钱的调用，不只是模型——包括后台的「预览抓取」（X 和 Jina 预览也可能产生费用）。

## 结果不明时的处理

付费调用有两种失败：明确的失败，和**结果不明**（进程被杀、网络超时后不知道对方有没有算钱）。

- 结果不明的回执**超过 30 分钟后自动放行一次**（`operations/recover.ts`）。
- 因它停在失败状态的文章会重新入队，继续未完成的正文提取或分析。
- **再次结果不明时**，由管理员在后台「运行」页核对后放行——不会无限自动重试。

这条 30 分钟的延迟和「停 worker 时至少给它 210 秒」是同一个考虑：让进行中的付费调用收尾。

## 预算熔断

每个付费服务有**每分钟、每小时、每天**的上限，超过就暂停（后台「设置 → 付费请求上限」）。填 0 表示立即停用这个服务。默认不启用付费采集：填了 key 才会用。

**不要绕开回执和熔断**去直接调付费接口——这是这个仓库明确写下的规则之一。

## 评测也遵守同一套

三个评测脚本（`eval-selection.ts`、`eval-relations.ts`、`eval-story-digests.ts`）的模型调用同样经过回执和预算：

- 相同模型、提示词和输入的重复评测**复用已有回执**，不再付费——所以「改一版候选提示词再跑」时，对照的那一半不花钱。
- 同一次运行中输入相同的样本共享一次请求结果，各自按自己的标注计分；失败也共享，不在这次运行里重复请求。
- 评测回执用单独的用途标记（如 `eval_relation_pair`），**不计入站点归组那几步在后台的统计**。
- 报告里的 token 用量和平均耗时按引用回执的**全部请求尝试**汇总，包括之前解析失败的响应；用已有结果重跑时显示的是历史用量，**不代表这次新增的费用**。

## 成本量级

按示范信源的试跑记录：第一次导入的 152 条资料一共用了大约 930 次模型调用（每条要预筛、评分两次、结构化、写标题摘要，再归组，另有综述、周报月报总述和全文翻译）。日报按规则编排，**不调用模型**。之后每天用多少，取决于信源每天更新多少条。后台「模型与评测」页能看到每一步的调用次数和输入输出 token 数。

## Related

- 开关语义见 [安全阀](safety-valves.md)。
- 评测脚本的用法见 [提示词与模型的评测工具链](../topics/prompt-and-model-evaluation.md)。

## Sources

- [架构 · 几条不变的规则](../../docs/architecture.md#几条不变的规则)（`docs/architecture.md`）
- [部署 · 花多少钱](../../docs/deploy.md#花多少钱)（`docs/deploy.md`）
- [事件归组与关系评测 · 运行](../../docs/grouping.md#运行)（`docs/grouping.md`）
