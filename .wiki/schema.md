# Wiki 的结构约定

## 页面类型与目录

| 类型 | 目录 | 放什么 | 例子 |
|---|---|---|---|
| `entity` | `entities/` | 系统里实实在在存在的东西：进程、包、子系统、后台面、出口 | [模块系统](entities/module-system.md)、[公开读取层](entities/publication-layer.md) |
| `concept` | `concepts/` | 领域规则、设计取舍、跨模块反复出现的约束 | [一个公开读取层](concepts/one-public-read-layer.md)、[事实证据与防幻觉](concepts/evidence-and-hallucination-guard.md) |
| `topic` | `topics/` | 一个可执行的工作流或场景：谁按什么顺序做什么 | [精选标准的校准闭环](topics/selection-calibration.md)、[部署、更新与备份](topics/deploy-update-backup.md) |

三种类型的划分标准是「**它是东西、是规则、还是一件事**」。不为了一次提问新增类型。

## 来源范围

- 配置里的 `sources` 分两部分：
  - **文档**：`docs/`（扩展名 `.md`、`.txt`、`.html`、`.json`；`docs/assets/` 图片排除）；
  - **规则所在的实现文件**（第二批加入，扩展名加 `.ts`）：`industry/prompts/group-{definitions,method,pair,batch,signal}.md` 与 `packages/backend/src/{lib/url.ts, content/materials.ts, events/recall.ts, events/relate.ts, events/group.ts, events/consolidate.ts, publication/stories.ts, publication/followups.ts}`。
- 加第二批的理由：这几条规则（材料身份、四类关系判定、事件生命周期）**只存在于提示词和代码里**，`docs/` 只给了概览。把它们纳入后，改这些文件会让对应页面变 `stale`，这正是想要的效果。
- **每页 frontmatter 的 `sources` 只列上面这些记账来源**，附 SHA-256 与可选锚点（代码文件用符号名当锚点，便于人找）。
- 正文里指向其他文件的链接（迁移、测试、页面组件等）是**旁证**，会标注"不记账"，不参与 freshness 计算。`README.md`、`AGENTS.md`、`CONTRIBUTING.md` 仍不在源范围内。

## 状态与新鲜度

- `status` 在本项目里基本上都是 **`implemented`**：这些能力在**当前 checkout（commit `6e67a9d`）里有对应实现**，并有文档描述。**没有**使用 `released`——本 Wiki 不验证任何一次真实部署。
- `verified_at` 只在**实际核对过证据**时填写。核对方式：读原文 + 抽查本仓库代码（`scripts/migration-safety.ts` 的 `FIRST_ONLINE_MIGRATION`、`content/materials.ts` 的 `STALE_ON_DISCOVERY_MS`、`editorial/analyze.ts` 的 `UNDERSTAND_FLOOR`、`publication/scope.ts` 的范围判定、迁移 `0051` 删掉的列）。
- `freshness` 由源文件哈希重新计算：来源文件（含上面那批代码）改了就变 `stale`，需要读一遍再决定是否修订正文。**代码作为来源的代价**：`events/group.ts` 这类文件改动频繁，相关页面会经常变 `stale`；这是刻意的取舍，因为它的规则无法从文档核实。

## 关系类型

只用合约里的六种：`related`、`describes`、`depends_on`、`implements`、`verified_by`、`supersedes`。

本批的使用约定：

- `depends_on` 表示**读这一页之前最好先读那一页**，或机制上确实依赖它。
- `implements` 表示「这一页描述的规则，由那一页的东西落地」。
- 目标一律写**页面 id**，不写路径。

## 写法

- 正文用中文，与 `docs/` 一致。
- 每页结尾的 `## Sources` 用相对 Markdown 链接指回原文（含小节锚点），路径从页面文件出发（`../../docs/…`）。
- 不整段复制原文：页面写的是**结论、边界和取舍**，细节用链接回原文。
- 推断出来的关系用限定说法，不写成已确认的事实。
