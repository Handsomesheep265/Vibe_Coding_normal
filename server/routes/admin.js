/** 后台管理：商品 / 分类 / 订单（仅管理员） */
"use strict";

const express = require("express");
const { load, save } = require("../db");
const { requireAdmin } = require("../auth");
const { ok, fail } = require("../respond");

const router = express.Router();

router.use(requireAdmin);

// ---------- 商品 ----------
router.get("/products", (req, res) => {
  const db = load();
  return ok(res, db.products);
});

router.post("/products", (req, res) => {
  const p = req.body || {};
  if (!p.name || !Number.isFinite(Number(p.basePrice)) || Number(p.basePrice) < 0) {
    return fail(res, 400, "商品名称与基础价（分）必填");
  }
  const db = load();
  const product = {
    id: db.products.length ? Math.max(...db.products.map((x) => x.id)) + 1 : 1,
    categoryId: Number(p.categoryId) || db.categories[0].id,
    name: String(p.name),
    tagline: p.tagline || "",
    image: p.image || "📦",
    basePrice: Number(p.basePrice),
    models: Array.isArray(p.models) && p.models.length ? p.models : [{ name: "标准版", priceDelta: 0 }],
    colors: Array.isArray(p.colors) && p.colors.length ? p.colors : [{ name: "标准色" }],
    storages: Array.isArray(p.storages) && p.storages.length ? p.storages : [{ label: "标准版", priceDelta: 0 }],
    stock: Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0,
    status: p.status === "off" ? "off" : "on",
    recommend: Boolean(p.recommend),
  };
  db.products.push(product);
  save(db);
  return ok(res, product, 201);
});

router.put("/products/:id", (req, res) => {
  const db = load();
  const product = db.products.find((p) => p.id === Number(req.params.id));
  if (!product) return fail(res, 404, "商品不存在");
  const p = req.body || {};
  if (p.name !== undefined) product.name = String(p.name);
  if (p.tagline !== undefined) product.tagline = String(p.tagline);
  if (p.image !== undefined) product.image = String(p.image);
  if (p.basePrice !== undefined) {
    if (!Number.isFinite(Number(p.basePrice)) || Number(p.basePrice) < 0) {
      return fail(res, 400, "基础价必须是非负整数（分）");
    }
    product.basePrice = Number(p.basePrice);
  }
  if (p.stock !== undefined) {
    if (!Number.isFinite(Number(p.stock)) || Number(p.stock) < 0) {
      return fail(res, 400, "库存必须是非负整数");
    }
    product.stock = Number(p.stock);
  }
  if (p.models !== undefined) product.models = p.models;
  if (p.colors !== undefined) product.colors = p.colors;
  if (p.storages !== undefined) product.storages = p.storages;
  if (p.recommend !== undefined) product.recommend = Boolean(p.recommend);
  save(db);
  return ok(res, product);
});

router.put("/products/:id/status", (req, res) => {
  const db = load();
  const product = db.products.find((p) => p.id === Number(req.params.id));
  if (!product) return fail(res, 404, "商品不存在");
  const status = (req.body || {}).status;
  if (status !== "on" && status !== "off") {
    return fail(res, 400, "status 只能是 on 或 off");
  }
  product.status = status;
  save(db);
  return ok(res, product);
});

router.delete("/products/:id", (req, res) => {
  const db = load();
  const before = db.products.length;
  db.products = db.products.filter((p) => p.id !== Number(req.params.id));
  if (db.products.length === before) return fail(res, 404, "商品不存在");
  save(db);
  return ok(res, { deleted: Number(req.params.id) });
});

// ---------- 分类 ----------
router.post("/categories", (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) return fail(res, 400, "分类名称不能为空");
  const db = load();
  if (db.categories.some((c) => c.name === String(name).trim())) {
    return fail(res, 409, "分类已存在");
  }
  const category = {
    id: db.categories.length ? Math.max(...db.categories.map((c) => c.id)) + 1 : 1,
    name: String(name).trim(),
    sort: Number(req.body.sort) || db.categories.length + 1,
    intro: req.body.intro || "",
  };
  db.categories.push(category);
  save(db);
  return ok(res, category, 201);
});

router.put("/categories/:id", (req, res) => {
  const db = load();
  const category = db.categories.find((c) => c.id === Number(req.params.id));
  if (!category) return fail(res, 404, "分类不存在");
  if (req.body.name !== undefined) category.name = String(req.body.name);
  if (req.body.intro !== undefined) category.intro = String(req.body.intro);
  if (req.body.sort !== undefined) category.sort = Number(req.body.sort) || category.sort;
  save(db);
  return ok(res, category);
});

router.delete("/categories/:id", (req, res) => {
  const db = load();
  const before = db.categories.length;
  db.categories = db.categories.filter((c) => c.id !== Number(req.params.id));
  if (db.categories.length === before) return fail(res, 404, "分类不存在");
  save(db);
  return ok(res, { deleted: Number(req.params.id) });
});

// ---------- 订单 ----------
router.get("/orders", (req, res) => {
  const db = load();
  const { status } = req.query;
  let list = [...db.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (status) list = list.filter((o) => o.status === String(status));
  return ok(res, list);
});

router.put("/orders/:id/status", (req, res) => {
  const db = load();
  const order = db.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return fail(res, 404, "订单不存在");
  const status = (req.body || {}).status;
  if (!["待付款", "已完成", "已取消"].includes(status)) {
    return fail(res, 400, "非法的订单状态");
  }
  order.status = status;
  save(db);
  return ok(res, order);
});

module.exports = router;
