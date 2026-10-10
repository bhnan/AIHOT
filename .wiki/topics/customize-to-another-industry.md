---
{"id":"customize-to-another-industry","type":"topic","title":"改成你的行业：八步清单","aliases":["换行业","定制","customize","新建站点"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/customize.md","sha256":"4fe488f898c075201a304e7cdfa4aa9b0b402137756f06cd015f93ad890e3d3a","anchor":"1-站名和文案sitesitets"},{"path":"docs/selection.md","sha256":"e51097149dec4fbb57d81a95d487df60ad5712ae9da26f2bb0903844c98d78b6","anchor":"门槛industryselectionts"}],"relations":[{"type":"depends_on","target":"configuration-packages"},{"type":"related","target":"selection-calibration"},{"type":"related","target":"source-onboarding"},{"type":"related","target":"development-checks"}]}
---

# 改成你的行业：八步清单

## Summary

这个仓库默认是一个「AI 行业」的示例站。要变成「法律热点」「HR 热点」「黄金热点」，**要改的东西几乎都在 `site/` 和 `industry/` 里，代码基本不用动**。下面是按顺序的八步。

用 Claude Code、Codex 这类 Agent 时，可以直接把仓库交给它并说：

```text
请读 AGENTS.md 和 docs/customize.md，把这个站改成「XX 行业」的热点站。
我关心的是：……（写你想盯的信源、你觉得什么消息重要、什么不重要，越具体越好）。
改完帮我跑 npm run typecheck、npm test 和 node scripts/smoke.ts，并告诉我还需要我自己决定哪些事。
```

## 1. 站名和文案：`site/site.ts`

`name`（站名，导航、标题、分享图、RSS、MCP、后台都用它）、`subject`（行业词，「AI 日报」变成「法律日报」）、`homeTitle`/`topicsTitle`/`description`/`tagline`/`keywords`、`locale`、`mcpPrefix`（**有人接入后不要再改**）、`interfaceVersion`（**只升不降**）、`crawlerName`（不要冒用别的站）、`EDITION_TIMES`（出刊时间，排程每半小时检查一次，写整点或半点）、`POLICY`、`ABOUT`、`CARDS`、`ITEM_COPY`、`REPORTS`、`ALERTS`、`SOURCE_DEFAULTS`、`COMMUNITY_FEEDS`、`ACCESS`、`ADMIN`、`AGENT`、`DEPLOYMENT`、`FEED_COPY`、`PUBLIC_CATEGORIES`。

站点地址不写在这里，部署时用环境变量 `SITE_URL`。

## 2. 分类、标签和主题：`industry/taxonomy.ts`、`industry/topics.json`

`CATEGORIES`（`key` 上线后不要改；`section` 决定日报周报月报的分节；`guide` 给模型看这一类收什么；`commentary: true` 标出评论类）、`RELEASE`（这个行业最受关注的那类发布，没有就设 `null`）、`PLAIN_TERMS`（周报月报总述里可直接写的行业通用词）、`CATEGORY_TAGS` / `TOPIC_TAGS` / `ENTITY_TAGS`、`TAG_SYNONYMS`、`ENTITIES`、`IDENTITY_LEXICON` / `PUBLISHER_DOMAINS` / `IDENTITY_CONTEXT_ALIASES`、`ITEM_TYPES`（和评分提示词的权重表对应，改了要一起改提示词）。

`topics.json` 是主题目录，分 `company`（用 `entityId`）、`field` 和 `genre`（用 `tags`）三组；`slug` 上线后不要改，改完要重新构建才生效。

## 3. 信源：`industry/sources.json`

这是**首次启动时导入**的示范信源：已存在的不会被覆盖，之后每次启动只补文件里有、库里还没有的；**从文件里删掉的不会从库里删**（不要的在后台暂停）。上线后更常用的是后台「信源」页。

## 4. 精选标准：`industry/prompts/`

**最值得花时间的一步**：你对这个行业的判断经验就写在这里。建议保留结构（五个维度加权、噪声压制规则、安全边界），只把「什么算重要」「什么算噪声」的例子换掉。详见 [提示词即配置](../concepts/prompt-as-config.md)。

## 5. 门槛与校准：`industry/selection.ts`

```ts
export const SELECTION = {
  thresholds: { T1: 60, T1_5: 65, T2: 76 },   // 两次评分的平均至少要到这个数
  understandFloor: 50,                        // 平均分高于它的未入选资料，也按入选的写法写
};
```

这组数是 AIHOT 在 AI 领域一直在用的门槛，**偏严**。换了行业和提示词必须重新校准——见 [精选标准的校准闭环](selection-calibration.md)。这一步决定你的站「选得准不准」。

## 6. 品牌：`site/brand/`

`logo.svg`、`icon.png`(512)、`icon-192.png`、`apple-icon.png`(180)、`favicon.ico`；`Logo.tsx`（网页左上角标志）；`wordmark.svg` / `wordmark-dark.svg`（分享图字标）；`nameplates/`（报头字，换了行业词后用 `node scripts/nameplates.ts package` 重新生成）；关于页二维码。

**请不要使用 AIHOT 的名字和 Logo。**

## 7. 页面文案：`site/pages/`、`site/public/`、`site/changelog.json`

- `pages/terms.md`、`pages/privacy.md`：**现在是模板**，上线前按实际情况改写，必要时请专业人士看。
- `public/`：`robots.txt`、`manifest.webmanifest`、`openapi-v1.json`、可选 `.well-known/security.txt`，替换占位符后发布。
- `changelog.json`：把自带那条「网站上线」的 `date`、`time`、`latestVersion` 改成你的上线时间。

## 8. 模型和部署

模型：`.env` 的 `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`（任何 OpenAI 兼容接口），`site/models.ts` 列具名模型与每一步默认用哪个。**用推理模型时要给推理留额度**（默认模型设 `LLM_REASONING_TOKENS`，具名模型写 `reasoningTokens`）——不留的话推理会把每一步的输出额度用光，答案为空、每次调用都失败。部署见 [部署、更新与备份](deploy-update-backup.md)。

## Explanation and evidence

改完以后的检查：

```bash
npm run typecheck
DATABASE_URL=postgres://…/myhot_test npm test     # 库名必须以 _test 或 _ci 结尾，账号要能建库
node scripts/smoke.ts --base http://localhost:3000   # 站点跑起来以后
```

**改写提示词、重新校准门槛不会让测试失败**：测试按每一步实际渲染出的提示词认请求，门槛从 `industry/selection.ts` 读。但 `tests/` 里有些测试用的是示例行业的分类、标签和公司（比如 `ai-models`、「模型发布」、Anthropic）——**改了 `industry/taxonomy.ts` 以后这些测试会失败，把例子换成你行业里的对应项即可，测的规则本身不用改**。

最后打开网站看首页、全部动态、日报、主题页和关于页，再去后台「信源」页确认信源都抓成功了。

## Related

- 配置项清单见 [站点包与行业包](../entities/configuration-packages.md)。
- 校准方法见 [精选标准的校准闭环](selection-calibration.md)。

## Sources

- [把它改成你的行业](../../docs/customize.md)（`docs/customize.md`）
- [精选与校准 · 门槛](../../docs/selection.md#门槛industryselectionts)（`docs/selection.md`）
