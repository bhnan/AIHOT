---
{"id":"material-identity","type":"concept","title":"材料身份：同一 URL 意味着什么","aliases":["identity_key","材料身份","URL 规范化","修订","revision","same-url"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"packages/backend/src/lib/url.ts","sha256":"0e0eb82affebb1d702fdc9cc46a51615cf366e1a0daac2348f14dfb239415a27","anchor":"normalizeUrl / identityKeyForUrl"},{"path":"packages/backend/src/content/materials.ts","sha256":"7e7f2e585ce975abe3a34f1bd66ba05a4eb3a2b9183c20b70cce9e3f67958e74","anchor":"upsertIn / reviseMaterial"}],"relations":[{"type":"related","target":"event-membership-rules"},{"type":"related","target":"old-content-freshness"},{"type":"related","target":"source-adapters"}]}
---

# 材料身份：同一 URL 意味着什么

## Meaning and boundaries

一条材料（一篇文章、一个帖子）在库里的身份是 **`identity_key`**，不是 URL 字符串。`articles.identity_key` 是 **UNIQUE**，而 `url` 只是一个普通列（只有非唯一索引）。所以"同一个 URL"这句话，准确说是「**同一个身份键**」。

身份键只有两种形式（`lib/url.ts` 的 `identityKeyForUrl`）：

| 形式 | 何时 |
|---|---|
| `x:<推文id>` | 地址是 X/Twitter 状态页 |
| `url:<规范化地址>` | 其余全部（可选再拼上 `#片段`，见下） |

## 规范化把"看起来不同、其实是同一篇"收成一个

`normalizeUrl()` 的注释就是定义：*lower-case host, no fragment, no tracking params, no trailing slash*。

| 规则 | 效果 |
|---|---|
| 丢掉 fragment（`#`） | `.../post#comments` ≡ `.../post` |
| 主机名小写 + 去掉 `www.` | `WWW.Example.com` ≡ `example.com` |
| 端口 80/443 清空、协议统一成 `https:` | `http://` 与 `https://` 同一个身份 |
| 丢掉跟踪参数（`utm_*`、`spm`、`from`、`ref`、`fbclid`、`gclid`、`mkt_tok`… 一长串白名单） | 分享链接 ≡ 直接链接 |
| 剩余查询参数**排序** | 参数顺序不同也算同一篇 |
| 去掉末尾斜杠（根路径除外） | `/post/` ≡ `/post` |
| **微信文章只保留 `__biz/mid/idx/sn`** | 公众号文章的一堆会话参数被剥光 |

X 的规则更激进：主机是 x/twitter（含 `www`/`mobile`/`m`）、路径形如 `/<user>/status(es)?/<数字id>` 就**只认推文 id**。于是 `x.com`/`twitter.com`/`mobile.`、`/status/`/`/statuses/`/`/i/status/`、带 `?s=20#thread` 全是同一个身份。

## 一个页面承载多个发生：`keepFragment`

`identityKeyForUrl(url, { keepFragment: true })` 正是为"一个地址下多个发生"准备的。源码注释举的例子是发布说明：

> `keepFragment` is for sources whose entries are sections of one page (release notes: `overview#september-24-2026`): without it **every section is the same article**.

信源侧对应 `preserveUrlFragment`；`web_list` 里章节型条目会把带 `#章节` 的完整地址存进 `url`，身份也带上片段。**没开这个选项时，一个更新日志页的所有章节会被当成同一篇文章。**

## 身份是全局的、跨信源的

`identity_key` 的 UNIQUE **不含 `source_id`**。同一个 URL 被第二个信源发现时：

- 不新建文章行，只写一条 `article_discoveries`；
- **连内容都不更新**——源码注释：*its title and summary are its own rendering, and taking them made the article **flip between the two sources' versions on every fetch**. **Only the article's own source revises it.***

这也解释了 `publisherUrlPrefixes` 为什么必须存在：聚合站先拿到官方文章 URL 时文章会记在它名下，之后要按前缀"改记到官方源名下"。

## 内容变了怎么办：修订，四道防抖

同一行、同一信源、内容变化才走修订。在真正修订之前有四道过滤（`materials.ts`）：

1. **`content_hash` 没变** → 什么都不做；
2. **这行是历史导入**（没有这种形式的 hash）→ 第一次只记基线，**不触发一次付费重跑**；
3. **这个版本以前出现过**（`article_revisions` 里有相同 hash）→ 不算新材料。注释举的例子是 listing 在两种渲染之间来回切、页面轮换促销——**防抖**，否则多版本轮换的页面会反复重跑；
4. **只差"传输中丢掉的字符"**（`sameBarringLoss`）→ 不算修改。

通过之后 `reviseMaterial()`：`revision + 1`、写 `article_revisions`、`groupingReset()`、`processing_state = 'new'`、清空重试计数——源码注释把这层意思写全了：

> everything decided on the old content starts over (**analysis and its retry count, grouping, the "adds value" check**).

已有公开投影会先撤回，并发出 `articleChanged(kind: "content", reduced)`。

## 推论：它能定什么、不能定什么

- ✅ **同 URL ⇒ 同一份发布物 ⇒ 同一个事实**。这不是"相似度很高所以推测相同"，而是**同一性**，所以不需要问模型。
- ❌ **不决定价值**。同一 URL 再来一次**不代表能进精选**：只有该事实已经在精选里（有代表席位可替换）时才放行；此前因"没有新增信息"被拒的，**沿用原结论**（见 [事件成员资格](event-membership-rules.md)）。
- ⚠️ **转载不吃这个短路**：A 社原发、B 社转载 URL 不同，走召回 + 模型判断。所以规范化规则（尤其跟踪参数白名单）直接决定"转载算一篇还是两篇"。

## Related

- 主张"同 URL 就归到同一事实"的那条兜底分支，它在整个判断链里的位置见 [事件成员资格与归组判定](event-membership-rules.md)。
- 时间与新旧判断见 [旧文不刷屏与发布时间的可信度](old-content-freshness.md)。

## Sources

- [lib/url.ts](../../packages/backend/src/lib/url.ts) — `normalizeUrl`、`tweetIdFromUrl`、`identityKeyForUrl`
- [content/materials.ts](../../packages/backend/src/content/materials.ts) — `upsertIn`、`reviseMaterial`
- 旁证（不记账）：`tests/url-identity.standalone.test.ts` 把 X 变体、伪造主机、非法 URL 都钉成了测试
