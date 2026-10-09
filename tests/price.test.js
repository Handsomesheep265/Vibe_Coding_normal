"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { formatPrice } = require("../shared/price");

test("formatPrice：0 格式化为 ¥0.00", () => {
  assert.equal(formatPrice(0), "¥0.00");
});

test("formatPrice：分位补零", () => {
  assert.equal(formatPrice(5), "¥0.05");
  assert.equal(formatPrice(100), "¥1.00");
});

test("formatPrice：千分位分组", () => {
  assert.equal(formatPrice(129900), "¥1,299.00");
  assert.equal(formatPrice(1199700), "¥11,997.00");
});

test("formatPrice：负数保留负号", () => {
  assert.equal(formatPrice(-500), "-¥5.00");
});

test("formatPrice：非数字输入回落 ¥0.00", () => {
  assert.equal(formatPrice(NaN), "¥0.00");
  assert.equal(formatPrice(undefined), "¥0.00");
});
