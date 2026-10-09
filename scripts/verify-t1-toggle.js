"use strict";

/**
 * T1 页面实时联动验收：直接调用购物袋页的 toggle()，检查它回写到 #bagTotal 的数值
 * 与"已选 N 件"文案。覆盖题目要求的状态：全勾选 / 取消 AirPods / 全部取消 / 下单拒绝。
 *
 * 需要服务已启动：npm start
 * 用法：node scripts/verify-t1-toggle.js
 * 说明：结束后会把勾选态通过接口恢复为种子状态（运行中的服务以进程内缓存为准）。
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
  new Function("window", "document", "localStorage", "fetch", "self", "module", "exports", "require", code)(
    win,
    doc,
    win.localStorage,
    win.fetch,
    win,
    undefined,
    undefined,
    undefined,
  );
}
["shared/price.js", "shared/cart.js", "public/js/api.js", "public/js/state.js", "public/js/router.js", "public/js/views/bag.js"].forEach(load);

let failures = 0;
function expect(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(30)} 实际=${actual}  期望=${expected}`);
}

/** toggle() 只更新 #bagTotal 与"已选 N 件"；这两个读取都从渲染出的 HTML 取，口径一致 */
async function rendered() {
  const html = await win.Views.bag();
  const total = /id="bagTotal">([^<]+)</.exec(html);
  const count = /已选\s*(\d+)\s*件/.exec(html);
  return { total: total ? total[1] : "(未找到 #bagTotal)", count: count ? count[1] : "?" };
}

(async () => {
  const login = await win.Api.login({ account: "3001", password: "123456" });
  win.Api.setToken(login.token);
  await win.Store.refreshUser();

  let view = await rendered();
  expect("初始总计（全勾选）", view.total, "¥11,997.00");
  expect("初始已选件数", view.count, "2");

  // 取消勾选 AirPods(102)
  await win.Views.bag.toggle(102, false);
  view = await rendered();
  expect("取消 AirPods 后总计", view.total, "¥8,999.00");
  expect("取消 AirPods 后已选", view.count, "1");

  // 重新勾选
  await win.Views.bag.toggle(102, true);
  view = await rendered();
  expect("重新勾选后总计", view.total, "¥11,997.00");
  expect("重新勾选后已选", view.count, "2");

  // 全部取消勾选
  await win.Views.bag.toggle(101, false);
  await win.Views.bag.toggle(102, false);
  view = await rendered();
  expect("全部取消后总计", view.total, "¥0.00");
  expect("全部取消后已选", view.count, "0");

  // 全不勾选时下单应被拒绝
  let orderMsg = "(未拒绝)";
  try {
    await win.Api.createOrder({ address: { receiver: "张三", phone: "13800000001", detail: "1栋502" } });
  } catch (err) {
    orderMsg = err.message;
  }
  expect("全不勾选下单被拒", orderMsg.includes("没有已勾选") ? "拒绝" : orderMsg, "拒绝");

  // 恢复种子勾选态
  await win.Api.updateCartItem(101, { selected: true });
  await win.Api.updateCartItem(102, { selected: true });
  await win.Api.updateCartItem(103, { selected: false });
  const after = await win.Api.cart();
  expect("恢复种子勾选态", after.map((i) => i.id + "=" + i.selected).join(" "), "101=true 102=true 103=false");

  console.log("");
  console.log(failures === 0 ? ">>> T1 页面实时联动全部通过" : `>>> ${failures} 项未通过`);
  process.exitCode = failures ? 1 : 0;
})().catch((err) => {
  console.error("运行失败：" + err.message);
  process.exitCode = 1;
});
