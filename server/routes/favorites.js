/** 收藏：列表 / 收藏或取消 */
"use strict";

const express = require("express");
const { load, save } = require("../db");
const { requireAuth } = require("../auth");
const { ok, fail } = require("../respond");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  const db = load();
  const fav = db.favorites.find((f) => f.userId === req.currentUser.id);
  const ids = fav ? fav.productIds : [];
  const products = db.products.filter((p) => ids.includes(p.id) && p.status === "on");
  return ok(res, products);
});

router.post("/:productId", requireAuth, (req, res) => {
  const db = load();
  const product = db.products.find((p) => p.id === Number(req.params.productId));
  if (!product) return fail(res, 404, "商品不存在");
  let fav = db.favorites.find((f) => f.userId === req.currentUser.id);
  if (!fav) {
    fav = { userId: req.currentUser.id, productIds: [] };
    db.favorites.push(fav);
  }
  const idx = fav.productIds.indexOf(product.id);
  if (idx >= 0) {
    fav.productIds.splice(idx, 1);
  } else {
    fav.productIds.push(product.id);
  }
  save(db);
  return ok(res, { productId: product.id, favorited: idx < 0 });
});

module.exports = router;
