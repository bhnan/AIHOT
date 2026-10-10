// 原型检查：静态检查 + 纯逻辑断言 + 对比度计算。
// 只检查"能自动检查的部分"；浏览器交互本机无法验证（无浏览器），脚本会明确报告这一点。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const dir = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(dir, "index.html"), "utf8");

const results = [];
const ok = (name, detail = "") => results.push({ pass: true, name, detail });
const bad = (name, detail = "") => results.push({ pass: false, name, detail });
const check = (name, cond, detail = "") => (cond ? ok(name, detail) : bad(name, detail));

/* ---------- 1. 静态：自包含，无网络引用 ---------- */
const networkPatterns = [
  [/https?:\/\//i, "绝对 URL"],
  [/<link\b/i, "<link>（外部样式/图标）"],
  [/<img\b/i, "<img>"],
  [/<iframe\b/i, "<iframe>"],
  [/\bfetch\s*\(/, "fetch()"],
  [/XMLHttpRequest/, "XMLHttpRequest"],
  [/\bimport\s*\(/, "动态 import()"],
  [/@import/, "CSS @import"],
  [/\bsrc\s*=/, "src= 属性"],
];
const hits = networkPatterns.filter(([re]) => re.test(html)).map(([, label]) => label);
check("自包含：没有网络引用 / 远程资源", hits.length === 0, hits.length ? `发现：${hits.join("、")}` : "9 类模式均未命中");

check("声明了中文语言与视口", /<html lang="zh-CN">/.test(html) && /name="viewport"/.test(html));
check("显式标注了合成数据与示意性质", /合成数据/.test(html) && /简化示意/.test(html) && /未经浏览器验证/.test(html));

/* ---------- 2. 语法：整段脚本可编译 ---------- */
const scriptMatch = /<script>([\s\S]*?)<\/script>/.exec(html);
check("找到内联脚本", !!scriptMatch);
let scriptCompiles = false;
if (scriptMatch) {
  try { new vm.Script(scriptMatch[1], { filename: "index.html#script" }); scriptCompiles = true; } catch (e) { bad("脚本语法", String(e.message)); }
  if (scriptCompiles) ok("脚本语法可编译（含渲染代码）");
}

/* ---------- 3. 逻辑：抽出 sim 区域并在沙箱里断言 ---------- */
const region = /\/\/ #region sim([\s\S]*?)\/\/ #endregion sim/.exec(html);
check("找到可测试的 sim 区域标记", !!region);

let api = null;
if (region) {
  const ctx = vm.createContext({});
  try {
    new vm.Script(region[1] + "\n;globalThis.__api = { inWindow, simulate, candidatesFor, judge, NODES, SCENARIOS, TOP_N, SIM_BAR, REVIEW_BELOW, VECTOR_CACHE };", { filename: "sim" }).runInContext(ctx);
    api = ctx.__api;
    ok("sim 区域可在无 DOM 环境求值（渲染代码与逻辑已分离）");
  } catch (e) { bad("sim 区域求值", String(e.message)); }
}

const ids = (r) => r.cands.map((c) => c.id).join(",");
const rel = (r, id) => (r.cands.find((c) => c.id === id) || {}).relation;

if (api) {
  const { inWindow, simulate, NODES, TOP_N, SIM_BAR } = api;
  const base = { perDay: 300, strictSpan: false };

  // 3.1 窗口边界（与 SQL 的 > now() - interval N days 一致）
  check("边界：窗口恰好 N 天 → 不在窗口内", inWindow(14, 14) === false);
  check("边界：N-0.1 天 → 在窗口内", inWindow(13.9, 14) === true);
  check("边界：N+1 天 → 不在窗口内", inWindow(15, 14) === false);

  // 3.2 默认（14 天 / 发布场景）：预告→发布 = 接回，且要复核
  const launch14 = simulate({ ...base, windowDays: 14, scenarioKey: "launch" });
  check("launch@14：候选只有 E5", ids(launch14) === "E5", `实际 ${ids(launch14) || "（空）"}`);
  check("launch@14：判定 SAME_STORY 并接回原事件", rel(launch14, "E5") === "SAME_STORY" && launch14.landing.kind === "attach");
  check("launch@14：相似度 0.79 < 0.85 → 触发一次复核", launch14.cost.reviews === 1 && launch14.cost.modelCalls === 2,
    `复核 ${launch14.cost.reviews} 次 / 调用 ${launch14.cost.modelCalls} 次`);

  // 3.3 断线：14 天下"诉讼和解"找不到 150 天前的诉讼
  const settle14 = simulate({ ...base, windowDays: 14, scenarioKey: "settle" });
  check("settle@14：候选为空（模型看不到 E2）", settle14.cands.length === 0, `实际 ${ids(settle14) || "（空）"}`);
  check("settle@14：结果是新建事件（断线）", settle14.landing.kind === "new-event");
  check("settle@14：无候选 → 不产生模型调用", settle14.cost.modelCalls === 0);

  // 3.4 放宽到 180 天：诉讼被找回
  const settle180 = simulate({ ...base, windowDays: 180, scenarioKey: "settle" });
  check("settle@180：E2 进入候选并被判 SAME_STORY", rel(settle180, "E2") === "SAME_STORY" && settle180.landing.kind === "attach");
  check("settle@180：只多花 1 次调用（0.88 ≥ 0.85，无需复核）", settle180.cost.modelCalls === 1);

  // 3.5 放宽的代价：旧闻挤进候选
  const launch365 = simulate({ ...base, windowDays: 365, scenarioKey: "launch" });
  check("launch@365：旧的同产品发布 E1/E3 也进了候选（占位）",
    launch365.cands.some((c) => c.id === "E1") && launch365.cands.some((c) => c.id === "E3"), `候选 ${ids(launch365)}`);
  check("launch@365：E1/E3 判 UNRELATED（不同版本的发布）", rel(launch365, "E1") === "UNRELATED" && rel(launch365, "E3") === "UNRELATED");
  check("launch@365：仍能接回 E5", launch365.landing.kind === "attach" && launch365.match.id === "E5");
  check("launch@365：多余复核来自低相似度的旧文 E0", launch365.cost.reviews === 2 && launch365.cost.modelCalls === 3,
    `复核 ${launch365.cost.reviews} 次 / 调用 ${launch365.cost.modelCalls} 次`);

  // 3.6 配套口径：省下多余复核，且不误伤同一案件
  const launch365strict = simulate({ ...base, windowDays: 365, scenarioKey: "launch", strictSpan: true });
  check("口径开启后：launch@365 的复核减少", launch365strict.cost.reviews === 1 && launch365strict.cost.modelCalls === 2,
    `复核 ${launch365strict.cost.reviews} 次 / 调用 ${launch365strict.cost.modelCalls} 次`);
  check("口径开启后：超过跨度的旧文被标为跳过复核",
    (launch365strict.cands.find((c) => c.id === "E1") || {}).skippedReview === true);
  const settle180strict = simulate({ ...base, windowDays: 180, scenarioKey: "settle", strictSpan: true });
  check("口径开启后：同一案件的持续披露不受跨度限制（仍接回 E2）",
    settle180strict.landing.kind === "attach" && settle180strict.match.id === "E2");

  // 3.7 撞墙线随窗口移动
  const wall = (windowDays) => simulate({ ...base, windowDays, scenarioKey: "launch" }).cost;
  check("撞墙线：日均 300 × 14 天 = 4,200 条（安全）", wall(14).poolSize === 4200 && wall(14).wallState === "ok");
  check("撞墙线：日均 300 × 180 天 = 54,000 条（超限）", wall(180).poolSize === 54000 && wall(180).wallState === "over",
    `${wall(180).poolSize} / ${wall(180).wallState}`);

  // 3.8 上限与门槛的常量与代码一致
  check("常量：TOP_N=10（RECALL_TOP_FACTS）", TOP_N === 10);
  check("常量：SIM_BAR=0.6（RECALL_MIN_COSINE）", SIM_BAR === 0.6);
  check("节点数 ≤ 上限，演示不会因截断失真", NODES.length <= TOP_N, `${NODES.length} 个节点`);

  // 3.9 极端输入不崩
  let extreme = "ok";
  try {
    simulate({ perDay: 1, windowDays: 7, scenarioKey: "settle", strictSpan: false });
    simulate({ perDay: 5000, windowDays: 365, scenarioKey: "launch", strictSpan: true });
  } catch (e) { extreme = String(e.message); }
  check("极端输入（窗口 7 / 365，日均 1 / 5000）不抛错", extreme === "ok", extreme);
}

/* ---------- 4. 可访问性（静态可查部分） ---------- */
const controls = [...html.matchAll(/<(input|button)\b[^>]*>/g)].map((m) => m[0]);
const labelBlocks = [...html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)].map((m) => m[1]);
const wrappedByLabel = (tag) => labelBlocks.some((block) => block.includes(tag));
const labelledByFor = (tag) => {
  const id = /id="([^"]+)"/.exec(tag)?.[1];
  return !!id && new RegExp(`for="${id}"`).test(html);
};
const inputTags = controls.filter((tag) => tag.startsWith("<input"));
const unlabelled = inputTags.filter((tag) => !wrappedByLabel(tag) && !labelledByFor(tag));
const radioCount = inputTags.filter((tag) => /type="radio"/.test(tag)).length;
const radiosWrapped = inputTags.filter((tag) => /type="radio"/.test(tag) && wrappedByLabel(tag)).length;
check("每个 input 都有可访问名称（label for= 或 label 包裹）", unlabelled.length === 0,
  unlabelled.length ? `缺标签：${unlabelled.join(" ")}` : `${inputTags.length} 个 input 已检查`);
// 按钮的可访问名称来自其文字内容
const emptyButtons = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)]
  .filter((m) => m[1].replace(/<[^>]+>/g, "").trim() === "").length;
check("每个 button 都有文字作为可访问名称", emptyButtons === 0, `${emptyButtons} 个空按钮`);
check("所有 radio 都被 label 包裹", radiosWrapped === radioCount, `${radiosWrapped}/${radioCount}`);
check("结果区用 aria-live 播报", /aria-live="polite"/.test(html));
check("有可见焦点样式 :focus-visible", /:focus-visible/.test(html));
check("时间轴对读屏有替代说明", /role="img"[^>]*aria-label=/.test(html));
check("有一键重置（reset/back 行为）", /id="reset"/.test(html) && /\$\("reset"\)/.test(html));

/* ---------- 5. 对比度（浅色主题，WCAG 相对亮度） ---------- */
const rootBlock = /:root\{([\s\S]*?)\}/.exec(html)[1];
const expand = (hex) => (hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex);
const token = (name) => {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\\b`, "i").exec(rootBlock);
  return m ? expand(m[1]) : null;
};
for (const name of ["ink", "ink-2", "ink-3", "bg", "card", "teal", "teal-bg", "amber", "amber-bg", "red", "red-bg"]) {
  check(`浅色主题变量 --${name} 可解析`, token(name) !== null, token(name) ?? "未找到");
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const lum = (hex) => rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const pairs = [
  ["ink / bg（正文）", "ink", "bg", 4.5],
  ["ink-2 / card（次要文字 13–15px）", "ink-2", "card", 4.5],
  ["ink-3 / bg（脚注、空态 12.5–13.5px）", "ink-3", "bg", 4.5],
  ["ink-3 / card（卡片内空态）", "ink-3", "card", 4.5],
  ["teal / teal-bg（判定、标签）", "teal", "teal-bg", 4.5],
  ["amber / amber-bg（原型徽标 12px）", "amber", "amber-bg", 4.5],
  ["red / red-bg（断线结论）", "red", "red-bg", 4.5],
];
const contrastLines = [];
for (const [label, fg, bg, min] of pairs) {
  const r = ratio(token(fg), token(bg));
  contrastLines.push(`浅色 ${label} ${r.toFixed(2)}:1`);
  check(`对比度 ≥ ${min}:1 — 浅色 ${label}`, r >= min, `${r.toFixed(2)}:1`);
}
// 深色主题（prefers-color-scheme: dark）用同一套检查
const darkBlock = /@media \(prefers-color-scheme: dark\)\{\s*:root\{([\s\S]*?)\}/.exec(html)?.[1] ?? "";
const darkToken = (name) => {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\\b`, "i").exec(darkBlock);
  return m ? expand(m[1]) : null;
};
check("深色主题变量可解析", ["ink", "ink-2", "ink-3", "bg", "card", "teal", "teal-bg", "amber", "amber-bg", "red", "red-bg"].every((n) => darkToken(n)));
for (const [label, fg, bg, min] of pairs) {
  if (!darkToken(fg) || !darkToken(bg)) continue;
  const r = ratio(darkToken(fg), darkToken(bg));
  contrastLines.push(`深色 ${label} ${r.toFixed(2)}:1`);
  check(`对比度 ≥ ${min}:1 — 深色 ${label}`, r >= min, `${r.toFixed(2)}:1`);
}

/* ---------- 6. 版面几何（静态推算，替代肉眼看图） ---------- */
if (api) {
  const MAXAGE = 365;
  const pos = (age) => Math.max(2, Math.min(98, (1 - age / MAXAGE) * 100));
  const rows = new Map();
  api.NODES.forEach((n, i) => {
    const row = i % 3;
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push({ id: n.id, pct: pos(n.age) });
  });
  // 窄屏参照宽度：手机 360px 视口 − 40px 页边 − 36px 卡片内边距 ≈ 284px
  const NARROW = 284, NODE = 34;
  let minGap = Infinity, worst = "";
  for (const [row, list] of rows) {
    list.sort((a, b) => a.pct - b.pct);
    for (let i = 1; i < list.length; i++) {
      const gapPx = ((list[i].pct - list[i - 1].pct) / 100) * NARROW;
      if (gapPx < minGap) { minGap = gapPx; worst = `第 ${row} 行 ${list[i - 1].id}↔${list[i].id}`; }
    }
  }
  check(`同一行的节点在窄屏（${NARROW}px）不重叠`, minGap >= NODE,
    `最小间距 ${minGap.toFixed(1)}px（${worst}），节点宽 ${NODE}px`);
  const maxTop = Math.max(...api.NODES.map((_, i) => 34 + (i % 3) * 30)) + NODE;
  check("节点纵向不超出时间轴（高 132px）", maxTop <= 132, `最低边缘 ${maxTop}px`);
  const allPct = api.NODES.map((n) => pos(n.age));
  check("所有节点水平位置都在 2%–98% 内", allPct.every((p) => p >= 2 && p <= 98),
    `${Math.min(...allPct).toFixed(1)}% – ${Math.max(...allPct).toFixed(1)}%`);
  check("最窄窗口（7 天）时色带标签会改到左侧展开",
    /bandLeft > 65/.test(html) && /right:100%/.test(html));
}

/* ---------- 输出 ---------- */
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  — ${r.detail}` : ""}`);
console.log("\n对比度实测：\n  " + contrastLines.join("\n  "));
console.log(`\n合计 ${results.length} 项：通过 ${results.length - failed.length}，失败 ${failed.length}`);
console.log("未验证：真实浏览器中的点击/拖动/焦点行为、窄屏换行、读屏实际播报（本机无浏览器）。");
process.exitCode = failed.length ? 1 : 0;
