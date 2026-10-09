/**
 * 商品购买页：规格选择（型号/颜色/容量）+ 价格联动 + 库存状态 + 加入购物袋。
 *
 * 考核任务二在本页面体现：切换规格时价格应随规格变化（当前未联动）。
 */
(function (root) {
  "use strict";

  // 当前视图正在查看的商品与已选规格
  let current = null;

  async function product(params) {
    const p = await root.Api.product(params.id);
    current = { product: p, variant: defaultVariant(p), qty: 1 };
    const user = root.Store.state.user;
    return `
      <div class="buy-layout">
        <div class="buy-preview">${p.image}</div>
        <div class="buy-info">
          <h1>${p.name}</h1>
          <p class="muted">${p.tagline || ""}</p>
          <p class="buy-price" id="buyPrice">${root.PriceUtils.formatPrice(root.PriceUtils.resolvePrice(p, current.variant))}</p>
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
          <p class="stock-hint" id="stockHint">库存 ${p.stock} 件</p>
          <div class="row" style="margin:18px 0">
            <div class="qty-ctrl">
              <button onclick="Views.product.qty(-1)">-</button>
              <span id="qtyValue">1</span>
              <button onclick="Views.product.qty(1)">+</button>
            </div>
          </div>
          <div class="row">
            <button class="btn" id="addBagBtn" onclick="Views.product.addToCart()">加入购物袋</button>
            <button class="btn btn-plain" onclick="Views.product.favorite()">${user ? "收藏" : "登录后可收藏"}</button>
          </div>
        </div>
      </div>`;
  }

  function defaultVariant(p) {
    return { model: p.models[0].name, color: p.colors[0].name, storage: p.storages[0].name };
  }

  function modelChips(p) {
    return p.models
      .map(
        (m) =>
          `<button class="chip ${current.variant.model === m.name ? "selected" : ""}"
             onclick="Views.product.pick('model','${m.name}')">${m.name}</button>`,
      )
      .join("");
  }

  function colorChips(p) {
    return p.colors
      .map(
        (c) =>
          `<button class="chip ${current.variant.color === c.name ? "selected" : ""}"
             onclick="Views.product.pick('color','${c.name}')">${c.name}</button>`,
      )
      .join("");
  }

  function storageChips(p) {
    return p.storages
      .map(
        (s) =>
          `<button class="chip ${current.variant.storage === s.label ? "selected" : ""}"
             onclick="Views.product.pick('storage','${s.label}')">${s.label}${s.priceDelta ? ` +${root.PriceUtils.formatPrice(s.priceDelta)}` : ""}</button>`,
      )
      .join("");
  }

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
    current.qty = Math.max(1, Math.min(current.product.stock || 1, current.qty + delta));
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
