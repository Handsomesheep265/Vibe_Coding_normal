/**
 * 商品购买页：规格选择（型号/颜色/容量）+ 价格联动 + 库存状态 + 加入购物袋。
 *
 * 任务二实现要点：
 *   - 价格由 root.PriceUtils.resolvePrice 解析（与 server/routes/cart.js 同一份实现），
 *     切换型号/容量时重绘 #buyPrice；颜色不影响价格。
 *   - 库存为 0 时显示"暂时缺货"并禁用加入购物袋；数量步进不超过库存。
 */
(function (root) {
  "use strict";

  // 当前视图正在查看的商品与已选规格
  let current = null;

  async function product(params) {
    const p = await root.Api.product(params.id);
    // 每次进入页面都重新初始化：避免从商品 A 切到商品 B 时沿用 A 的规格与数量
    current = { product: p, variant: defaultVariant(p), qty: 1 };
    const user = root.Store.state.user;
    const outOfStock = p.stock <= 0;
    return `
      <div class="buy-layout">
        <div class="buy-preview">${p.image}</div>
        <div class="buy-info">
          <h1>${p.name}</h1>
          <p class="muted">${p.tagline || ""}</p>
          <p class="buy-price" id="buyPrice">${root.PriceUtils.formatPrice(root.PriceUtils.resolvePrice(p, current.variant))}</p>
          ${stockHint(p)}
          <div class="spec-group">
            <h4>型号</h4>
            <div class="chips" id="modelChips">${modelChips(p)}</div>
          </div>
          <div class="spec-group">
            <h4>颜色</h4>
            <div class="chips" id="colorChips">${colorChips(p)}</div>
          </div>
          <div class="spec-group">
            <h4>容量</h4>
            <div class="chips" id="storageChips">${storageChips(p)}</div>
          </div>
          <div class="row" style="margin:18px 0">
            <div class="qty-ctrl">
              <button onclick="Views.product.qty(-1)">-</button>
              <span id="qtyValue">1</span>
              <button onclick="Views.product.qty(1)">+</button>
            </div>
          </div>
          <div class="row">
            <button class="btn" id="addBagBtn" onclick="Views.product.addToCart()"${outOfStock ? " disabled" : ""}>加入购物袋</button>
            <button class="btn btn-plain" onclick="Views.product.favorite()">${user ? "收藏" : "登录后可收藏"}</button>
          </div>
        </div>
      </div>`;
  }

  function defaultVariant(p) {
    return {
      model: (p.models[0] || {}).name,
      color: (p.colors[0] || {}).name,
      storage: (p.storages[0] || {}).label,
    };
  }

  /** 库存提示：库存为 0 时显示"暂时缺货"（复用已有的 .stock-hint.low 红色样式） */
  function stockHint(p) {
    return p.stock > 0
      ? `<p class="stock-hint" id="stockHint">库存 ${p.stock} 件</p>`
      : `<p class="stock-hint low" id="stockHint">暂时缺货</p>`;
  }

  function modelChips(p) {
    if (!Array.isArray(p.models)) return "";
    return p.models
      .map(
        (m) =>
          `<button class="chip ${current.variant.model === m.name ? "selected" : ""}"
             onclick="Views.product.pick('model','${m.name}')">${m.name}</button>`,
      )
      .join("");
  }

  function colorChips(p) {
    if (!Array.isArray(p.colors)) return "";
    return p.colors
      .map(
        (c) =>
          `<button class="chip ${current.variant.color === c.name ? "selected" : ""}"
             onclick="Views.product.pick('color','${c.name}')">${c.name}</button>`,
      )
      .join("");
  }

  function storageChips(p) {
    if (!Array.isArray(p.storages)) return "";
    return p.storages
      .map(
        (s) =>
          `<button class="chip ${current.variant.storage === s.label ? "selected" : ""}"
             onclick="Views.product.pick('storage','${s.label}')">${s.label}${s.priceDelta ? ` +${root.PriceUtils.formatPrice(s.priceDelta)}` : ""}</button>`,
      )
      .join("");
  }

  /** 切换规格后重绘：chip 选中态 + 价格联动（#buyPrice 实时刷新） */
  function repaint() {
    const p = current.product;
    document.getElementById("modelChips").innerHTML = modelChips(p);
    document.getElementById("colorChips").innerHTML = colorChips(p);
    document.getElementById("storageChips").innerHTML = storageChips(p);
    document.getElementById("buyPrice").textContent = root.PriceUtils.formatPrice(
      root.PriceUtils.resolvePrice(p, current.variant),
    );
  }

  function pick(kind, value) {
    if (!current) return;
    current.variant[kind] = value;
    repaint();
  }

  function qty(delta) {
    if (!current) return;
    const stock = current.product.stock;
    if (stock <= 0) {
      root.Store.toast("该商品暂时缺货");
      return;
    }
    // 数量步进不超过库存
    current.qty = Math.max(1, Math.min(stock, current.qty + delta));
    document.getElementById("qtyValue").textContent = String(current.qty);
  }

  async function addToCart() {
    if (!current) return;
    if (!root.Store.requireLogin()) return;
    const p = current.product;
    if (p.stock <= 0) {
      root.Store.toast("该商品暂时缺货");
      return;
    }
    try {
      const items = await root.Api.addToCart({
        productId: p.id,
        model: current.variant.model,
        color: current.variant.color,
        storage: current.variant.storage,
        qty: current.qty,
      });
      root.Store.toast(`已加入购物袋（${root.CartUtils.calcCartCount(items)} 件）`);
      await root.Store.refreshBagBadge();
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  async function favorite() {
    if (!root.Store.requireLogin()) return;
    try {
      await root.Api.toggleFavorite(current.product.id);
      root.Store.toast("已更新收藏");
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  root.Views = root.Views || {};
  root.Views.product = product;
  root.Views.product.pick = pick;
  root.Views.product.qty = qty;
  root.Views.product.addToCart = addToCart;
  root.Views.product.favorite = favorite;
})(window);
