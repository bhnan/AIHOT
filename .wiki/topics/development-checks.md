---
{"id":"development-checks","type":"topic","title":"开发检查、测试与迁移约定","aliases":["测试","typecheck","smoke","迁移约定","架构测试"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"测试"},{"path":"docs/customize.md","sha256":"4fe488f898c075201a304e7cdfa4aa9b0b402137756f06cd015f93ad890e3d3a","anchor":"改完以后检查"}],"relations":[{"type":"related","target":"module-system"},{"type":"related","target":"deploy-update-backup"},{"type":"related","target":"customize-to-another-industry"}]}
---

# 开发检查、测试与迁移约定

## Summary

改完代码至少要跑这几条：

```bash
npm run typecheck
DATABASE_URL=postgres://127.0.0.1:5432/myhot_test npm test
npm run build -w @aihot/web && node --test apps/web/tests/*.test.ts
node scripts/smoke.ts --base http://localhost:3000    # 站点跑起来以后
```

## 测试怎么跑

- **数据库名必须以 `_test` 或 `_ci` 结尾**；没有会自动创建并迁移。**数据库账号要有建库权限（`CREATEDB`）**——每个测试文件在它自己的一份副本上并行运行。
- **测试不访问任何外部服务**：模型和付费接口都由本地假服务回答；推送一直关着（见 [安全阀](../concepts/safety-valves.md)）。
- 不需要数据库的测试命名为 `*.standalone.test.ts`；`npm test` 仍运行全部后端测试，只给需要数据库的文件建副本。`npm run test:standalone` 单独运行这些。
- 模块的测试在 `modules/*/tests/*.test.ts`，`npm test` 一起跑。

## 换行业时的测试预期

- **改写提示词、重新校准门槛不会让测试失败**：测试按每一步实际渲染出的提示词认请求，门槛从 `industry/selection.ts` 读。
- 但 `tests/` 里有些测试用的是**示例行业的分类、标签和公司**（比如 `ai-models`、「模型发布」、Anthropic）。改了 `industry/taxonomy.ts` 以后这些测试会失败：**把例子换成你行业里的对应项即可，测的规则本身不用改**。

## 数据库迁移约定

已经发布的迁移是**部署历史**，不能改写或删除；修正放进新的文件。引擎和模块的迁移遵循同一套约定：

- 按**完整文件名**排序执行，并以完整文件名记录是否已经执行；**编号相同的不同文件分别执行**，同一完整文件名不能出现在两个目录中。
- 从 `0055` 起（代码里是 `scripts/migration-safety.ts` 的 `FIRST_ONLINE_MIGRATION = 55`），**每个文件只放一条允许在线执行的语句**，PR 会检查，也不允许用较小编号绕过检查。这样避免前一条语句锁住表后，又在同一事务里等待别的表或扫描大量数据。
- 索引使用单独的 `CREATE INDEX CONCURRENTLY IF NOT EXISTS`；不能在发布迁移里做大批 UPDATE、DELETE 或用 DO 隐藏它们。
- 新增列**优先使用可空列或常量默认值**；给已有表加 CHECK、外键时先 `NOT VALID`，再用另一个迁移验证。
- 数据回填要另做分批、**可观测**的操作，并先在备份副本上验证。
- 多个筛选条件相关、查询计划严重低估行数时，可以为这些列创建 MCV 联合统计，再用单独的迁移 `ANALYZE` 指定表的这些列。**先用真实分布验证收益**，不增加没有依据的统计对象。
- 改类型、删列等**破坏性变更**需要单独设计升级与回退步骤，并在部署文档说明对已有数据的影响；当前在线迁移检查不会直接放行。
- 代码已不再使用的表：确认可以删数据后，单独一个迁移文件写 `DROP TABLE IF EXISTS <表>`（**不带 CASCADE**，仍有对象依赖它时迁移失败），同样在部署文档里写明。

检查脚本是 `scripts/check-migrations.ts`（配合 `scripts/migration-safety.ts`）：它同时检查已发布迁移**未被改写**、新增迁移的命名（`NNNN_name.sql`、编号不小于 0055）和在线安全性。CI 会跑它。

## 架构边界由测试守住

`tests/architecture.test.ts` 检查这几条不变规则：

- 网页只通过 HTTP 读后端（不导入 `packages/backend`、不直接用数据库）；
- `packages` 不导入 `apps`，`admin` 以下没有依赖它；
- **公开路由只经公开读取层读内容**。

调整模块边界时，要同时更新约定和这些检查——否则规则会退化成口号。

## 减少不必要的兜底

这个项目的取向是「加锁、重试、兼容旧格式、开关和兜底，先要有证据」：真实部署里发生过，或平台的语义决定它会发生。停用或替换一个功能时，**同一个改动删掉它的代码、测试、文档和存下来的状态**（库表与列、定时任务、settings、环境变量和 `.env.example` 里的项）；会删掉使用者已有数据的，在部署文档的更新说明里写明。

## Related

- 更新与迁移的执行顺序见 [部署、更新与备份](deploy-update-backup.md)。
- 模块自己的迁移与测试见 [模块系统](../entities/module-system.md)。

## Sources

- [架构 · 测试](../../docs/architecture.md#测试)（`docs/architecture.md`）
- [把它改成你的行业 · 改完以后检查](../../docs/customize.md#改完以后检查)（`docs/customize.md`）
