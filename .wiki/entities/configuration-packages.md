---
{"id":"configuration-packages","type":"entity","title":"站点包 site/ 与行业包 industry/","aliases":["site/","industry/","配置包","行业包","站点包"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"目录"},{"path":"docs/customize.md","sha256":"4fe488f898c075201a304e7cdfa4aa9b0b402137756f06cd015f93ad890e3d3a","anchor":"1-站名和文案sitesitets"}],"relations":[{"type":"related","target":"module-system"},{"type":"related","target":"prompt-as-config"},{"type":"related","target":"customize-to-another-industry"},{"type":"related","target":"selection-calibration"}]}
---

# 站点包 site/ 与行业包 industry/

## Definition and role

框架把「引擎」和「这一个站是什么」分开：**改行业只动这两个文件夹，代码基本不用动**。站点身份和每一步的模型从 `site/` 读，行业分类和提示词从 `industry/` 读，代码里不写死某个站的值。

| 关注点 | 位置 |
|---|---|
| 站名、文案、出刊时间、使用规则页名与简介、分享图文案、告警说法、公开接口版本 | `site/site.ts` |
| 每一步默认用哪个模型（具名模型各用自己的地址与密钥环境变量） | `site/models.ts` |
| 图标与 Logo、报头字（`nameplates/`） | `site/brand/` |
| 使用规则与隐私说明正文（**模板**，上线前需改写） | `site/pages/` |
| 发布在网站根目录的四个固定文件：`robots.txt`、`manifest.webmanifest`、`openapi-v1.json`、可选 `.well-known/security.txt` | `site/public/` |
| 更新日志 | `site/changelog.json` |
| 启用哪些模块（`index.ts` 地址、`server.ts` 后端、`web.ts` 网页三份清单） | `site/modules/` |
| 分类、标签与主体公司 | `industry/taxonomy.ts` |
| 主题目录（`/topics`，三组：公司与机构、方向、内容形态） | `industry/topics.json` |
| 首次启动导入的示范信源 | `industry/sources.json` |
| 精选标准、写作要求、归组、综述、报告提示词 | `industry/prompts/` |
| 入选门槛 | `industry/selection.ts` |

## 站点地址不在文件里

域名用环境变量 `SITE_URL` 设置。RSS、分享链接、站点地图和 Agent Markdown 中的绝对链接都用它，不会随浏览器访问的地址自动改变。

## 几个「上线后不要再改」的字段

- `site.ts` 的 `mcpPrefix`（MCP 工具名前缀，改了别人接好的工具名就变了）与 `interfaceVersion`（公开接口版本，只升不降）。
- `taxonomy.ts` 里类别的 `key`（出现在 `/all?category=`、`/feed/category/<key>.xml`）与 `topics.json` 的 `slug`。
- `PUBLIC_CATEGORIES`：公开接口、RSS、MCP 里和网页不同的类别（`merge` 并类、`feedLabels` 换分类 RSS 标题名）。

## 公开接口与网页可以不同

`PUBLIC_CATEGORIES.merge` 让某一类在公开接口、RSS 和 MCP 里并进另一类发布，而网页上照样分开——这是「产品展示」和「机器消费」两套口径可以分开的唯一入口。

## 改完要重新构建

`topics.json` 在站点启动时读取，改完要重新构建才生效；提示词和门槛不需要（它们按内容哈希做版本）。详见 [改成你的行业](../topics/customize-to-another-industry.md)。

## Relationships

- `industry/prompts/` 的写法见 [提示词即配置](../concepts/prompt-as-config.md)。
- `industry/selection.ts` 的门槛需要用自己标注的样本重新校准，见 [精选标准的校准闭环](../topics/selection-calibration.md)。
- 启用模块的三份清单见 [模块系统](module-system.md)。

## Sources

- [架构 · 目录](../../docs/architecture.md#目录)（`docs/architecture.md`）
- [把它改成你的行业](../../docs/customize.md)（`docs/customize.md`）
