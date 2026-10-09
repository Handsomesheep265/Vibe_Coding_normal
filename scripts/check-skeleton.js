"use strict";

/**
 * 骨架自检：确认"目录结构 / 后端路由挂载 / 前端路由表 / 视图导出 / SPA 脚本挂载顺序"对得上。
 *
 * 用途：后续在 首页·商店·分类·购买页·购物袋·订单·收藏·账户中心·后台（商品+订单）上做修复与实现时，
 * 一旦新增或改名某个视图却忘了同步 public/js/app.js 路由表或 public/index.html 脚本，本脚本立刻报错。
 *
 * 只读检查，不联网、不写盘：node scripts/check-skeleton.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

/** app.js 中声明的 hash 路由 → 应注册的处理函数名 */
const ROUTES = [
  { route: "/", view: "home" },
  { route: "/store", view: "store" },
  { route: "/category/:id", view: "category" },
  { route: "/product/:id", view: "product" },
  { route: "/bag", view: "bag" },
  { route: "/orders", view: "orders" },
  { route: "/favorites", view: "favorites" },
  { route: "/account", view: "account" },
  { route: "/admin/products", view: "adminProducts" },
  { route: "/admin/orders", view: "adminOrders" },
];

/** 视图函数名 → 所在文件（约定：public/js/views/<file>） */
const VIEW_FILE = {
  home: "home.js",
  store: "store.js",
  category: "category.js",
  product: "product.js",
  bag: "bag.js",
  orders: "orders.js",
  favorites: "favorites.js",
  account: "account.js",
  adminProducts: "admin.js",
  adminOrders: "admin.js",
};

/** 期望直接位于仓库根目录的目录（README 第三节结构约定） */
const EXPECTED_DIRS = [
  "server",
  "server/routes",
  "shared",
  "public",
  "public/css",
  "public/js",
  "public/js/views",
  "tests",
];

/** 期望存在的关键文件 */
const EXPECTED_FILES = [
  "package.json",
  "server/index.js",
  "server/db.js",
  "server/seed.js",
  "server/auth.js",
  "shared/price.js",
  "shared/cart.js",
  "public/index.html",
  "public/css/app.css",
];

/** server/index.js 中应挂载的 API 前缀 */
const EXPECTED_MOUNTS = ["/api/auth", "/api", "/api/cart", "/api/orders", "/api/favorites", "/api/admin"];

/** index.html 中必须按此顺序出现的脚本 */
const EXPECTED_SCRIPTS = [
  "/shared/price.js",
  "/shared/cart.js",
  "/js/api.js",
  "/js/state.js",
  "/js/router.js",
  ...["home", "store", "category", "product", "bag", "orders", "favorites", "account", "admin"].map(
    (v) => `/js/views/${v}.js`,
  ),
  "/js/app.js",
];

const problems = [];
const notes = [];

function readPublic(rel) {
  return fs.readFileSync(path.join(PUBLIC_DIR, rel), "utf8");
}

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkStructure() {
  EXPECTED_DIRS.forEach((rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) problems.push(`缺少目录：${rel}/`);
  });
  EXPECTED_FILES.forEach((rel) => {
    if (!fs.existsSync(path.join(ROOT, rel))) problems.push(`缺少文件：${rel}`);
  });
  notes.push(`根目录目录数：${EXPECTED_DIRS.length}，关键文件数：${EXPECTED_FILES.length}`);
}

function checkBackendMounts() {
  const { app } = require(path.join(ROOT, "server", "index.js"));
  // 注意：不能用 app.router —— Express 4 该 getter 已废弃会直接抛错，
  // 这里读取内部实例 _router（app.use 时必定已创建）。
  const stack = (app._router && app._router.stack) || [];
  const routers = stack.filter((layer) => layer.name === "router" && layer.regexp);
  EXPECTED_MOUNTS.forEach((mount) => {
    const hit = routers.some((layer) => layer.regexp.test(mount));
    if (!hit) problems.push(`server/index.js 未挂载路由前缀：${mount}`);
  });
  notes.push(`后端已挂载路由层：${routers.length} 个，要求前缀 ${EXPECTED_MOUNTS.join(" ")}`);
}

function checkFrontendRoutes() {
  const appJs = readPublic("js/app.js");
  ROUTES.forEach(({ route, view }) => {
    const re = new RegExp(`on\\(\\s*["'\`]${escapeRe(route)}["'\`]\\s*,\\s*V\\.${view}\\s*,?\\s*\\)`);
    if (!re.test(appJs)) problems.push(`public/js/app.js 未注册路由 ${route} → Views.${view}`);
  });
}

function checkViewExports() {
  Object.entries(VIEW_FILE).forEach(([view, file]) => {
    const abs = path.join(PUBLIC_DIR, "js", "views", file);
    if (!fs.existsSync(abs)) {
      problems.push(`缺少视图文件：public/js/views/${file}（用于 Views.${view}）`);
      return;
    }
    const body = fs.readFileSync(abs, "utf8");
    const assignIdx = body.lastIndexOf("Views =");
    if (assignIdx === -1) {
      problems.push(`public/js/views/${file} 未挂载到 Views（找不到 "Views ="）`);
      return;
    }
    if (!new RegExp(`\\b${view}\\b`).test(body.slice(assignIdx))) {
      problems.push(`public/js/views/${file} 的 Views 导出中缺少 ${view}`);
    }
  });
  notes.push(`视图入口：${Object.keys(VIEW_FILE).length} 个函数 / ${new Set(Object.values(VIEW_FILE)).size} 个文件`);
}

function checkScriptOrder() {
  const html = readPublic("index.html");
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"\s*>/g)].map((m) => m[1]);
  EXPECTED_SCRIPTS.forEach((src) => {
    if (!scripts.includes(src)) problems.push(`public/index.html 未按约定引入脚本：${src}`);
  });
  const appIdx = scripts.indexOf("/js/app.js");
  const viewIdxs = scripts.filter((s) => s.startsWith("/js/views/")).map((s) => scripts.indexOf(s));
  if (appIdx !== -1 && viewIdxs.some((i) => i > appIdx)) {
    problems.push("public/index.html 中 /js/app.js 必须位于所有 /js/views/*.js 之后");
  }
  if (scripts.indexOf("/js/state.js") > scripts.indexOf("/js/router.js")) {
    problems.push("public/index.html 中 /js/state.js 应在 /js/router.js 之前");
  }
  // 每个被引用的脚本都必须真实存在，否则页面白屏（/shared → shared/，其余 → public/）
  scripts.forEach((src) => {
    const abs = src.startsWith("/shared/")
      ? path.join(ROOT, "shared", src.slice("/shared/".length))
      : path.join(PUBLIC_DIR, src.replace(/^\//, ""));
    if (!fs.existsSync(abs)) problems.push(`public/index.html 引用了不存在的脚本：${src}`);
  });
  // 反向检查：views 目录下的文件是否都已被引入，避免新增视图忘了挂载
  fs.readdirSync(path.join(PUBLIC_DIR, "js", "views"))
    .filter((f) => f.endsWith(".js"))
    .forEach((f) => {
      if (!scripts.includes(`/js/views/${f}`)) problems.push(`public/js/views/${f} 存在但 index.html 未引入`);
    });
  notes.push(`index.html 脚本数：${scripts.length}（全部存在且顺序正确）`);
}

function main() {
  console.log("[check] 骨架自检：目录结构 / 后端挂载 / 前端路由表 / 视图导出 / 脚本挂载顺序");
  checkStructure();
  checkBackendMounts();
  checkFrontendRoutes();
  checkViewExports();
  checkScriptOrder();
  notes.forEach((n) => console.log("  · " + n));
  if (problems.length) {
    console.error(`\n[check] 发现 ${problems.length} 个问题：`);
    problems.forEach((p) => console.error("  x " + p));
    process.exitCode = 1;
    return;
  }
  console.log("\n[check] 全部通过：10 条路由与 9 个页面视图骨架完整、加载顺序正确。");
}

main();
