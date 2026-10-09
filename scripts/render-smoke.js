"use strict";

/**
 * 一次性渲染冒烟：在 Node 里用最小 DOM mock 驱动真实前端模块（router + views + api），
 * 逐个渲染 10 条路由，确认视图函数能跑通、返回非空 HTML、且不抛异常。
 *
 * 用法（需先 npm start 或让脚本自行启动）：node scripts/render-smoke.js
 * 说明：这是开发期辅助脚本，不属于 tests/ 下既有测试，也不被 npm test 收集。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:3000";

// ---- 最小 DOM / 浏览器环境 mock ----
const elements = new Map();
function makeEl(id) {
  return {
    id,
    innerHTML: "",
    textContent: "",
    value: "",
    hidden: false,
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute() {},
    removeAttribute() {},
    getAttribute() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
}
const appEl = makeEl("app");
elements.set("app", appEl);

const documentMock = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeEl(id));
    return elements.get(id);
  },
  querySelectorAll() {
    return [];
  },
  addEventListener() {},
  createElement: () => makeEl("tmp"),
};

const win = {
  document: documentMock,
  location: { hash: "#/", href: BASE },
  localStorage: {
    _d: {},
    getItem(k) {
      return this._d[k] === undefined ? null : this._d[k];
    },
    setItem(k, v) {
      this._d[k] = String(v);
    },
    removeItem(k) {
      delete this._d[k];
    },
  },
  addEventListener() {},
  setTimeout,
  clearTimeout,
  console,
  // 让前端 fetch 打到真实服务
  fetch: (url, opts) => fetch(new URL(url, BASE).toString(), opts),
  URL,
};
win.window = win;

function load(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
  new Function("window", "document", "localStorage", "fetch", "self", code)(win, documentMock, win.localStorage, win.fetch, win);
}

// shared/ 用 UMD，Node 分支会走 module.exports；这里手动挂到 window 上模拟浏览器
const priceUtils = require(path.join(ROOT, "shared", "price.js"));
const cartUtils = require(path.join(ROOT, "shared", "cart.js"));
win.PriceUtils = priceUtils;
win.CartUtils = cartUtils;

["api.js", "state.js", "router.js", "views/home.js", "views/store.js", "views/category.js", "views/product.js", "views/bag.js", "views/orders.js", "views/favorites.js", "views/account.js", "views/admin.js"].forEach(
  (f) => load(path.join("public", "js", f)),
);

async function main() {
  // 以 3001 登录（视图里 requireLogin 依赖 Store.state.user）
  const login = await win.Api.login({ account: "3001", password: "123456" });
  win.Api.setToken(login.token);
  await win.Store.refreshUser();

  const routes = [
    ["/", "home"],
    ["/store", "store"],
    ["/category/1", "category"],
    ["/product/1", "product"],
    ["/bag", "bag"],
    ["/orders", "orders"],
    ["/favorites", "favorites"],
    ["/account", "account"],
  ];

  let failures = 0;
  for (const [route] of routes) {
    const view = win.Views[route === "/" ? "home" : route.split("/")[1]];
    try {
      const html = await view(route.startsWith("/category") || route.startsWith("/product") ? { id: "1" } : {});
      const ok = typeof html === "string" && html.trim().length > 0 && !html.includes("error-box");
      console.log(`${ok ? "PASS" : "FAIL"}  ${route.padEnd(12)} ${view ? view.name : "?"}()  ${String(html).length} chars`);
      if (!ok) {
        failures++;
        console.log("      → " + String(html).slice(0, 200).replace(/\s+/g, " "));
      }
    } catch (err) {
      failures++;
      console.log(`FAIL  ${route.padEnd(12)} 抛出异常: ${err.message}`);
    }
  }

  // 后台路由需要 admin
  const adminLogin = await win.Api.login({ account: "admin", password: "admin123" });
  win.Api.setToken(adminLogin.token);
  await win.Store.refreshUser();
  for (const [name, fn] of [["adminProducts", win.Views.adminProducts], ["adminOrders", win.Views.adminOrders]]) {
    try {
      const html = await fn({});
      const ok = typeof html === "string" && html.trim().length > 0 && !html.includes("error-box");
      console.log(`${ok ? "PASS" : "FAIL"}  /admin       ${name}()  ${String(html).length} chars`);
      if (!ok) failures++;
    } catch (err) {
      failures++;
      console.log(`FAIL  /admin       ${name}() 抛出异常: ${err.message}`);
    }
  }

  console.log(failures === 0 ? "\n[smoke] 10 个视图全部渲染成功（无异常、无错误框）" : `\n[smoke] ${failures} 个视图渲染失败`);
  process.exitCode = failures ? 1 : 0;
}

main()
  .catch((err) => {
    console.error("[smoke] 运行失败：" + err.message);
    process.exitCode = 1;
  })
  .finally(() => {
    // 恢复种子数据，保证每次冒烟从同一状态出发（等价于 npm run seed）
    try {
      require(path.join(ROOT, "server", "db.js")).reset();
      console.log("[smoke] 已重置 data/db.json 为种子数据");
    } catch (err) {
      console.error("[smoke] 重置数据失败：" + err.message);
    }
  });
