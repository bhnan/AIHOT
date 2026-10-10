# Wiki 日志

- 2026-10-08T08:24:52.408454+00:00: 初始化 software 框架。
- 2026-10-08：从 `docs/` 完成首次 ingest，作者页面 22 篇（entities 9、concepts 7、topics 6），并填好本索引、总览、用途与结构约定。
  - 来源：`docs/` 下 7 份文档（architecture、customize、sources、selection、grouping、story-digest-evaluation、deploy，共 991 行）+ 2 份示例 fixture（`docs/examples/sources/news.html`、`news.json`）。全部按 SHA-256 记入各页 frontmatter，校验通过。
  - 交叉验证（未记为来源）：`scripts/migration-safety.ts` 的 `FIRST_ONLINE_MIGRATION = 55` 与一条语句的在线迁移检查、`packages/backend/src/content/materials.ts` 的 `STALE_ON_DISCOVERY_MS = 48h`、`packages/backend/src/editorial/analyze.ts` 的 `UNDERSTAND_FLOOR` 读自 `industry/selection.ts`、`packages/backend/src/publication/scope.ts` 的公开范围注释、`packages/backend/src/publication/stories.ts` 的 48 小时热度窗口、`site/modules/` 三份清单为空（框架不带模块）。
  - 覆盖取舍：**未**覆盖 `README.md`、`AGENTS.md`、`CONTRIBUTING.md`、`SECURITY.md` 与 `docs/assets/` 图片；`docs/deploy.md` 里的逐版本更新历史只提炼为「更新顺序与注意点」，未逐条收入。
- 2026-10-08：第二次 ingest —— 把「材料身份 / 归组判定 / 事件生命周期」这三块**只存在于提示词与代码里的规则**写成 3 页设计文档。
  - 新增页面：`concepts/material-identity.md`、`concepts/event-membership-rules.md`、`concepts/event-lifecycle-and-tracking-limits.md`（共 23 页）。
  - **改了 `config.json` 的来源范围**（这是本次的结构性改动）：`extensions` 加 `.ts`；`sources` 在 `docs/` 之外新增 13 个文件——`industry/prompts/group-{definitions,method,pair,batch,signal}.md` 与 `packages/backend/src/{lib/url.ts, content/materials.ts, events/recall.ts, events/relate.ts, events/group.ts, events/consolidate.ts, publication/stories.ts, publication/followups.ts}`。理由：`docs/` 只给了概览，这几条规则无法从文档核实。代价已写进 `schema.md`：这些代码改动频繁，相关页面会经常变 `stale`。
  - 同步更新：`entities/event-grouping-and-hotness.md`（加下钻链接，避免与新的概念页重复）、`index.md`（新增 3 条「按问题找」与 3 页条目）、`schema.md`（来源范围与状态/新鲜度两节改写）。
  - 本轮结论中**最具设计价值的两条**：`same-url` 是「同一份发布物」的一致性兜底、**不是新报道认亲的通道**（新报道走召回 + 模型四分类；X 回复/引用才是天然服务于新内容的精确通道）；`story_links.relation='storyline'`（事件页显示为「同一故事线」）**读取侧齐备但没有任何生产者**，且该表由 `events/` 独占写。
