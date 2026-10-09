/** 订单：从购物袋勾选商品生成 / 列表 / 详情 / 取消未付款 */
"use strict";

const express = require("express");
const { load, save } = require("../db");
const { requireAuth } = require("../auth");
const { ok, fail } = require("../respond");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const db = load();
  const { status } = req.query;
  let list = db.orders
    .filter((o) => o.userId === req.currentUser.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (status) list = list.filter((o) => o.status === String(status));
  return ok(res, list);
});

router.get("/:id", requireAuth, (req, res) => {
  const db = load();
  const order = db.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return fail(res, 404, "订单不存在");
  if (order.userId !== req.currentUser.id && req.currentUser.role !== "admin") {
    return fail(res, 403, "无权查看该订单");
  }
  return ok(res, order);
});

router.post("/", requireAuth, (req, res) => {
  const { address, itemIds } = req.body || {};
  if (!address || !address.receiver || !address.phone || !address.detail) {
    return fail(res, 400, "请完整填写收货信息（收货人/电话/地址）");
  }
  if (!/^1\d{10}$/.test(String(address.phone))) {
    return fail(res, 400, "手机号格式不正确");
  }
  const db = load();
  const cart = db.carts.find((c) => c.userId === req.currentUser.id);
  const items = (cart ? cart.items : []).filter((i) => i.selected);
  const picked = itemIds ? items.filter((i) => itemIds.includes(i.id)) : items;
  if (picked.length === 0) {
    return fail(res, 400, "没有已勾选的商品，无法提交订单");
  }
  for (const item of picked) {
    const product = db.products.find((p) => p.id === item.productId);
    if (product && item.qty > product.stock) {
      return fail(res, 400, `「${item.name}」库存不足，当前库存 ${product.stock}`);
    }
  }
  const total = picked.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const orderId = ++db.seq.order;
  const order = {
    id: orderId,
    userId: req.currentUser.id,
    items: picked.map((i) => ({
      productId: i.productId,
      name: i.name,
      image: i.image,
      model: i.model,
      color: i.color,
      storage: i.storage,
      unitPrice: i.unitPrice,
      qty: i.qty,
    })),
    total,
    status: "待付款",
    address: { receiver: address.receiver, phone: String(address.phone), detail: address.detail },
    createdAt: new Date().toISOString(),
  };
  db.orders.unshift(order);
  if (cart) {
    const pickedIds = new Set(picked.map((i) => i.id));
    cart.items = cart.items.filter((i) => !pickedIds.has(i.id));
  }
  save(db);
  return ok(res, order, 201);
});

router.post("/:id/cancel", requireAuth, (req, res) => {
  const db = load();
  const order = db.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return fail(res, 404, "订单不存在");
  if (order.userId !== req.currentUser.id && req.currentUser.role !== "admin") {
    return fail(res, 403, "无权操作该订单");
  }
  if (order.status !== "待付款") {
    return fail(res, 400, "只有待付款订单可以取消");
  }
  order.status = "已取消";
  order.cancelledAt = new Date().toISOString();
  save(db);
  return ok(res, order);
});

module.exports = router;
