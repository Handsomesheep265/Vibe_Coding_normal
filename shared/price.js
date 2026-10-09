/**
 * 价格工具（前后端共享）
 *
 * 通过 <script src="/shared/price.js"> 暴露 window.PriceUtils；
 * 服务端通过 require("../../shared/price") 使用。两端必须是同一份实现，
 * 避免"页面显示一个价、下单扣另一个价"。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PriceUtils = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * 分为单位的金额格式化为 "¥1,299.00"
   * @param {number} cents 整数分
   * @returns {string}
   */
  function formatPrice(cents) {
    if (!Number.isFinite(cents)) return "¥0.00";
    const negative = cents < 0;
    const abs = Math.abs(Math.round(cents));
    const yuan = Math.floor(abs / 100);
    const fen = abs % 100;
    const grouped = String(yuan).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (negative ? "-¥" : "¥") + grouped + "." + String(fen).padStart(2, "0");
  }

  /**
   * 按所选规格解析商品单价（分）
   *
   * 价格规则：商品基础价 + 型号差价 + 容量差价。
   *   resolvePrice({ basePrice: 899900, models: [{name:"Pro", priceDelta: 0}],
   *                  storages: [{label:"512GB", priceDelta: 80000}] },
   *                { model: "Pro", storage: "512GB" }) === 979900
   *
   * @param {object} product 商品对象
   * @param {{model?: string, color?: string, storage?: string}} variant 已选规格
   * @returns {number} 单价（分）
   */
  function resolvePrice(product, variant) {
    // TODO(考核): 规格差价尚未实现——目前任何规格都返回商品基础价。
    // 需求见《01-题目文档.md》任务二。
    return product.basePrice;
  }

  return { formatPrice, resolvePrice };
});
