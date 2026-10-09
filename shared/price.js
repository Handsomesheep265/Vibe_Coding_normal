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
   * 取规格项的差价：找不到该项、或该项没有合法差价时按 0 计。
   * 型号与颜色的字段名是 `name`，容量是 `label`，这里两者都接受，避免因字段名不一致而算错价。
   *
   * @param {Array<object>} list 规格列表（models / storages）
   * @param {string|undefined} value 已选规格值
   * @returns {number} 差价（分）
   */
  function findDelta(list, value) {
    if (!Array.isArray(list) || value === undefined || value === null) return 0;
    const hit = list.find((item) => item && (item.label === value || item.name === value));
    if (!hit) return 0;
    const delta = Number(hit.priceDelta);
    return Number.isFinite(delta) ? delta : 0;
  }

  /**
   * 按所选规格解析商品单价（分）
   *
   * 价格规则：商品基础价 + 型号差价 + 容量差价；颜色不影响价格。
   *   resolvePrice({ basePrice: 899900, models: [{name:"Pro", priceDelta: 0}],
   *                  storages: [{label:"512GB", priceDelta: 80000}] },
   *                { model: "Pro", storage: "512GB" }) === 979900
   *
   * 找不到对应规格项时该部分差价按 0 计；规格字段缺省不抛错。
   *
   * @param {object} product 商品对象
   * @param {{model?: string, color?: string, storage?: string}} variant 已选规格
   * @returns {number} 单价（分）
   */
  function resolvePrice(product, variant) {
    if (!product || typeof product !== "object") return 0;
    const base = Number(product.basePrice);
    const basePrice = Number.isFinite(base) ? base : 0;
    const picked = variant && typeof variant === "object" ? variant : {};
    // 颜色不参与定价（见任务二"范围外"），因此只累加型号与容量差价。
    return basePrice + findDelta(product.models, picked.model) + findDelta(product.storages, picked.storage);
  }

  return { formatPrice, resolvePrice };
});
