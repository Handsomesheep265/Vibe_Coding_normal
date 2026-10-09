"use strict";

/**
 * 接口冒烟：在临时端口启动真实服务，走通
 * 登录 → 购物袋 → 下单 → 后台权限 的关键链路。
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { app } = require("../server/index");
const db = require("../server/db");

let base;
let server;

test.before(async () => {
  db.reset();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(() => {
  server.close();
  db.reset();
});

async function api(path, { method = "GET", token, body } = {}) {
  const resp = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await resp.json().catch(() => null);
  return { status: resp.status, payload };
}

async function login(account, password) {
  const { payload } = await api("/api/auth/login", {
    method: "POST",
    body: { account, password },
  });
  assert.equal(payload.success, true, "登录应成功");
  return payload.data.token;
}

test("登录：正确账号拿到 token，错误密码 401", async () => {
  const token = await login("3001", "123456");
  assert.ok(token && token.includes("."), "token 应为签名令牌");
  const bad = await api("/api/auth/login", { method: "POST", body: { account: "3001", password: " wrong" } });
  assert.equal(bad.status, 401);
});

test("购物袋：种子数据属于各登录用户", async () => {
  const token = await login("3001", "123456");
  const { payload } = await api("/api/cart", { token });
  assert.equal(payload.success, true);
  assert.equal(payload.data.length, 3);
  assert.deepEqual(
    payload.data.map((i) => i.selected),
    [true, true, false],
  );
});

test("购物袋：加入商品返回该用户完整条目", async () => {
  const token = await login("3002", "123456");
  const { status, payload } = await api("/api/cart", {
    method: "POST",
    token,
    body: { productId: 4, model: "AirPods Pro 3", color: "白色", storage: "标准版", qty: 1 },
  });
  assert.equal(status, 201);
  assert.ok(payload.data.some((i) => i.productId === 4 && i.qty === 1));
  assert.ok(payload.data.some((i) => i.productId === 2 && i.qty === 1), "原有条目不受影响");
});

test("购物袋：库存不足被拒绝", async () => {
  const token = await login("3002", "123456");
  const { status } = await api("/api/cart", {
    method: "POST",
    token,
    body: { productId: 5, model: "MagSafe 充电器", color: "白色", storage: "1m", qty: 1 },
  });
  assert.equal(status, 400);
});

test("订单：由勾选商品生成并按条目快照计价", async () => {
  const token = await login("3001", "123456");
  const { status, payload } = await api("/api/orders", {
    method: "POST",
    token,
    body: {
      address: { receiver: "张三", phone: "13800000001", detail: "1栋502" },
    },
  });
  assert.equal(status, 201);
  assert.equal(payload.data.total, 899900 + 149900 * 2);
  assert.equal(payload.data.items.length, 2, "只结算已勾选商品");

  const after = await api("/api/cart", { token });
  assert.equal(after.payload.data.length, 1, "已结算条目移出购物袋");
});

test("订单：未登录与越权被拒绝", async () => {
  const noAuth = await api("/api/orders");
  assert.equal(noAuth.status, 401);

  const student = await login("3002", "123456");
  const other = await api("/api/orders/20260901001", { token: student });
  assert.equal(other.status, 403);
});

test("后台：学生 403、管理员可查订单", async () => {
  const student = await login("3001", "123456");
  const denied = await api("/api/admin/products", { token: student });
  assert.equal(denied.status, 403);

  const admin = await login("admin", "admin123");
  const ok = await api("/api/admin/orders", { token: admin });
  assert.equal(ok.payload.success, true);
  assert.ok(Array.isArray(ok.payload.data));
});

test("接口契约：响应统一包含 success 字段", async () => {
  const { payload } = await api("/api/products");
  assert.equal(payload.success, true);
  assert.ok(Array.isArray(payload.data));
});
