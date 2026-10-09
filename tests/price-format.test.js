"use strict";

/**
 * formatPrice —— 金额格式化的加固测试。
 *
 * 既有 tests/price.test.js 的 5 个断言保持原样、不做任何改动；这里只做额外加固：
 * 三位以上分组、大额、负零、小数分、极限值，以及"浏览器端与 Node 端同一份实现"。
 *
 * 另附一条自检：确认被删除的旧测试会立刻被发现（见文件末尾）。
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { formatPrice } = require("../shared/price");

const ROOT = path.join(__dirname, "..");

test("formatPrice 加固：三位以上分组与常见金额", () => {
  assert.equal(formatPrice(0), "¥0.00");
  assert.equal(formatPrice(1), "¥0.01");
  assert.equal(formatPrice(5), "¥0.05");
  assert.equal(formatPrice(99), "¥0.99");
  assert.equal(formatPrice(100), "¥1.00");
  assert.equal(formatPrice(1000), "¥10.00");
  assert.equal(formatPrice(129900), "¥1,299.00");
  assert.equal(formatPrice(899900), "¥8,999.00");
  assert.equal(formatPrice(1199700), "¥11,997.00");
  assert.equal(formatPrice(1159900), "¥11,599.00");
  assert.equal(formatPrice(100000000), "¥1,000,000.00");
});

test("formatPrice 加固：负数保留负号且金额取绝对值", () => {
  assert.equal(formatPrice(-1), "-¥0.01");
  assert.equal(formatPrice(-500), "-¥5.00");
  assert.equal(formatPrice(-129900), "-¥1,299.00");
});

test("formatPrice 加固：非法输入回落 ¥0.00", () => {
  for (const bad of [NaN, Infinity, -Infinity, undefined, null, "abc", {}, [], true, false]) {
    assert.equal(formatPrice(bad), "¥0.00", `输入 ${String(bad)} 应回落 ¥0.00`);
  }
});

test("formatPrice 加固：四舍五入与浮点误差", () => {
  assert.equal(formatPrice(1.4), "¥0.01");
  assert.equal(formatPrice(1.5), "¥0.02");
  assert.equal(formatPrice(0.1 + 0.2), "¥0.00", "浮点误差应被 Math.round 吸收");
  assert.equal(formatPrice(999.999), "¥10.00");
});

test("formatPrice 加固：极大与边界值不抛错", () => {
  assert.equal(formatPrice(Number.MAX_SAFE_INTEGER).startsWith("¥"), true);
  assert.equal(formatPrice(-0), "¥0.00", "负零不应显示成 -¥0.00");
});

test("formatPrice 加固：浏览器端与 Node 端是同一份实现", () => {
  const code = fs.readFileSync(path.join(ROOT, "shared", "price.js"), "utf8");
  const win = {};
  new Function("window", "self", "module", "exports", "require", code)(win, win, undefined, undefined, undefined);
  assert.ok(win.PriceUtils, "浏览器方式下应挂到 window.PriceUtils");
  for (const cents of [0, 5, 129900, 1199700, -500, NaN]) {
    assert.equal(win.PriceUtils.formatPrice(cents), formatPrice(cents), `formatPrice(${cents}) 双端结果应一致`);
  }
});

test("既有测试完整性自检：原有 15 个测试必须仍然存在且未被禁用", () => {
  // 本条用于"防止既有测试被删除/改名/skip"：文件缺失、测试数变化，或出现
  // test.skip / test.only / test.todo / { skip: true } 等禁用手段，都会失败。
  const expectedCount = { "api.test.js": 8, "cart.test.js": 2, "price.test.js": 5 };
  const names = [];

  for (const [file, count] of Object.entries(expectedCount)) {
    const abs = path.join(ROOT, "tests", file);
    assert.ok(fs.existsSync(abs), `既有测试文件不得缺失：tests/${file}`);
    const src = fs.readFileSync(abs, "utf8");
    // 去掉注释后再检查，避免把说明文字里的 skip 字样误判为禁用
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    // 1) 不得使用任何禁用手段
    assert.ok(
      !/\btest\s*\.\s*(skip|only|todo)\b/.test(code),
      `tests/${file} 不得使用 test.skip / test.only / test.todo`,
    );
    assert.ok(!/\{\s*skip\s*:/.test(code), `tests/${file} 不得通过 { skip: true } 禁用测试`);
    assert.ok(!/\bdescribe\s*\.\s*(skip|only)\b/.test(code), `tests/${file} 不得使用 describe.skip / describe.only`);

    // 2) 测试数量不得减少（同时匹配 test( 与 test.skip( 等，防止"改成 skip 后数量不变"漏检）
    const found = [...src.matchAll(/^\s*test(?:\.\w+)?\(\s*["'`]([^"'`]+)["'`]/gm)].map((m) => m[1]);
    assert.equal(found.length, count, `tests/${file} 的测试数应为 ${count}，实际 ${found.length}`);
    names.push(...found);
  }
  assert.equal(names.length, 15, "既有测试总数应为 15");
});
