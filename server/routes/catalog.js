/** 分类与商品（前台只读） */
"use strict";

const express = require("express");
const { load } = require("../db");
const { ok, fail } = require("../respond");

const router = express.Router();

router.get("/categories", (req, res) => {
  const db = load();
  const list = [...db.categories].sort((a, b) => a.sort - b.sort);
  return ok(res, list);
});

router.get("/products", (req, res) => {
  const db = load();
  const { categoryId, keyword, recommend } = req.query;
  let list = db.products.filter((p) => p.status === "on");
  if (categoryId) list = list.filter((p) => p.categoryId === Number(categoryId));
  if (recommend === "true") list = list.filter((p) => p.recommend);
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    list = list.filter(
      (p) => p.name.toLowerCase().includes(kw) || (p.tagline || "").toLowerCase().includes(kw),
    );
  }
  return ok(res, list);
});

router.get("/products/:id", (req, res) => {
  const db = load();
  const product = db.products.find((p) => p.id === Number(req.params.id));
  if (!product || product.status !== "on") return fail(res, 404, "商品不存在或已下架");
  return ok(res, product);
});

module.exports = router;
