---
{"id":"cache-lifetime","type":"concept","title":"缓存不延长旧内容的寿命","aliases":["缓存","Cache-Control","重新验证","no-store","站点地图缓存"],"status":"implemented","freshness":"fresh","verified_at":"2026-10-08","sources":[{"path":"docs/architecture.md","sha256":"23d4792873b895c04db673c1d3221897b0d1748b25abec7d4852fc6f17617a94","anchor":"几条不变的规则"},{"path":"docs/deploy.md","sha256":"10511424551f27f6a7cce34e4cf382e5f8b33d44774549edd68658387587f19f","anchor":"配域名和-https"}],"relations":[{"type":"related","target":"one-public-read-layer"},{"type":"related","target":"outbound-surfaces"},{"type":"related","target":"deploy-update-backup"}]}
---

# 缓存不延长旧内容的寿命

## Meaning and boundaries

**可变内容按响应的 `Cache-Control` 到期重新验证，不能因为经过缓存就活得更久。** 这条规则约束的是自建反向代理和 CDN 的行为，也是站点自己实现缓存时的约束。

对一条已经撤回或已更新的内容，缓存是最后一道会「继续说旧话」的关卡，所以规则写得很具体。

## 站点自己怎么实现

- **站点地图**：进程、磁盘副本与 HTTP 响应**共用同一个截止时间**，不能在发送时重新计时。过期且无法重建时返回 `503` 和 `Retry-After`，**不再无限沿用旧文件**。
- **MCP**：HTTP 响应使用 `no-store`。
- **API 和 Agent 内容**：到期后重新验证（`If-None-Match` 能拿到 304）。
- **同样的数据每次给出同样的字节**：排序遇到并列时补上唯一的次序，避免 ETag 无故变化（否则每次请求都像变了，缓存失效）。

## 对部署的要求

前面有 Nginx、CDN 这类缓存时，要遵循应用返回的缓存期限。**这几类路径不要另加更长的缓存期，不要在到期后离线返回旧内容，也不要在转发旧响应时重新起算它的寿命**：

公开网页、导航数据、API、RSS、条目 Markdown、报告分享图、站点地图，以及接入说明 `/api/v1/agent` 和 `/openapi-v1.json`（五分钟到期后也要重新验证）。

不要让代理和 CDN 叠加缓存动态内容。**框架不代管自建站的 CDN，也不替它清缓存**——升级时要自己清理这些路径已有的代理和 CDN 缓存。

## 客户端侧

保留报告副本的客户端应在 `Cache-Control` 到期后带 `If-None-Match` 重新请求；往期报告的内容口径见 [日报、周报、月报的成刊规则](../entities/report-editions.md)。

## Related

- 出口清单见 [对外出口](../entities/outbound-surfaces.md)。
- 公开范围的判定见 [一个公开读取层](one-public-read-layer.md)。

## Sources

- [架构 · 几条不变的规则](../../docs/architecture.md#几条不变的规则)（`docs/architecture.md`）
- [部署 · 配域名和 HTTPS](../../docs/deploy.md#配域名和-https)（`docs/deploy.md`）
