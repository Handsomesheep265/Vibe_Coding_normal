"use strict";

/**
 * 页面层验收（T1）：用最小 DOM mock 渲染真实购物袋视图，检查渲染出的"总计"。
 * 需要服务已启动：npm start
 * 用法：node scripts/verify-t1-page.js
 *
 * 注意：shared/price.js 与 shared/cart.js 用 UMD 包装，靠 `typeof module` 判断环境。
 * 普通 `new Function` 会让 Node 的 module 泄漏进去、从而走 CommonJS 分支、不挂 window；
 * 因此这里显式把 module / exports 遮蔽为 undefined，还原真实浏览器的加载方式。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:3000";

const els = new Map();
const mk = (id) => ({
  id,
  innerHTML: "",
  textContent: "",
  value: "",
  hidden: false,
  classList: { toggle() {}, add() {}, remove() {} },
  setAttribute() {},
  removeAttribute() {},
  getAttribute: () => null,
  querySelectorAll: () => [],
});
els.set("app", mk("app"));

const doc = {
  getElementById(id) {
    if (!els.has(id)) els.set(id, mk(id));
    return els.get(id);
  },
  querySelectorAll: () => [],
  addEventListener() {},
  createElement: () => mk("tmp"),
};

const win = {
  document: doc,
  location: { hash: "#/bag" },
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
  URL,
};
win.fetch = (u, o) => fetch(new URL(u, BASE).toString(), o);
win.window = win;

function load(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
  // 遮蔽 UMD 检测用到的 CommonJS 标识符，模拟浏览器经典 <script> 环境
  new Function(
    "window",
    "document",
    "localStorage",
    "fetch",
    "self",
    "module",
    "exports",
    "require",
    code,
  )(win, doc, win.localStorage, win.fetch, win, undefined, undefined, undefined);
}

["shared/price.js", "shared/cart.js", "public/js/api.js", "public/js/state.js", "public/js/router.js", "public/js/views/bag.js"].forEach(load);

(async () => {
  console.log("CartUtils / PriceUtils 已挂载:", typeof win.CartUtils, "/", typeof win.PriceUtils);
  if (!win.CartUtils || !win.PriceUtils) {
    throw new Error("shared/ 模块未按浏览器方式挂到 window，无法验证页面层");
  }

  const login = await win.Api.login({ account: "3001", password: "123456" });
  win.Api.setToken(login.token);
  await win.Store.refreshUser();

  const items = await win.Api.cart();
  console.log("接口返回条目勾选态   :", items.map((i) => i.id + "=" + i.selected).join(" "));

  const html = await win.Views.bag();
  const total = html.match(/id="bagTotal">([^<]+)</);
  const selectedCount = html.match(/已选\s*(\d+)\s*件/);

  console.log("购物袋页渲染出的总计 :", total ? total[1] : "(未找到 #bagTotal)");
  console.log("购物袋页已选件数     :", selectedCount ? selectedCount[1] : "?", "件");
  console.log("期望总计             : ¥11,997.00");

  const rows = [...html.matchAll(/<td>(.*?)<br><span class="muted">([^<]*)<\/span><\/td>/g)];
  console.log("行渲染明细（[商品名] 规格）:");
  rows.forEach((r) => console.log("   [" + (r[1].trim() || "(空)") + "] " + r[2].trim()));

  const pass = Boolean(total && total[1] === "¥11,997.00");
  console.log("");
  console.log(pass ? ">>> 页面层 PASS：总计只统计已勾选商品" : ">>> 页面层 FAIL：总计仍不正确");
  process.exitCode = pass ? 0 : 1;
})().catch((err) => {
  console.error("页面层验收运行失败：" + err.message);
  process.exitCode = 1;
});
