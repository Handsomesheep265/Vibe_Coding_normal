/**
 * 购物袋计算（前后端共享）
 *
 * 购物袋条目结构：{ id, productId, name, image, model, color, storage,
 *                   unitPrice /* 分 * /, qty, selected }
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.CartUtils = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * 购物袋商品总件数（角标用）
   * @param {Array<object>} items
   * @returns {number}
   */
  function calcCartCount(items) {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }

  /**
   * 勾选商品合计金额（分）
   *
   * 购物袋页面"总计"只应统计**已勾选**的商品：合计 = Σ(单价 × 数量)。
   * 未勾选（selected !== true）的条目一律不计入。
   *
   * @param {Array<object>} items 购物袋条目（含 unitPrice / qty / selected）
   * @returns {number} 合计（分）
   */
  function calcSelectedTotal(items) {
    if (!Array.isArray(items)) return 0;
    // 修复(任务一)：原先这里对所有条目直接求和，漏掉了 selected 判断，
    // 导致未勾选的商品也被计入"总计"。这里补上勾选过滤——只累加 selected === true 的条目。
    return items.reduce(
      (sum, item) =>
        item && item.selected === true
          ? sum + (Number(item.unitPrice) || 0) * (Number(item.qty) || 0)
          : sum,
      0,
    );
  }

  return { calcCartCount, calcSelectedTotal };
});
