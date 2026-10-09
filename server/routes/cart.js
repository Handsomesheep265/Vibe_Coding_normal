/** 购物袋：查看 / 加入 / 改数量与勾选 / 删除 */
"use strict";

const express = require("express");
const { load, save } = require("../db");
const { requireAuth } = require("../auth");
const { ok, fail } = require("../respond");
const { resolvePrice } = require("../../shared/price");

const router = express.Router();

function findCart(db, userId) {
  let cart = db.carts.find((c) => c.userId === userId);
  if (!cart) {
    cart = { userId, items: [] };
    db.carts.push(cart);
  }
  return cart;
}

function defaultVariant(product) {
  return {
    model: product.models[0].name,
    color: product.colors[0].name,
    storage: product.storages[0].name,
  };
}

router.get("/", requireAuth, (req, res) => {
  const db = load();
  const cart = db.carts.find((c) => c.userId === req.currentUser.id);
  if (!cart) return ok(res, []);
  // 补齐种子条目缺失的 name/image：种子数据里这两项没有（POST 加购的条目才有），
  // 直接返回会让购物袋页标题显示成 "undefined"。这里按 productId 从商品表回填，
  // 返回新对象，不改动 cart.items 本身（避免被后续 save() 落盘）。
  return ok(
    res,
    cart.items.map((item) => {
      const product = db.products.find((p) => p.id === item.productId);
      return {
        ...item,
        name: item.name || (product ? product.name : "") || item.model || "",
        image: item.image || (product ? product.image : "") || "",
      };
    }),
  );
});

router.post("/", requireAuth, (req, res) => {
  const { productId, model, color, storage, qty } = req.body || {};
  const quantity = Math.floor(Number(qty) || 1);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return fail(res, 400, "数量必须是大于 0 的整数");
  }
  const db = load();
  const product = db.products.find((p) => p.id === Number(productId));
  if (!product || product.status !== "on") return fail(res, 404, "商品不存在或已下架");
  if (quantity > product.stock) return fail(res, 400, "库存不足");

  const variant = { model, color, storage };
  const cart = findCart(db, req.currentUser.id);
  const same = cart.items.find(
    (i) =>
      i.productId === product.id &&
      i.model === variant.model &&
      i.color === variant.color &&
      i.storage === variant.storage,
  );
  const unitPrice = resolvePrice(product, variant);
  if (same) {
    same.qty = Math.min(product.stock, same.qty + quantity);
    same.unitPrice = unitPrice;
  } else {
    cart.items.push({
      id: db.seq.cartItem++,
      productId: product.id,
      name: product.name,
      image: product.image,
      model: variant.model || defaultVariant(product).model,
      color: variant.color || defaultVariant(product).color,
      storage: variant.storage || defaultVariant(product).storage,
      unitPrice,
      qty: Math.min(product.stock, quantity),
      selected: true,
    });
  }
  save(db);
  return ok(res, cart.items, 201);
});

router.put("/:itemId", requireAuth, (req, res) => {
  const { qty, selected } = req.body || {};
  const db = load();
  const cart = db.carts.find((c) => c.userId === req.currentUser.id);
  const item = cart && cart.items.find((i) => i.id === Number(req.params.itemId));
  if (!item) return fail(res, 404, "购物袋条目不存在");

  if (qty !== undefined) {
    const quantity = Math.floor(Number(qty));
    if (!Number.isInteger(quantity) || quantity < 1) {
      return fail(res, 400, "数量必须是大于 0 的整数");
    }
    const product = db.products.find((p) => p.id === item.productId);
    if (product && quantity > product.stock) {
      return fail(res, 400, `库存不足，当前库存 ${product.stock}`);
    }
    item.qty = quantity;
  }
  if (selected !== undefined) {
    item.selected = Boolean(selected);
  }
  save(db);
  return ok(res, cart.items);
});

router.delete("/:itemId", requireAuth, (req, res) => {
  const db = load();
  const cart = db.carts.find((c) => c.userId === req.currentUser.id);
  if (!cart) return fail(res, 404, "购物袋条目不存在");
  const before = cart.items.length;
  cart.items = cart.items.filter((i) => i.id !== Number(req.params.itemId));
  if (cart.items.length === before) return fail(res, 404, "购物袋条目不存在");
  save(db);
  return ok(res, cart.items);
});

module.exports = router;
