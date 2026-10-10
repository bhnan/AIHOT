---
{"id":"safety-valves","type":"concept","title":"安全阀：只认 true 的开关","aliases":["安全阀","COLLECT_ENABLED","MODEL_CALLS_ENABLED","ENABLED 开关"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"几条不变的规则"},{"path":"docs/deploy.md","sha256":"10511424551f27f6a7cce34e4cf382e5f8b33d44774549edd68658387587f19f","anchor":"社区修复时间规则与读取优化2026-年-10-月-4-日"}],"relations":[{"type":"related","target":"paid-request-receipts"},{"type":"related","target":"development-checks"},{"type":"related","target":"deploy-update-backup"}]}
---

# 安全阀：只认 true 的开关

## Meaning and boundaries

一组环境变量决定「发不发出去」：

`COLLECT_ENABLED`、`MODEL_CALLS_ENABLED`、`FEISHU_CONTENT_PUSH_ENABLED`、`FEISHU_INTERNAL_ENABLED`、`INDEXNOW_SUBMIT_ENABLED`。

三条语义：

1. **只有设成 `true` 才打开**，没写就是关。
2. 它们**只决定发不发出去，不决定走哪套逻辑**——没有「关掉时走另一条简化路径」的分支。
3. **只有小写的 `true`** 才算打开。曾经写 `1` 或 `TRUE` 也算打开，现在都当作关闭；升级时要注意这一点。

## 开发与测试时的状态

- `scripts/init-env.ts` 生成的 `.env` 会**打开**采集和模型调用；只调界面时可以改成 `false`。
- 测试里**推送一直关着**，采集和模型调用只连本地假服务，不访问任何外部服务。
- `COLLECT_ENABLED` 不是 `true` 时，每天 04:40 取信源图标的任务也停下——不再访问信源网站。

## 一个容易踩的坑

`COLLECT_ENABLED=false` 只关闭**后台自动采集**，**不能**用它保证手动「预览抓取」不访问外部服务。预览仍会发出抓取请求。

## 与生产启动检查的关系

api 和 worker 不带 `NODE_ENV=production` 时按开发环境运行：启动时不检查生产密钥和管理员密码，`DEV_AUTH_ROLE` 免登录也会生效。**开发时想免登录进后台**，在 `.env` 里设 `DEV_AUTH_ROLE=admin`（生产环境会拒绝启动）。

## Related

- 付费调用本身另有 [预算熔断](paid-request-receipts.md)，与开关是两件事：开关管「做不做」，熔断管「做多少」。
- 本地验收的命令见 [开发检查与测试](../topics/development-checks.md)。

## Sources

- [架构 · 几条不变的规则](../../docs/architecture.md#几条不变的规则)（`docs/architecture.md`）
- [部署 · 社区修复、时间规则与读取优化](../../docs/deploy.md)（`docs/deploy.md`）
