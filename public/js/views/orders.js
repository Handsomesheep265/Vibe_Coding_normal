/** 订单：列表 + 详情 + 取消未付款 */
(function (root) {
  "use strict";

  async function orders() {
    if (!root.Store.requireLogin()) return "";
    let list = [];
    try {
      list = await root.Api.orders();
    } catch (err) {
      return `<div class="error-box">${err.message}</div>`;
    }
    if (list.length === 0) {
      return `<h1 class="page-title">订单</h1><div class="empty">还没有订单，<a href="#/store">去选购</a></div>`;
    }
    const cards = list
      .map(
        (o) => `
        <div class="card order-card">
          <div class="order-head">
            <span>订单号 ${o.id}</span>
            <span>${new Date(o.createdAt).toLocaleString("zh-CN")}</span>
          </div>
          ${o.items
            .map(
              (i) =>
                `<div class="row" style="justify-content:space-between;padding:6px 0">
                   <span>${i.image} ${i.name} <span class="muted">${i.model} / ${i.color} / ${i.storage}</span></span>
                   <span>${root.PriceUtils.formatPrice(i.unitPrice)} × ${i.qty}</span>
                 </div>`,
            )
            .join("")}
          <div class="row" style="justify-content:space-between;margin-top:10px">
            <span class="status-tag s-${o.status}">${o.status}</span>
            <span>合计 <strong>${root.PriceUtils.formatPrice(o.total)}</strong></span>
          </div>
          <div class="muted" style="margin-top:6px">收货人：${o.address.receiver} ${o.address.phone}｜${o.address.detail}</div>
          ${o.status === "待付款" ? `<div class="row" style="margin-top:10px"><button class="btn btn-sm btn-danger" onclick="Views.orders.cancel(${o.id})">取消订单</button></div>` : ""}
        </div>`,
      )
      .join("");
    return `<h1 class="page-title">订单</h1>${cards}`;
  }

  async function cancel(orderId) {
    try {
      await root.Api.cancelOrder(orderId);
      root.Store.toast("订单已取消");
      root.Router.render();
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  root.Views = root.Views || {};
  root.Views.orders = orders;
  root.Views.orders.cancel = cancel;
})(window);
