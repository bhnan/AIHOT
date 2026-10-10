---
{"id":"admin-console","type":"entity","title":"后台：信源、诊断、评测、模型与运行","aliases":["后台","admin","/admin","SelectBench","内容诊断","模型与评测"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/sources.md","sha256":"fa02c4908f3a19f4af33444cb6488e490fb796ee6b74d1bfff69295d21b984d4","anchor":"先预览再创建"},{"path":"docs/selection.md","sha256":"e51097149dec4fbb57d81a95d487df60ad5712ae9da26f2bb0903844c98d78b6","anchor":"3-看错例改标准再跑"},{"path":"docs/deploy.md","sha256":"10511424551f27f6a7cce34e4cf382e5f8b33d44774549edd68658387587f19f","anchor":"管理员会话与配置变更"}],"relations":[{"type":"related","target":"source-onboarding"},{"type":"related","target":"selection-calibration"},{"type":"related","target":"safety-valves"}]}
---

# 后台：信源、诊断、评测、模型与运行

## Definition and role

后台在 `/admin`，只允许管理员进入；**管理员和访客看到的公开内容一样**（读者的收藏、已读存在浏览器里）。后台是产品运营和开发调参的主要工作面。

## 后台的几个面

| 面 | 用来做什么 |
|---|---|
| 信源 | 新建、试抓一次看看抓到什么、改频率、启停、看失败原因和最近条目 |
| 内容诊断 | 打开某一条资料，看它卡在哪一步；归组失败的可以点「重新归组」；错误正文可以设为仅摘要 |
| SelectBench | 逐条看精选评测判错的资料和模型给的理由，对比每一版评分标准 |
| 模型与评测 | 看到每一步当前用哪个模型、近期成功率、耗时和 token 用量，并直接切换（只影响之后的新任务） |
| 运行 | 每个定时任务最近的结果；等待归组超过 10 分钟的资料 |
| 设置 | 付费请求上限、关于页二维码等 |

## 几处后台与引擎的边界

- **规则由所属模块维护**：后台调用内容、事件、通知与恢复模块，不直接改写它们的状态；业务模块不反过来依赖后台。人工修改、公开结果与恢复所需记录一起提交。
- **付费上限**：每个付费服务有每分钟、每小时、每天的上限，超过就暂停（后台「设置 → 付费请求上限」）。填 0 表示立即停用这个服务。
- **单篇操作代替脚本**：不要的信源在后台暂停；单篇的重新评估、重新归组在「内容诊断」里操作。历史上的 `scripts/delete-sources.ts`、`regroup-events.ts`、`enqueue-analysis.ts` 已被移除。
- **人工更正**：已核实的历史日期可以纠正——运维脚本先调 `previewPublicationDateCorrection`，再按预览给出的版本和校验值调 `correctPublicationDate`，并记录操作者与理由。只接受新旧日期都早于七天窗口的明确更正；不重跑模型，也不会在材料已变化或会改变其他公开决定时放行。

## 管理员会话

会话绑定**登录方式**（管理员密码或飞书身份）。修改管理员密码、飞书管理员名单或会话密钥后，应**重启所有 API 进程**，使它们加载相同的新配置——只编辑配置文件不代表正在运行的进程已生效，混用旧代码或旧配置的进程不能提供统一撤权。

轮换或移除 `SESSION_SECRET` 会使两种会话都失效；停用飞书登录应用或更换应用 ID 会使飞书会话失效，而只轮换同一应用的 secret 不会。鉴权时确认失效的会话会被删除，恢复旧配置也不会让它复活。

**系统不记录全局凭据变更历史**：某次配置变化若从未被进程加载，或在恢复前从未被会话检查观察到，不能据此追溯撤销会话。

## Relationships

- 信源页的操作细节见 [信源接入与试抓](../topics/source-onboarding.md)。
- SelectBench 是 [精选标准的校准闭环](../topics/selection-calibration.md) 的一环。
- 开关与环境变量的语义见 [安全阀](../concepts/safety-valves.md)。

## Sources

- [信源 · 先预览，再创建](../../docs/sources.md#先预览再创建)（`docs/sources.md`）
- [精选与校准 · 看错例，改标准，再跑](../../docs/selection.md#3-看错例改标准再跑)（`docs/selection.md`）
- [部署 · 管理员会话与配置变更](../../docs/deploy.md#管理员会话与配置变更)（`docs/deploy.md`）
