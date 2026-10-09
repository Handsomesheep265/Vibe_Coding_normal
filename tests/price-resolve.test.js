"use strict";

/**
 * resolvePrice —— 商品规格价格解析的核心计算测试（任务二实现后的回归基线）
 *
 * 订单要求覆盖：
 *   - 默认规格（Pro / 深蓝 / 256GB） = 899900
 *   - Pro Max + 1TB                = 1159900
 *   - 未知型号差价按 0
 *   - variant 缺省字段不抛错
 * 另加：容量差价、颜色不参与定价、缺省/非法输入、脏规格项、以及对全部种子商品的行为校验。
 *
 * 注：数值期望取自《题目文档》任务二验收表，以及种子商品的实际规格；不修改 seed.js。
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { resolvePrice } = require("../shared/price");

const PRODUCT = {
  basePrice: 899900,
  models: [
    { name: "iPhone 17 Pro", priceDelta: 0 },
    { name: "iPhone 17 Pro Max", priceDelta: 100000 },
  ],
  colors: [{ name: "深蓝色" }, { name: "银色" }, { name: "星雾橙色" }],
  storages: [
    { label: "256GB", priceDelta: 0 },
    { label: "512GB", priceDelta: 80000 },
    { label: "1TB", priceDelta: 160000 },
  ],
};

const DEFAULT_VARIANT = { model: "iPhone 17 Pro", color: "深蓝色", storage: "256GB" };

test("resolvePrice：默认规格（Pro / 深蓝色 / 256GB）= 899900", () => {
  assert.equal(resolvePrice(PRODUCT, DEFAULT_VARIANT), 899900);
});

test("resolvePrice：Pro Max + 1TB = 1159900（899900 + 100000 + 160000）", () => {
  assert.equal(resolvePrice(PRODUCT, { model: "iPhone 17 Pro Max", color: "深蓝色", storage: "1TB" }), 1159900);
});

test("resolvePrice：Pro Max + 512GB = 1079900（899900 + 100000 + 80000）", () => {
  assert.equal(resolvePrice(PRODUCT, { model: "iPhone 17 Pro Max", color: "深蓝色", storage: "512GB" }), 1079900);
});

test("resolvePrice：文档示例（basePrice 899900 + 512GB 80000）= 979900", () => {
  const p = { basePrice: 899900, models: [{ name: "Pro", priceDelta: 0 }], storages: [{ label: "512GB", priceDelta: 80000 }] };
  assert.equal(resolvePrice(p, { model: "Pro", storage: "512GB" }), 979900);
});

test("resolvePrice：未知型号的差价按 0 计", () => {
  assert.equal(resolvePrice(PRODUCT, { model: "不存在的型号", color: "深蓝色", storage: "256GB" }), 899900);
  assert.equal(resolvePrice(PRODUCT, { model: "", storage: "256GB" }), 899900);
});

test("resolvePrice：未知容量的差价按 0 计", () => {
  assert.equal(resolvePrice(PRODUCT, { model: "iPhone 17 Pro", storage: "2TB" }), 899900);
  assert.equal(resolvePrice(PRODUCT, { model: "iPhone 17 Pro", storage: "" }), 899900);
});

test("resolvePrice：型号与容量都未知时退回基础价", () => {
  assert.equal(resolvePrice(PRODUCT, { model: "未知", storage: "未知" }), 899900);
});

test("resolvePrice：只有一部分规格未知时，另一部分差价仍生效", () => {
  // 未知型号（+0）+ 已知 1TB（+160000）
  assert.equal(resolvePrice(PRODUCT, { model: "未知", storage: "1TB" }), 1059900);
  // 已知 Pro Max（+100000）+ 未知容量（+0）
  assert.equal(resolvePrice(PRODUCT, { model: "iPhone 17 Pro Max", storage: "未知" }), 999900);
});

test("resolvePrice：variant 缺省字段不抛错", () => {
  assert.equal(resolvePrice(PRODUCT, {}), 899900);
  assert.equal(resolvePrice(PRODUCT, { model: "iPhone 17 Pro Max" }), 999900);
  assert.equal(resolvePrice(PRODUCT, { storage: "1TB" }), 1059900);
  assert.equal(resolvePrice(PRODUCT, { color: "银色" }), 899900);
  assert.equal(resolvePrice(PRODUCT, { model: undefined, color: undefined, storage: undefined }), 899900);
});

test("resolvePrice：variant 整体缺省或非法时退回基础价，不抛错", () => {
  assert.equal(resolvePrice(PRODUCT), 899900);
  assert.equal(resolvePrice(PRODUCT, null), 899900);
  assert.equal(resolvePrice(PRODUCT, undefined), 899900);
  assert.equal(resolvePrice(PRODUCT, "not-an-object"), 899900);
  assert.equal(resolvePrice(PRODUCT, 123), 899900);
});

test("resolvePrice：颜色不影响价格", () => {
  const base = resolvePrice(PRODUCT, DEFAULT_VARIANT);
  for (const color of ["深蓝色", "银色", "星雾橙色", "不存在的颜色", undefined]) {
    assert.equal(resolvePrice(PRODUCT, { ...DEFAULT_VARIANT, color }), base, `颜色 ${String(color)} 不应影响价格`);
  }
});

test("resolvePrice：合法的 product 对象本身不返回 NaN / undefined", () => {
  const values = [
    resolvePrice(PRODUCT, DEFAULT_VARIANT),
    resolvePrice(PRODUCT, { model: "iPhone 17 Pro Max", storage: "1TB" }),
    resolvePrice(PRODUCT, {}),
  ];
  for (const v of values) {
    assert.equal(typeof v, "number");
    assert.ok(Number.isFinite(v), "价格必须是有限数字");
  }
});

test("resolvePrice：空规格数组 / 缺少规格列表时只按基础价算", () => {
  assert.equal(resolvePrice({ basePrice: 1000, models: [], storages: [] }, { model: "a", storage: "a" }), 1000);
  assert.equal(resolvePrice({ basePrice: 1000 }, { model: "a", storage: "a" }), 1000);
  assert.equal(resolvePrice({ basePrice: 1000, models: [{ name: "m", priceDelta: 7 }] }, { model: "m" }), 1007);
});

test("resolvePrice：基础价缺失或非数字时按 0，差价仍照常计入", () => {
  assert.equal(resolvePrice({ models: [{ name: "m", priceDelta: 100 }] }, { model: "m" }), 100);
  assert.equal(resolvePrice({ basePrice: NaN }, {}), 0);
  assert.equal(resolvePrice({ basePrice: "1000" }, {}), 1000, "数字字符串基础价应参与计算");
});

test("resolvePrice：脏规格项不抛错，差价按 0 计", () => {
  assert.equal(resolvePrice({ basePrice: 1000, models: [{ name: "m" }] }, { model: "m" }), 1000, "缺 priceDelta");
  assert.equal(resolvePrice({ basePrice: 1000, models: [{ name: "m", priceDelta: "x" }] }, { model: "m" }), 1000, "priceDelta 非数字");
  assert.equal(resolvePrice({ basePrice: 1000, models: [null, { name: "m", priceDelta: 3 }] }, { model: "m" }), 1003);
  assert.equal(resolvePrice({ basePrice: 1000, models: [null] }, { model: "zzz" }), 1000);
});

test("resolvePrice：规格项同时提供 name 与 label 时都能匹配", () => {
  const bothFields = { basePrice: 1000, models: [{ label: "M1", name: "M1", priceDelta: 10 }] };
  assert.equal(resolvePrice(bothFields, { model: "M1" }), 1010);
  const labelOnly = { basePrice: 1000, storages: [{ label: "512GB", priceDelta: 80000 }] };
  assert.equal(resolvePrice(labelOnly, { storage: "512GB" }), 81000);
  const nameOnly = { basePrice: 1000, storages: [{ name: "512GB", priceDelta: 80000 }] };
  assert.equal(resolvePrice(nameOnly, { storage: "512GB" }), 81000);
});

test("resolvePrice：非法 product 返回 0，不抛错", () => {
  for (const bad of [null, undefined, 0, 1, "", "product", true]) {
    assert.equal(resolvePrice(bad, DEFAULT_VARIANT), 0, `product=${String(bad)} 应返回 0`);
  }
});

test("resolvePrice：价格随数量线性增长（同一规格 × n）", () => {
  const unit = resolvePrice(PRODUCT, { model: "iPhone 17 Pro Max", storage: "1TB" });
  assert.equal(unit * 2, 2319800);
  assert.equal(unit * 3, 3479700);
});

test("resolvePrice：全部种子商品默认规格等于基础价，且顶配等于规格差价之和", () => {
  // 直接用 server/seed.js 导出的种子数据（进程内只读），不读 data/db.json：
  // 后者会被其它测试文件的 db.reset() 改写，读取时机不同会导致结果不稳定。
  const seed = require("../server/seed");
  // 各商品"最高配"的精确期望值（规格与差价来自 server/seed.js）
  const MAX_CONFIG_PRICE = {
    1: 1159900, // iPhone 17 Pro: +Pro Max 100000、+1TB 160000
    2: 729900, // iPhone Air: 只有 +512GB 80000
    3: 799900, // MacBook Neo: +高速款 150000、+512GB 100000
    4: 149900, // AirPods Pro 3: 单一规格
    5: 19900, // MagSafe 充电器: 单一规格
    6: 19900, // iPhone MagSafe 保护壳: 单一规格
  };

  for (const p of seed.products) {
    const first = { model: p.models[0].name, color: p.colors[0].name, storage: p.storages[0].label };
    const last = {
      model: p.models[p.models.length - 1].name,
      color: p.colors[0].name,
      storage: p.storages[p.storages.length - 1].label,
    };
    assert.equal(resolvePrice(p, first), p.basePrice, `${p.name} 默认规格应等于基础价`);
    assert.equal(resolvePrice(p, last), MAX_CONFIG_PRICE[p.id], `${p.name} 顶配价不符`);
    assert.ok(resolvePrice(p, last) >= p.basePrice, `${p.name} 顶配价不应低于基础价`);

    // 顶配价应等于 基础价 + 末位型号差价 + 末位容量差价（与实现口径一致，防漂移）
    const expected =
      p.basePrice + p.models[p.models.length - 1].priceDelta + p.storages[p.storages.length - 1].priceDelta;
    assert.equal(resolvePrice(p, last), expected, `${p.name} 顶配价应等于基础价加各项差价`);
  }
});

test("resolvePrice：与种子购物袋已落库的 unitPrice 一致（页面价 = 落库价）", () => {
  // 同样只读种子数据，避免与 api.test.js 的 db.reset() 抢 data/db.json
  const seed = require("../server/seed");
  let checked = 0;
  for (const cart of seed.carts) {
    for (const item of cart.items) {
      const product = seed.products.find((p) => p.id === item.productId);
      const price = resolvePrice(product, { model: item.model, color: item.color, storage: item.storage });
      assert.equal(price, item.unitPrice, `购物袋条目 ${item.id} 的落库单价应与 resolvePrice 一致`);
      checked++;
    }
  }
  assert.equal(checked, 4, "种子购物袋共 4 条（3001 三条 + 3002 一条）");
});

test("resolvePrice：浏览器端与 Node 端是同一份实现（UMD 双端结果一致）", () => {
  const code = fs.readFileSync(path.join(__dirname, "..", "shared", "price.js"), "utf8");
  // 遮蔽 CommonJS 标识符，模拟浏览器经典 <script> 环境
  const win = {};
  new Function("window", "self", "module", "exports", "require", code)(win, win, undefined, undefined, undefined);

  assert.ok(win.PriceUtils, "浏览器方式下应挂到 window.PriceUtils");
  const variant = { model: "iPhone 17 Pro Max", color: "深蓝色", storage: "1TB" };
  assert.equal(win.PriceUtils.resolvePrice(PRODUCT, variant), resolvePrice(PRODUCT, variant));
  assert.equal(win.PriceUtils.resolvePrice(PRODUCT, variant), 1159900);
});
