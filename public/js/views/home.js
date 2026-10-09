/** 首页：hero + 推荐商品 */
(function (root) {
  "use strict";

  async function home() {
    let products = [];
    try {
      products = await root.Api.products("?recommend=true");
    } catch { /* 首页推荐失败不阻塞渲染 */ }
    const cards = products
      .map(
        (p) => `
        <a class="showcase" href="#/product/${p.id}">
          <div class="emoji">${p.image}</div>
          <h3>${p.name}</h3>
          <p class="muted">${p.tagline || ""}</p>
          <p class="price">${root.PriceUtils.formatPrice(p.basePrice)} 起</p>
        </a>`,
      )
      .join("");
    return `
      <section class="hero">
        <h1>LumiStore</h1>
        <p>科技产品展示与商城 · 考核基座演示</p>
        <a class="btn" href="#/store">进入商店</a>
      </section>
      <h2 class="page-title" style="margin-top:36px">推荐商品</h2>
      <div class="showcase-row">${cards || '<div class="empty">暂无推荐商品</div>'}</div>`;
  }

  root.Views = root.Views || {};
  root.Views.home = home;
})(window);
