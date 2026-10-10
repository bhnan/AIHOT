# Wiki 索引

这是一个行业热点站框架（AIHOT）的设计与开发知识库。材料来自 `docs/`，以及**只存在于提示词和代码里的那几条规则**（材料身份、归组判定、事件生命周期）——见 [结构约定](schema.md) 的「来源范围」。

## 按问题找

| 我想…… | 读这几页 |
|---|---|
| 换成我的行业 | [改成你的行业：八步清单](topics/customize-to-another-industry.md) → [站点包与行业包](entities/configuration-packages.md) → [提示词即配置](concepts/prompt-as-config.md) |
| 让它选得准 | [精选标准的校准闭环](topics/selection-calibration.md) → [提示词与模型的评测工具链](topics/prompt-and-model-evaluation.md) → [后台](entities/admin-console.md) |
| 搞清引擎怎么跑 | [三个进程](entities/three-processes.md) → [公开读取层](entities/publication-layer.md) → [对外出口](entities/outbound-surfaces.md) |
| 理解一条资料的一生 | [六种信源读取器与采集调度](entities/source-adapters.md) → [材料身份](concepts/material-identity.md) → [事件成员资格与归组判定](concepts/event-membership-rules.md) → [日报、周报、月报的成刊规则](entities/report-editions.md) |
| 搞清"为什么这两篇被归到一起" | [事件成员资格与归组判定](concepts/event-membership-rules.md)（四类关系的排除条款、召回窗口、verdict） |
| 搞清"同一个 URL 会不会算两篇" | [材料身份](concepts/material-identity.md)（身份键、规范化、修订、`same-url` 兜底） |
| 关心一个事件退潮后会怎样 | [事件生命周期与长期追踪的边界](concepts/event-lifecycle-and-tracking-limits.md)（状态机、14 天断线、`storyline` 空槽） |
| 接一个新信源 | [信源接入与试抓](topics/source-onboarding.md) → [六种信源读取器与采集调度](entities/source-adapters.md) → [旧文不刷屏与发布时间的可信度](concepts/old-content-freshness.md) |
| 加一个只有我的站要的功能 | [模块系统](entities/module-system.md) → [对外出口](entities/outbound-surfaces.md) |
| 上线、升级、备份 | [部署、更新与备份](topics/deploy-update-backup.md) → [安全阀](concepts/safety-valves.md) → [开发检查与测试](topics/development-checks.md) |
| 改完代码要跑什么 | [开发检查与测试](topics/development-checks.md) → [改成你的行业：八步清单](topics/customize-to-another-industry.md) |

## 全部页面

### 设计（`concepts/`）

- [一个公开读取层](concepts/one-public-read-layer.md) — 为什么所有出口只走一条读路径，公开范围只定义一次
- [材料身份：同一 URL 意味着什么](concepts/material-identity.md) — 身份键与规范化、跨信源发现、修订的四道防抖、`same-url` 兜底
- [事件成员资格与归组判定](concepts/event-membership-rules.md) — 三层结构、召回与阈值、四类关系与排除条款、verdict、复核
- [事件生命周期与长期追踪的边界](concepts/event-lifecycle-and-tracking-limits.md) — 状态机、后续与 followups、永不删除、14 天断线、`storyline` 空槽
- [提示词即配置：版本就是内容的哈希](concepts/prompt-as-config.md) — 行业 KnowHow 的载体、版本机制、评分标准骨架
- [事实证据与防幻觉](concepts/evidence-and-hallucination-guard.md) — 输入安全边界、先抽事实再写作、报告导读的机械兜底
- [付费请求的回执与预算熔断](concepts/paid-request-receipts.md) — 不重复付费、结果不明的处理、评测也遵守
- [安全阀：只认 true 的开关](concepts/safety-valves.md) — 开关语义、开发与测试时的状态
- [旧文不刷屏与发布时间的可信度](concepts/old-content-freshness.md) — 48 小时归档、存量与回灌、时间怎么读
- [缓存不延长旧内容的寿命](concepts/cache-lifetime.md) — 到期重新验证、站点地图共用截止时间、对 CDN 的要求

### 系统构成（`entities/`）

- [三个进程：api、worker、web](entities/three-processes.md) — 运行时拓扑、部署形态、由测试守住的边界
- [公开读取层 publication/](entities/publication-layer.md) — 唯一读路径的职责分工与两条硬规则
- [模块系统 modules/](entities/module-system.md) — 三个插口、启用清单、静态文件、MCP 工具、边界原则
- [站点包 site/ 与行业包 industry/](entities/configuration-packages.md) — 改行业只动这两个文件夹，哪些字段上线后不能改
- [六种信源读取器与采集调度](entities/source-adapters.md) — 六种信源、预览、分级与全文、抓取频率
- [事件归组、热度与事件页综述](entities/event-grouping-and-hotness.md) — 四种关系、精选的最后一道门、热度算法
- [日报、周报、月报的成刊规则](entities/report-editions.md) — 日报怎么排、周报月报怎么汇编、往期为什么不是快照
- [对外出口：网页、RSS、API、MCP、llms.txt](entities/outbound-surfaces.md) — 出口清单、版本与命名约定、根目录固定文件
- [后台：信源、诊断、评测、模型与运行](entities/admin-console.md) — 后台的几个面、人工更正、管理员会话

### 场景与流程（`topics/`）

- [改成你的行业：八步清单](topics/customize-to-another-industry.md) — 按顺序要改的八件事与验收命令
- [精选标准的校准闭环](topics/selection-calibration.md) — 标注样本格式、指标口径、先改标准再动门槛
- [提示词与模型的评测工具链](topics/prompt-and-model-evaluation.md) — 关系评测、综述并排评测、让新提示词生效
- [信源接入与试抓](topics/source-onboarding.md) — 预览流程、本地 HTML/JSON 示例、外部推送接口
- [部署、更新与备份](topics/deploy-update-backup.md) — Docker 与非 Docker、更新顺序、备份与恢复
- [开发检查、测试与迁移约定](topics/development-checks.md) — 验收命令、测试的数据库要求、迁移的在线安全规则

## 维护

- 结构约定、来源范围、状态与新鲜度语义见 [schema.md](schema.md)；用途与范围见 [purpose.md](purpose.md)。
- 源文档改动后：`python3 <skill>/scripts/wiki.py diff --root /root/AIHOT` 看哪些页面受影响，读一遍再决定是否修订。
