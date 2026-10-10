---
{"id":"module-system","type":"entity","title":"模块系统 modules/","aliases":["模块","插口","site/modules 清单","@aihot/<名字>"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"模块"},{"path":"docs/deploy.md","sha256":"10511424551f27f6a7cce34e4cf382e5f8b33d44774549edd68658387587f19f","anchor":"站点文件搬进-site"}],"relations":[{"type":"related","target":"configuration-packages"},{"type":"related","target":"three-processes"},{"type":"depends_on","target":"outbound-surfaces"}]}
---

# 模块系统 modules/

## Definition and role

框架里没有、只有你这个站要的功能（比如一个专门的榜单或监控页），做成**模块**：一个功能一个文件夹 `modules/<名字>/`，本身是一个名为 `@aihot/<名字>` 的 npm 包，装着它自己的后端、接口、页面、样式、数据库迁移和测试。

关键设计：**框架的代码不导入任何模块**，只读三份清单。因此合并本仓库以后的更新时，不容易和你自己的功能冲突。

`modules/` 目录在框架里是空的（本 checkout 只有 `tsconfig.json`），`site/modules/` 下的三份清单也都是空数组——框架本身不带模块。

## 模块自己的文件

| 文件 | 内容 |
|---|---|
| `module.ts` | 它的地址：页面、跳转、交给 api 处理的路径（类型见 `packages/contracts/src/modules.ts`） |
| `server.ts` | 它接进后端的插口：接口、定时任务、队列、事件回调、后台页面的数据等（类型见 `packages/backend/src/modules.ts`，每个插口注明读它的文件） |
| `web.tsx` | 它接进网页的插口：页面、导航项、主题页与后台的部件等（类型见 `apps/web/app/modules.ts`）；只在某一页出现的部件给出加载函数，随那一页的代码加载 |
| `migrations/` | 它自己的表，和 `database/migrations/` 一起按文件名排序执行 |
| `tests/` | 它的测试，`npm test` 一起跑 |
| 其他文件 | 它自己的图片等静态文件也放在模块文件夹里 |

## 启用步骤

1. 在 `site/modules/` 的三份清单里列上它：`index.ts` 列地址、`server.ts` 列后端、`web.ts` 列网页，没有的那份不列。
2. 在 `site/package.json` 的 `dependencies` 里写上它。
3. 用 Docker 部署的，在 `Dockerfile` 里照着其他包加一行 `COPY modules/<名字>/package.json modules/<名字>/`。

## 静态文件

模块自己的图片等静态文件：在 `server.ts` 的 `http` 插口里注册路由，用 `apps/api/src/routes/static.ts` 的 `sendFile` 发出（类型、ETag、缓存头和 404 都由它处理，**文件名自己校验**），地址写进 `module.ts` 的 `apiPaths`。

## MCP 工具

模块通过 `agent.abilities` 提供 MCP 工具。`scripts/mcp-check.ts` 始终检查完整工具集合；模块可在 `mcp.checkArgs` 中提供能在空数据库上成功的检查参数。未提供时，只有入参 schema 接受 `{}` 的工具会用 `{}` 实际调用；其余工具只检查发现，不猜参数。模块工具的业务行为由模块自己的测试验证。

## 边界原则

**插口不够用时，在框架里加一个通用的插口，而不是把这个功能写进框架**——这是模块机制能长期抵抗上游合并冲突的前提。

## Relationships

- 模块的地址与出口约定依赖 [对外出口](outbound-surfaces.md)。
- 启用清单属于 [站点包与行业包](configuration-packages.md) 里的 `site/`。
- 迁移遵循与引擎相同的约定，见 [开发检查与测试](../topics/development-checks.md)。

## Sources

- [架构 · 模块](../../docs/architecture.md#模块)（`docs/architecture.md`）
- [部署 · 站点文件搬进 site/](../../docs/deploy.md#站点文件搬进-site2026-年-10-月-4-日)（`docs/deploy.md`）
