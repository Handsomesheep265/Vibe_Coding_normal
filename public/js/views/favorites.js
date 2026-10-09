/** 收藏：收藏列表 + 取消收藏 + 进入购买页 */
(function (root) {
  "use strict";

  async function favorites() {
    if (!root.Store.requireLogin()) return "";
    let products = [];
    try {
      products = await root.Api.favorites();
    } catch (err) {
      return `<div class="error-box">${err.message}</div>`;
    }
    if (products.length === 0) {
      return `<h1 class="page-title">收藏</h1><div class="empty">还没有收藏商品</div>`;
    }
    const cards = products
      .map(
        (p) => `
        <div class="card product-card">
          <a href="#/product/${p.id}"><div class="thumb">${p.image}</div></a>
          <h3><a href="#/product/${p.id}">${p.name}</a></h3>
          <p class="price">${root.PriceUtils.formatPrice(p.basePrice)}</p>
          <div class="row">
            <button class="btn btn-sm" onclick="location.hash='#/product/${p.id}'">购买</button>
            <button class="btn btn-sm btn-plain" onclick="Views.favorites.remove(${p.id})">取消收藏</button>
          </div>
        </div>`,
      )
      .join("");
    return `<h1 class="page-title">收藏</h1><div class="grid">${cards}</div>`;
  }

  async function remove(productId) {
    try {
      await root.Api.toggleFavorite(productId);
      root.Router.render();
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  root.Views = root.Views || {};
  root.Views.favorites = favorites;
  root.Views.favorites.remove = remove;
})(window);
