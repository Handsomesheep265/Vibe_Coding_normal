/** 后台：商品管理（列表 / 新增 / 编辑 / 上下架 / 删除） */
(function (root) {
  "use strict";

  async function adminProducts() {
    if (!root.Store.state.user || root.Store.state.user.role !== "admin") {
      return `<div class="error-box">无权限：仅管理员可访问后台</div>`;
    }
    let products = [];
    try {
      products = await root.Api.adminProducts();
    } catch (err) {
      return `<div class="error-box">${err.message}</div>`;
    }
    const rows = products
      .map(
        (p) => `
        <tr>
          <td>${p.id}</td>
          <td>${p.image} ${p.name}</td>
          <td>${root.PriceUtils.formatPrice(p.basePrice)}</td>
          <td>${p.stock}</td>
          <td>${p.status === "on" ? "在售" : "已下架"}</td>
          <td>
            <button class="btn btn-sm btn-plain" onclick="Views.adminProducts.toggle(${p.id}, '${p.status === "on" ? "off" : "on"}')">${p.status === "on" ? "下架" : "上架"}</button>
            <button class="btn btn-sm" onclick="Views.adminProducts.load(${p.id})">改库存/价</button>
            <button class="btn btn-sm btn-danger" onclick="Views.adminProducts.remove(${p.id})">删除</button>
          </td>
        </tr>`,
      )
      .join("");
    return `
      <h1 class="page-title">后台 · 商品管理</h1>
      <div class="admin-layout">
        <nav class="admin-menu">
          <a href="#/admin/products" class="active">商品管理</a>
          <a href="#/admin/orders">订单管理</a>
          <a href="#/store">返回商店</a>
        </nav>
        <div>
          <div class="card" style="margin-bottom:18px">
            <h3 id="formTitle">修改价格 / 库存</h3>
            <input type="hidden" id="pId" />
            <div class="row" style="flex-wrap:wrap">
              <div class="field"><label>商品名称（新增时必填）</label><input id="pName" style="width:180px" /></div>
              <div class="field"><label>基础价（分）</label><input id="pPrice" type="number" style="width:120px" /></div>
              <div class="field"><label>库存</label><input id="pStock" type="number" style="width:100px" /></div>
              <div class="field"><label>Emoji 图标</label><input id="pImage" style="width:80px" /></div>
              <button class="btn" style="align-self:flex-end" onclick="Views.adminProducts.save()">保存</button>
            </div>
          </div>
          <table class="table">
            <thead><tr><th>ID</th><th>商品</th><th>基础价</th><th>库存</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  async function load(id) {
    const p = (await root.Api.adminProducts()).find((x) => x.id === id);
    if (!p) return;
    document.getElementById("formTitle").textContent = `修改：${p.name}`;
    document.getElementById("pId").value = String(p.id);
    document.getElementById("pName").value = p.name;
    document.getElementById("pPrice").value = String(p.basePrice);
    document.getElementById("pStock").value = String(p.stock);
    document.getElementById("pImage").value = p.image;
  }

  async function save() {
    const id = document.getElementById("pId").value;
    const body = {
      name: document.getElementById("pName").value,
      basePrice: Number(document.getElementById("pPrice").value),
      stock: Number(document.getElementById("pStock").value),
      image: document.getElementById("pImage").value,
    };
    try {
      if (id) {
        await root.Api.updateProduct(Number(id), body);
      } else {
        await root.Api.createProduct(body);
      }
      root.Store.toast("已保存");
      root.Router.render();
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  async function toggle(id, status) {
    try {
      await root.Api.setProductStatus(id, status);
      root.Router.render();
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  async function remove(id) {
    if (!confirm("确认删除该商品？")) return;
    try {
      await root.Api.deleteProduct(id);
      root.Router.render();
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  root.Views = root.Views || {};
  root.Views.adminProducts = adminProducts;
  root.Views.adminProducts.load = load;
  root.Views.adminProducts.save = save;
  root.Views.adminProducts.toggle = toggle;
  root.Views.adminProducts.remove = remove;

  /** 后台：订单管理（列表 / 按状态筛选 / 改状态） */
  async function adminOrders() {
    if (!root.Store.state.user || root.Store.state.user.role !== "admin") {
      return `<div class="error-box">无权限：仅管理员可访问后台</div>`;
    }
    let list = [];
    try {
      list = await root.Api.adminOrders();
    } catch (err) {
      return `<div class="error-box">${err.message}</div>`;
    }
    const rows = list
      .map(
        (o) => `
        <tr>
          <td>${o.id}</td>
          <td>${o.items.map((i) => `${i.name}×${i.qty}`).join("，")}</td>
          <td>${root.PriceUtils.formatPrice(o.total)}</td>
          <td>${o.address.receiver} ${o.address.phone}</td>
          <td>${o.status}</td>
          <td>
            <select onchange="Views.adminOrders.setStatus(${o.id}, this.value)">
              ${["待付款", "已完成", "已取消"]
                .map((s) => `<option ${s === o.status ? "selected" : ""}>${s}</option>`)
                .join("")}
            </select>
          </td>
        </tr>`,
      )
      .join("");
    return `
      <h1 class="page-title">后台 · 订单管理</h1>
      <div class="admin-layout">
        <nav class="admin-menu">
          <a href="#/admin/products">商品管理</a>
          <a href="#/admin/orders" class="active">订单管理</a>
          <a href="#/store">返回商店</a>
        </nav>
        <table class="table">
          <thead><tr><th>订单号</th><th>商品</th><th>金额</th><th>收货人</th><th>状态</th><th>修改状态</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6">暂无订单</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  async function setOrderStatus(orderId, status) {
    try {
      await root.Api.setOrderStatus(orderId, status);
      root.Store.toast("状态已更新");
      root.Router.render();
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  root.Views.adminOrders = adminOrders;
  root.Views.adminOrders.setStatus = setOrderStatus;
})(window);
