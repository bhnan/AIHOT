---
{"id":"source-onboarding","type":"topic","title":"信源接入与试抓","aliases":["接入信源","试抓","预览抓取","外部推送","本地示例"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/sources.md","sha256":"fa02c4908f3a19f4af33444cb6488e490fb796ee6b74d1bfff69295d21b984d4","anchor":"本地跑通-htmljson-示例"},{"path":"docs/customize.md","sha256":"4fe488f898c075201a304e7cdfa4aa9b0b402137756f06cd015f93ad890e3d3a","anchor":"3-信源industrysourcesjson"},{"path":"docs/examples/sources/news.html","sha256":"c62aacc6fabeb2f3526b161493228196333d3651f2b89adcfa943b5b9e4ad598"},{"path":"docs/examples/sources/news.json","sha256":"dbc6a00c1fcc17d9966f759c61b8f08ed3a4a36dbc6c05ac03c8b2da0417ecbe"}],"relations":[{"type":"related","target":"source-adapters"},{"type":"related","target":"old-content-freshness"},{"type":"related","target":"admin-console"}]}
---

# 信源接入与试抓

## Summary

接入一个信源的标准动作是：**先在后台预览，确认抓到的是文章而不是导航、日期与原文一致，再创建**。预览和正式采集套用同一组过滤，所以预览里看到的条目就是正式采集会存下的。

## 操作顺序

1. 进 `/admin/sources/new`，填 ID、名称，**先选类型**（切换类型会重置配置），再把该类型的配置对象粘进「采集配置（JSON）」——这里填的是配置对象本身，**不要包上 `kind` 或 `config`**。
2. 点「预览抓取」（`rss`、`web_list`、`json_list`、`x_search` 支持）：显示条目总数和前 20 条的标题、原文链接、发布时间、摘要，**不把条目存入文章库**。
3. 确认无误后点「创建」。

## 预览的边界

- 预览套用与正式采集相同的过滤：地址前缀、分类、噪声词、地址改写、`publishedAfter`。
- 但**不等于完成生产采集**：不经过后续详情补齐、精选和公开发布流程。
- **预览仍会发出抓取请求**；X 和 Jina 预览也可能产生费用（经过付费回执和预算）。`COLLECT_ENABLED=false` 只关后台自动采集，不能保证预览不访问外部服务。
- `mp_account` 和 `external` **不支持**「预览抓取」；`external` 按推送接口接入。

## 读者看到的名字

名称里全角括号中的备注（比如「某媒体（热点 RSS）」）**只给后台看**：读者在网页、RSS、Agent Markdown、MCP 和搜索里看到的是去掉备注的名字。X 账号写成 `X：显示名 (@handle)` 的，读者只看到显示名。公开 API 的 JSON 里仍是完整的名字。

## 本地跑通 HTML/JSON 示例（不需要任何 API key）

仓库提供两份虚构示例 `docs/examples/sources/news.html` 和 `news.json`，各两条新闻，用来核对选择器和字段映射。在仓库根目录起一个只监听本机的小服务：

```bash
node --input-type=module -e '
import http from "node:http";
import { readFileSync } from "node:fs";
const files = {
  "/news.html": ["text/html; charset=utf-8", readFileSync("docs/examples/sources/news.html")],
  "/news.json": ["application/json", readFileSync("docs/examples/sources/news.json")]
};
http.createServer((req, res) => {
  const file = files[req.url];
  res.writeHead(file ? 200 : 404, { "content-type": file ? file[0] : "text/plain" });
  res.end(file ? file[1] : "Not found");
}).listen(8787, "127.0.0.1");'
```

再起 `npm run dev:api` 和 `npm run dev:web`（保持采集、模型、飞书和 IndexNow 开关关闭，**不启动 worker**）。仅为这次本机示例，在开发 API 进程设置 `ALLOW_PRIVATE_NETWORK_FETCH=true` 后重启——**默认禁止抓内网地址，生产环境拒绝启用此项，验证后移除**。

分别选 `web_list`、`json_list` 粘贴配置并预览，两次都应显示 **2 条**：

```json
{
  "url": "http://127.0.0.1:8787/news.html",
  "parseMode": "html",
  "itemSelector": ".news-list > .news-item",
  "linkSelector": "h2 a",
  "titleSelector": "h2 a",
  "publishedAtSelector": "time",
  "allowUrlPrefixes": ["http://127.0.0.1:8787/posts/"]
}
```

```json
{
  "url": "http://127.0.0.1:8787/news.json",
  "mode": "json_api",
  "itemsPath": "data.items",
  "titlePaths": ["title"],
  "urlTemplate": "http://127.0.0.1:8787/posts/{id}",
  "summaryPaths": ["summary"],
  "publishedAtPath": "published_at",
  "externalIdPath": "id"
}
```

| 标题 | 原文链接 | 预览 API 的 publishedAt |
|---|---|---|
| 第一条示例新闻 | `http://127.0.0.1:8787/posts/first` | `2026-10-01T01:00:00.000Z` |
| 第二条示例新闻 | `http://127.0.0.1:8787/posts/second` | `2026-10-01T02:00:00.000Z` |

把 HTML 的 `itemSelector` 暂改成 `.news-list` 对照：只会返回第一条——这就是「列表容器」和「每条新闻」的区别。

如果 API 在容器或另一台服务器上，`127.0.0.1` 指向它自己，上面的地址不能直接用于该部署。

## 抓不到时先查什么

**优先在原始 HTTP 响应里找新闻节点**。普通 HTML 模式**不执行 JavaScript**：浏览器里看得到、响应里没有的内容，不能靠换一个 CSS 选择器生成。

`no items matched (html)` 还可能是选择器不匹配、没有 `href` 或标题、链接被前缀规则过滤；先核对响应与配置，不必先更换采集器。优先找 RSS 或 JSON 接口，或按需配置 Jina / 自己维护的外部采集。

## 外部推送

自己的脚本抓的内容可以推进站里，走和普通采集一样的判重、精选和归组：

```
POST /api/ingest/items
Authorization: Bearer <INGEST_TOKEN>
Content-Type: application/json

{
  "sourceId": "my-crawler",
  "sourceName": "我的抓取脚本",
  "items": [
    { "title": "必填", "url": "必填", "publishedAt": "2026-10-01T08:00:00+08:00", "author": "可选" }
  ]
}
```

- `INGEST_TOKEN` 至少 16 位；不设置时接口一律返回 401。
- 每次最多 50 条，超过返回 413；限流由 `INGEST_RATE_LIMIT` 决定（Docker 默认 10，超过返回 429 带 `Retry-After: 60`；不用 Docker 时默认不限，设 0 表示不限）。
- 返回 `{"ok": true, "created": <新建条数>}`。不是 JSON 对象的条目、缺标题或网址的条目会被跳过，同一请求里重复的网址只取第一条。
- `sourceId` 不存在时**自动建一个 `external` 信源，默认不进公开页面**：到后台把参与方式改成 `editorial` 才会出现在站上。
- **后台暂停信源后推送返回 409**；恢复后可继续推送。
- 条目的 `raw._aihot.backfill` 为 `true` 时按历史回灌处理（不进「今天」、不推送）。

## Related

- 六种信源的配置细节见 [六种信源读取器与采集调度](../entities/source-adapters.md)。
- 存量条目与旧文归档见 [旧文不刷屏与发布时间的可信度](../concepts/old-content-freshness.md)。
- 首次导入的示范信源文件是 `industry/sources.json`，见 [改成你的行业](customize-to-another-industry.md)。

## Sources

- [信源 · 本地跑通 HTML/JSON 示例](../../docs/sources.md#本地跑通-htmljson-示例)（`docs/sources.md`）
- [把它改成你的行业 · 信源](../../docs/customize.md#3-信源industrysourcesjson)（`docs/customize.md`）
- 两份示例 fixture：[news.html](../../docs/examples/sources/news.html)、[news.json](../../docs/examples/sources/news.json)（`docs/examples/sources/`）
