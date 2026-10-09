/** 商店页：分类筛选 + 搜索 + 商品卡片列表 */
(function (root) {
  "use strict";

  let activeCategory = 0;
  let keyword = "";

  async function store() {
    const [categories, products] = await Promise.all([
      root.Api.categories(),
      root.Api.products(buildQuery()),
    ]);
    const chips = [
      `<button class="chip ${activeCategory === 0 ? "selected" : ""}" onclick="Views.store.setCategory(0)">全部</button>`,
      ...categories.map(
        (c) => `<button class="chip ${activeCategory === c.id ? "selected" : ""}" onclick="Views.store.setCategory(${c.id})">${c.name}</button>`,
      ),
    ].join("");
    const cards = products
      .map(
        (p) => `
        <div class="card product-card">
          <a href="#/product/${p.id}"><div class="thumb">${p.image}</div></a>
          <h3><a href="#/product/${p.id}">${p.name}</a></h3>
          <p class="muted">${p.tagline || ""}</p>
          <p class="price">${root.PriceUtils.formatPrice(p.basePrice)} 起</p>
          <button class="btn btn-sm" onclick="location.hash='#/product/${p.id}'">购买</button>
        </div>`,
      )
      .join("");
    return `
      <h1 class="page-title">商店</h1>
      <div class="row" style="margin-bottom:18px;flex-wrap:wrap">
        <div class="chips">${chips}</div>
        <input id="storeSearch" placeholder="搜索商品" value="${keyword}"
          style="margin-left:auto;padding:8px 12px;border:1px solid var(--line);border-radius:999px"
          onkeydown="if(event.key==='Enter')Views.store.search(this.value)" />
      </div>
      <div class="grid">${cards || '<div class="empty">没有符合条件的商品</div>'}</div>`;
  }

  function buildQuery() {
    const params = new URLSearchParams();
    if (activeCategory) params.set("categoryId", String(activeCategory));
    if (keyword) params.set("keyword", keyword);
    const s = params.toString();
    return s ? `?${s}` : "";
  }

  function setCategory(id) {
    activeCategory = Number(id);
    root.Router.render();
  }

  function search(value) {
    keyword = String(value || "").trim();
    root.Router.render();
  }

  root.Views = root.Views || {};
  root.Views.store = store;
  root.Views.store.setCategory = setCategory;
  root.Views.store.search = search;
})(window);
