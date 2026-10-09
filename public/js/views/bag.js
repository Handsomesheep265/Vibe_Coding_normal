/**
 * 购物袋：勾选/改数量/删除/合计/结算。
 *
 * 考核任务一本页面体现：取消勾选后"总计"仍应只统计已勾选商品。
 */
(function (root) {
  "use strict";

  async function bag() {
    if (!root.Store.requireLogin()) return "";
    let items = [];
    try {
      items = await root.Api.cart();
    } catch (err) {
      return `<div class="error-box">${err.message}</div>`;
    }
    if (items.length === 0) {
      return `<h1 class="page-title">购物袋</h1><div class="empty">购物袋是空的，<a href="#/store">去逛逛</a></div>`;
    }
    const rows = items
      .map(
        (i) => `
        <tr>
          <td><input type="checkbox" ${i.selected ? "checked" : ""} onchange="Views.bag.toggle(${i.id}, this.checked)" /></td>
          <td>${i.image} ${i.name}<br><span class="muted">${i.model} / ${i.color} / ${i.storage}</span></td>
          <td>${root.PriceUtils.formatPrice(i.unitPrice)}</td>
          <td>
            <div class="qty-ctrl">
              <button onclick="Views.bag.qty(${i.id}, -1)">-</button>
              <span>${i.qty}</span>
              <button onclick="Views.bag.qty(${i.id}, 1)">+</button>
            </div>
          </td>
          <td>${root.PriceUtils.formatPrice(i.unitPrice * i.qty)}</td>
          <td><button class="btn btn-sm btn-plain" onclick="Views.bag.remove(${i.id})">删除</button></td>
        </tr>`,
      )
      .join("");
    const total = root.CartUtils.calcSelectedTotal(items);
    const selectedCount = items.filter((i) => i.selected).length;
    return `
      <h1 class="page-title">购物袋</h1>
      <table class="bag-table">
        <thead><tr><th></th><th>商品</th><th>单价</th><th>数量</th><th>小计</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="bag-summary">
        <span class="muted">已选 ${selectedCount} 件</span>
        <span>总计 <span class="total" id="bagTotal">${root.PriceUtils.formatPrice(total)}</span></span>
        <button class="btn" onclick="Views.bag.checkout()">结算</button>
      </div>
      <div class="card" style="margin-top:24px">
        <h3>收货信息</h3>
        <div class="row" style="flex-wrap:wrap">
          <div class="field"><label>收货人</label><input id="addrReceiver" value="${root.Store.state.user ? root.Store.state.user.name : ""}" /></div>
          <div class="field"><label>手机号</label><input id="addrPhone" placeholder="11 位手机号" /></div>
          <div class="field" style="flex:1"><label>详细地址</label><input id="addrDetail" placeholder="街道/楼栋/房间" /></div>
        </div>
      </div>`;
  }

  async function reload() {
    document.getElementById("app").innerHTML = await bag();
    await root.Store.refreshBagBadge();
  }

  async function toggle(itemId, selected) {
    try {
      const items = await root.Api.updateCartItem(itemId, { selected });
      document.getElementById("bagTotal").textContent = root.PriceUtils.formatPrice(root.CartUtils.calcSelectedTotal(items));
      document.querySelectorAll(".bag-summary .muted").forEach((el) => {
        el.textContent = `已选 ${items.filter((i) => i.selected).length} 件`;
      });
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  async function qty(itemId, delta) {
    try {
      const items = await root.Api.cart();
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      const next = item.qty + delta;
      if (next < 1) {
        root.Store.toast("数量至少为 1，如需删除请点删除");
        return;
      }
      const updated = await root.Api.updateCartItem(itemId, { qty: next });
      document.getElementById("bagTotal").textContent = root.PriceUtils.formatPrice(root.CartUtils.calcSelectedTotal(updated));
      await root.Store.refreshBagBadge();
      await reload();
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  async function remove(itemId) {
    try {
      await root.Api.removeCartItem(itemId);
      await reload();
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  async function checkout() {
    const receiver = document.getElementById("addrReceiver").value.trim();
    const phone = document.getElementById("addrPhone").value.trim();
    const detail = document.getElementById("addrDetail").value.trim();
    if (!receiver || !phone || !detail) {
      root.Store.toast("请完整填写收货信息");
      return;
    }
    try {
      const order = await root.Api.createOrder({ address: { receiver, phone, detail } });
      root.Store.toast(`下单成功，订单号 ${order.id}`);
      location.hash = "#/orders";
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  root.Views = root.Views || {};
  root.Views.bag = bag;
  root.Views.bag.toggle = toggle;
  root.Views.bag.qty = qty;
  root.Views.bag.remove = remove;
  root.Views.bag.checkout = checkout;
})(window);
