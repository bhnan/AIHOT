# 总览：这个项目的设计

**一句话**：AIHOT 是一个「自己找热点、自己写日报」的行业热点网站框架。把信源换成你的、把「什么算重要」换成你的行业 KnowHow，它就是你的行业热点站。当前 checkout 是上游开源框架本身（commit `6e67a9d`），站名还是示范的 `MyHOT`，行业是 AI。

## 三条主线设计

**一、引擎与行业知识分离。** 引擎在 `apps/` 和 `packages/`，而这个站是什么（站名、文案、模型选择、品牌）在 `site/`，「什么算这个行业的事、什么算噪声」（分类、主题、信源、提示词、门槛）在 `industry/`。改行业**几乎不用动代码**——提示词就是配置文件，版本是它内容的哈希。见 [站点包与行业包](entities/configuration-packages.md) 与 [提示词即配置](concepts/prompt-as-config.md)。

**二、一条资料的主线：采集 → 预筛 → 两次评分 → 结构化 → 写作 → 归组去重 → 成刊。** 每一步的边界都被特意划清：两次独立评分要过**按信源分级**的门槛，够分的还要等归组确认「不是精选里已有新闻的重复、且带来了新信息」才进精选；日报按规则编排**不调模型**，周报月报从日报汇编、模型只写总述和栏目导读。见 [六种信源读取器与采集调度](entities/source-adapters.md)、[事件归组、热度与事件页综述](entities/event-grouping-and-hotness.md)、[日报、周报、月报的成刊规则](entities/report-editions.md)。

**三、对外只有一个出口层。** 网页、RSS、API、MCP、站点地图、分享图读的都是 `packages/backend/src/publication/`；公开范围、精选席位和事实证据条件只在 `scope.ts` 定义。见 [一个公开读取层](concepts/one-public-read-layer.md) 与 [对外出口](entities/outbound-surfaces.md)。

## 运行时

三个进程：**api**（Fastify，所有接口与出口）、**worker**（pg-boss 队列与定时任务，模型只在这里被调用）、**web**（React Router SSR，只通过 HTTP 读 api）。后端没有构建步骤，Node.js 24 直接运行 TypeScript。见 [三个进程](entities/three-processes.md)。

## 几条反复出现的设计取向

| 取向 | 体现在哪 |
|---|---|
| **读者打开页面不触发模型调用** | 网页只读库里已有的结果；模型只在 worker 的任务里跑 |
| **花钱的请求先记回执** | 重启与重试复用已付费的结果；结果不明 30 分钟后自动放行一次，再次不明由管理员核对 |
| **安全阀只认小写 `true`，且只决定「发不发出去」** | `COLLECT_ENABLED`、`MODEL_CALLS_ENABLED`、飞书与 IndexNow 开关 |
| **旧文不刷屏** | 超过 48 小时、首次导入的存量、回灌推送按原文时间归档；没有可信发布时间的先不公开 |
| **事实必须来自材料** | 输入里的指令不执行；先抽事实再写文案；公司名不能凭空出现；报告导读里的名字数字不对就整段弃用 |
| **缓存不延长旧内容寿命** | 站点地图共用同一个截止时间；CDN 不得重新起算；MCP 用 `no-store` |
| **加兜底、开关、兼容旧格式要先有证据** | 真实部署发生过，或平台语义决定它会发生；停用一个功能就同一个改动删干净 |
| **边界由测试守住** | `tests/architecture.test.ts` 检查 web 只走 HTTP、packages 不依赖 apps、公开路由只走读取层 |

## 扩展方式

只属于你这个站的功能做成**模块**：一个功能一个 `modules/<名字>/` 文件夹，通过 `module.ts`、`server.ts`、`web.tsx` 三个插口接进框架，在 `site/modules/` 的三份清单里启用。**框架不导入任何模块，只读清单**——这样合并上游更新时不容易冲突；插口不够用就在框架里加通用插口，而不是把功能写进框架。见 [模块系统](entities/module-system.md)。

## 质量怎么保证

「选得准不准」不是靠感觉调的：用自己标注的 100–200 条样本跑 `scripts/eval-selection.ts`，看有效输出准确率、覆盖率、完整准确率和门槛扫描，在后台 SelectBench 里逐条看判错的理由，**先改标准再动门槛**。改归组提示词或综述提示词前，同样要并排评测。见 [精选标准的校准闭环](topics/selection-calibration.md) 与 [提示词与模型的评测工具链](topics/prompt-and-model-evaluation.md)。

## 从哪里开始读

- 想知道怎么改成自己的行业 → [改成你的行业：八步清单](topics/customize-to-another-industry.md)
- 想知道引擎怎么运作 → [三个进程](entities/three-processes.md) → [公开读取层](entities/publication-layer.md) → [对外出口](entities/outbound-surfaces.md)
- 想知道怎么加自己的功能 → [模块系统](entities/module-system.md)
- 想知道怎么上线和维护 → [部署、更新与备份](topics/deploy-update-backup.md)、[开发检查与测试](topics/development-checks.md)

完整目录见 [index.md](index.md)。
