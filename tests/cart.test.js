"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { calcCartCount } = require("../shared/cart");

const items = [
  { unitPrice: 100, qty: 1, selected: true },
  { unitPrice: 200, qty: 2, selected: false },
  { unitPrice: 50, qty: 3, selected: true },
];

test("calcCartCount：按数量求和不看勾选", () => {
  assert.equal(calcCartCount(items), 6);
});

test("calcCartCount：空数组与非数组输入为 0", () => {
  assert.equal(calcCartCount([]), 0);
  assert.equal(calcCartCount(null), 0);
  assert.equal(calcCartCount(undefined), 0);
});
