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
   *
   * @param {Array<object>} items 购物袋条目（含 unitPrice / qty / selected）
   * @returns {number} 合计（分）
   */
  function calcSelectedTotal(items) {
    if (!Array.isArray(items)) return 0;
    // BUG(考核): 这里忽略了条目的 selected 状态，把未勾选商品也计入了合计。
    // 需求见《01-题目文档.md》任务一。
    return items.reduce(
      (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.qty) || 0),
      0,
    );
  }

  return { calcCartCount, calcSelectedTotal };
});
