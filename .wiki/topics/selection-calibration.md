---
{"id":"selection-calibration","type":"topic","title":"精选标准的校准闭环","aliases":["校准","门槛","SelectBench","gold.jsonl","eval-selection"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/selection.md","sha256":"e51097149dec4fbb57d81a95d487df60ad5712ae9da26f2bb0903844c98d78b6","anchor":"校准"},{"path":"docs/customize.md","sha256":"4fe488f898c075201a304e7cdfa4aa9b0b402137756f06cd015f93ad890e3d3a","anchor":"5-门槛与校准industryselectionts"}],"relations":[{"type":"depends_on","target":"prompt-as-config"},{"type":"related","target":"prompt-and-model-evaluation"},{"type":"related","target":"admin-console"}]}
---

# 精选标准的校准闭环

## Summary

「选得准不准」是这个框架的核心质量目标，而它靠一个可重复的闭环保证：**用自己的标注样本跑评测 → 看判错的条目 → 改标准或门槛 → 再跑一遍**。

**先改标准，再动门槛**：门槛只能整体移动，解决不了「哪一类判错了」。

## 1. 准备样本集

从自己的信源里挑 **100–200 条**资料，一条一条标「该选 / 不该选」，存成 `.data/gold.jsonl`（`.data/` 不进 Git）。每行一条：

```json
{"caseId":"law-001","material":{"title":"原文标题","originalTitle":null,"publishedAt":"2026-10-01T09:00:00+08:00","sourceName":"信源名称","bodyZh":null,"bodyOriginal":"正文……"},"sourceFacts":{"sourceKind":"rss","sourceTier":"T1","firstParty":true,"language":"zh"},"samplingContext":{"benchmarkSplit":"development","samplingStratum":"regulation"},"gold":{"decision":"select"}}
```

| 字段 | 说明 |
|---|---|
| `caseId` | 唯一编号 |
| `material` | 标题、原标题、发布时间、信源名、正文（中文正文放 `bodyZh`，原文放 `bodyOriginal`，有一个就行） |
| `sourceFacts` | 信源类型、分级、是否一手（线上只有 `T1` 算一手，标注时保持一致）、语言。分级决定用哪个门槛 |
| `samplingContext` | 可选。`benchmarkSplit` 分开发集和留出集，`samplingStratum` 是你自己的分组（比如「新规」「判决」「营销」），看错在哪一类 |
| `gold.decision` | `select` 该选，`reject` 不该选，`either` 两可（**不计入准确率**） |

`industry/gold.example.jsonl` 有两条示例。四条标注建议：

- **多放难例**：差一点就该选、差一点就不该选的。一眼能判断的放太多，准确率会虚高。
- **分出留出集**（`benchmarkSplit: "holdout"`）：调提示词只看开发集，最后一轮再用留出集检查。
- **标注的人最好就是以后读这个站的人**，或者和他们口味一致的人。
- **评测只跑预筛和两次评分，不含第 6 步去重**：按这条资料本身该不该选来标，不要因为同一件事已经选过另一篇就标「不该选」。

## 2. 跑评测

```bash
node --env-file=.env scripts/eval-selection.ts --gold .data/gold.jsonl --split development --label "第一版评分标准"
```

对每条样本跑一遍预筛和两次评分，输出：

- **有效输出准确率、查准率、查全率和 F1**：只看成功得到入选决定的非 `either` 样本——模型答出来以后有多准。
- **覆盖率**：成功得到入选决定的样本占全部非 `either` 金标样本的比例。**完整准确率**则用全部非 `either` 金标样本作分母，**把模型失败或回答不合格式也算作没有正确完成**。
- **门槛扫描**：从 40 到 90 每隔 2 分（范围可在 `site/site.ts` 的 `DEPLOYMENT.selectionGold` 改），各自会得到什么结果；扫描同样同时报告有效输出准确率、覆盖率和完整准确率。
- 判错的条目，完整报告写到 `.data/eval/`，同时导入后台 SelectBench（`--no-import` 不导入）。

常用参数：`--models default,deepseek-flash` 在同一批样本上比几个模型、`--n 200` 最多抽多少条、`--split holdout` 只跑留出集、`--no-import`。

不传 `--models` 时用「精选评分」这一步线上正在用的模型：后台「模型与评测」页切换过的优先，其次是环境变量 `SCORE_MODEL`，再其次是 `site/models.ts` 的 `DEFAULTS.score`，都没有就用默认模型。

## 3. 看错例，改标准，再跑

在后台 **SelectBench** 里逐条看判错的资料和模型给的理由：

- **该选没选上**，多半是评分标准里没说清它为什么重要：在 `selection-score.md` 的「必须正常评价」里把这类价值写进去，给出例子。
- **不该选却选上了**，多半是噪声没压住：写进「必须压住」的部分。
- **整体偏松或偏紧**，而判错的条目分数都贴着门槛，再调 `industry/selection.ts` 的门槛。

每改一次跑一遍，SelectBench 里能看到每一版的对比。

## 换模型时的注意事项

**不要只看有效输出 F1**：如果覆盖率明显不同，还要一起看完整准确率——高分但经常无法完成结构化判断的模型，不应被失败样本从分母里「隐藏」掉。

## Explanation and evidence

- 样本重复：同一次评测里，不同样本渲染出完全相同的评分输入时，只共享模型的评分结果，各样本仍按自己的预筛结果、信源分级门槛和标注独立计分；**失败的结果也共享**，所以第一次跑和用已有结果重跑覆盖的样本一样。
- 重复运行复用已有回执；报告里的 token 用量和平均耗时按相关回执的**全部请求尝试**汇总，解析失败后的重试也算在内；用已有结果重跑时显示的是累计用量，**不代表这次新增的费用**。
- 评测只跑预筛和评分，**不写回**站点状态。

## Related

- 标准写在哪、怎么改见 [提示词即配置](../concepts/prompt-as-config.md)。
- 事件关系与综述的评测见 [提示词与模型的评测工具链](prompt-and-model-evaluation.md)。
- SelectBench 只是 [后台](../entities/admin-console.md) 的一个面。

## Sources

- [精选与校准 · 校准](../../docs/selection.md#校准)（`docs/selection.md`）
- [把它改成你的行业 · 门槛与校准](../../docs/customize.md#5-门槛与校准industryselectionts)（`docs/customize.md`）
