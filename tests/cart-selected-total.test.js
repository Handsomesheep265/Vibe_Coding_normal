"use strict";

/**
 * calcSelectedTotal —— 购物袋「已勾选商品合计」的核心计算测试（任务一修复后的回归基线）
 *
 * 订单要求覆盖：
 *   - fixture 三条数据全勾选 = 1199700
 *   - 只勾 AirPods        = 299800
 *   - 取消 AirPods        = 899900
 *   - 全不勾              = 0
 *   - 空数组 / 非数组      = 0
 * 另加：脏数据兜底、不抛错、不改入参，以及 calcCartCount 不被误改的回归。
 *
 * 注：fixture 取 `server/seed.js` 中 3001 的三条购物袋数据（金额为分）。
 *     这里只读种子数据做一致性校验，不修改它。
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { calcSelectedTotal, calcCartCount } = require("../shared/cart");

// 种子数据原样：iPhone 17 Pro ×1（勾选）、AirPods Pro 3 ×2（勾选）、MagSafe 保护壳 ×1（未勾选）
//
// 注意题目里的说法：fixture 的「全勾选状态总计 = ¥11,997.00」指的是
// **种子数据原样的勾选态（2 勾 1 不勾，即 899900 + 149900×2）**，
// 不是"三条全打勾"——三条全勾会是 1219600（多算了未勾选的保护壳 19900）。
const FIXTURE = [
  { id: 101, productId: 1, model: "iPhone 17 Pro", color: "深蓝色", storage: "256GB", unitPrice: 899900, qty: 1, selected: true },
  { id: 102, productId: 4, model: "AirPods Pro 3", color: "白色", storage: "标准版", unitPrice: 149900, qty: 2, selected: true },
  { id: 103, productId: 6, model: "iPhone 17 Pro 适用", color: "深蓝色", storage: "标准版", unitPrice: 19900, qty: 1, selected: false },
];

/** 只勾选指定 id 的条目 */
function pickOnly(...ids) {
  return FIXTURE.map((item) => ({ ...item, selected: ids.includes(item.id) }));
}

test("calcSelectedTotal：三条 fixture 种子勾选态（2 勾 1 不勾）= 1199700（899900 + 149900×2）", () => {
  assert.equal(calcSelectedTotal(FIXTURE.map((i) => ({ ...i }))), 1199700);
  // 未勾选的 MagSafe 保护壳（19900）不得计入
  assert.notEqual(calcSelectedTotal(FIXTURE.map((i) => ({ ...i }))), 1219600);
});

/** 所有条目都未勾选 */
function allUnselected() {
  return FIXTURE.map((item) => ({ ...item, selected: false }));
}

test("calcSelectedTotal：只勾 AirPods = 299800", () => {
  assert.equal(calcSelectedTotal(pickOnly(102)), 299800);
});

test("calcSelectedTotal：取消勾选 AirPods（只留 iPhone）= 899900", () => {
  assert.equal(calcSelectedTotal(pickOnly(101)), 899900);
  // 等价写法：三条都在，只把 AirPods 置为未勾选
  const noAirpods = FIXTURE.map((item) => (item.id === 102 ? { ...item, selected: false } : { ...item }));
  assert.equal(calcSelectedTotal(noAirpods), 899900);
});

test("calcSelectedTotal：全部取消勾选 = 0", () => {
  assert.equal(calcSelectedTotal(allUnselected()), 0);
});

test("calcSelectedTotal：三条全部勾选时未勾选的保护壳也会计入（反例，说明必须过滤）", () => {
  // 这正是 T1 缺陷的表现：若不过滤 selected，结果会是 1219600 而非 1199700
  const allChecked = FIXTURE.map((item) => ({ ...item, selected: true }));
  assert.equal(calcSelectedTotal(allChecked), 1219600);
  assert.equal(calcSelectedTotal(FIXTURE.map((i) => ({ ...i }))), 1199700);
});

test("calcSelectedTotal：空数组 = 0", () => {
  assert.equal(calcSelectedTotal([]), 0);
});

test("calcSelectedTotal：非数组输入一律 = 0 且不抛错", () => {
  const notArrays = [null, undefined, 0, 1, "", "abc", {}, { length: 1, 0: FIXTURE[0] }, true, NaN, new Map(), new Set()];
  for (const value of notArrays) {
    assert.equal(calcSelectedTotal(value), 0, `输入 ${String(value)} 应返回 0`);
  }
});

test("calcSelectedTotal：selected 字段缺失或非严格 true 时不计入", () => {
  assert.equal(calcSelectedTotal([{ unitPrice: 100, qty: 2 }]), 0, "缺 selected 应视为未勾选");
  assert.equal(calcSelectedTotal([{ unitPrice: 100, qty: 2, selected: undefined }]), 0);
  assert.equal(calcSelectedTotal([{ unitPrice: 100, qty: 2, selected: null }]), 0);
  assert.equal(calcSelectedTotal([{ unitPrice: 100, qty: 2, selected: 1 }]), 0, "数字 1 不视为勾选");
  assert.equal(calcSelectedTotal([{ unitPrice: 100, qty: 2, selected: 0 }]), 0);
  assert.equal(calcSelectedTotal([{ unitPrice: 100, qty: 2, selected: "true" }]), 0, "字符串 'true' 不视为勾选");
  assert.equal(calcSelectedTotal([{ unitPrice: 100, qty: 2, selected: "false" }]), 0, "字符串 'false' 是 truthy，必须靠严格比较挡住");
});

test("calcSelectedTotal：数组内含脏条目时跳过该条，其余正常累加", () => {
  assert.equal(calcSelectedTotal([null, { unitPrice: 100, qty: 1, selected: true }]), 100);
  assert.equal(calcSelectedTotal([undefined, { unitPrice: 100, qty: 1, selected: true }]), 100);
  assert.equal(calcSelectedTotal(["脏数据", { unitPrice: 100, qty: 1, selected: true }]), 100);
});

test("calcSelectedTotal：unitPrice / qty 缺失或非数字时按 0 计，不产生 NaN", () => {
  assert.equal(calcSelectedTotal([{ qty: 2, selected: true }]), 0);
  assert.equal(calcSelectedTotal([{ unitPrice: 100, selected: true }]), 0);
  assert.equal(calcSelectedTotal([{ selected: true }]), 0);
  assert.equal(calcSelectedTotal([{ unitPrice: "abc", qty: 2, selected: true }]), 0);
  assert.equal(calcSelectedTotal([{ unitPrice: NaN, qty: 2, selected: true }]), 0);
  assert.equal(calcSelectedTotal([{ unitPrice: null, qty: 2, selected: true }]), 0);
  const mixed = calcSelectedTotal([{ unitPrice: "abc", qty: 1, selected: true }, { unitPrice: 500, qty: 2, selected: true }]);
  assert.equal(mixed, 1000, "一条脏数据不应污染整个合计");
  assert.ok(!Number.isNaN(mixed), "合计不得为 NaN");
});

test("calcSelectedTotal：数字字符串按数值参与计算", () => {
  assert.equal(calcSelectedTotal([{ unitPrice: "100", qty: "3", selected: true }]), 300);
});

test("calcSelectedTotal：不修改传入的数组（纯计算）", () => {
  const input = [{ unitPrice: 100, qty: 2, selected: true }];
  const snapshot = JSON.stringify(input);
  calcSelectedTotal(input);
  assert.equal(JSON.stringify(input), snapshot, "入参不应被改动");
});

test("回归：calcCartCount 按数量求和不看勾选，未被 T1 改动", () => {
  assert.equal(calcCartCount(FIXTURE), 4, "1 + 2 + 1");
  assert.equal(calcCartCount(allUnselected()), 4, "全部未勾选时角标仍应统计总件数");
  assert.equal(calcCartCount([]), 0);
  assert.equal(calcCartCount(null), 0);
  assert.equal(calcCartCount(undefined), 0);
});

test("一致性：种子数据的购物袋单价与勾选态支持上述期望值", () => {
  const seed = require("../server/seed");
  const cart = seed.carts.find((c) => c.userId === 2);
  assert.ok(cart, "种子里应有 3001（userId 2）的购物袋");
  assert.equal(cart.items.length, 3);

  // 勾选态必须是 true, true, false
  assert.deepEqual(cart.items.map((i) => i.selected), [true, true, false]);

  // 逐条核对单价，确保 fixture 与种子数据不会各自漂移
  cart.items.forEach((item, index) => {
    assert.equal(item.unitPrice, FIXTURE[index].unitPrice, `第 ${index + 1} 条单价应与 fixture 一致`);
    assert.equal(item.qty, FIXTURE[index].qty, `第 ${index + 1} 条数量应与 fixture 一致`);
  });

  // 直接用种子数据算，也应是 1199700
  assert.equal(calcSelectedTotal(cart.items.map((i) => ({ ...i }))), 1199700);
});
