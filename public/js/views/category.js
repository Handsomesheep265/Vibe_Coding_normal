/** 产品分类页：分类介绍 + 该分类产品列表 */
(function (root) {
  "use strict";

  async function category(params) {
    const [categories, products] = await Promise.all([
      root.Api.categories(),
      root.Api.products(`?categoryId=${params.id}`),
    ]);
    const cat = categories.find((c) => c.id === Number(params.id));
    const cards = products
      .map(
        (p) => `
        <div class="card product-card">
          <a href="#/product/${p.id}"><div class="thumb">${p.image}</div></a>
          <h3><a href="#/product/${p.id}">${p.name}</a></h3>
          <p class="muted">${p.tagline || ""}</p>
          <p class="price">${root.PriceUtils.formatPrice(p.basePrice)} 起</p>
          <p class="muted">库存 ${p.stock}</p>
        </div>`,
      )
      .join("");
    return `
      <h1 class="page-title">${cat ? cat.name : "分类"}</h1>
      <p class="page-sub">${cat ? cat.intro || "" : ""}</p>
      <div class="grid">${cards || '<div class="empty">该分类下暂无商品</div>'}</div>`;
  }

  root.Views = root.Views || {};
  root.Views.category = category;
})(window);
