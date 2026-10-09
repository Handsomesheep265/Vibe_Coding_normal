/** 应用启动：注册路由、恢复登录态、刷新角标 */
(function (root) {
  "use strict";

  const { on, start } = root.Router;
  const V = root.Views;

  on("/", V.home);
  on("/store", V.store);
  on("/category/:id", V.category);
  on("/product/:id", V.product);
  on("/bag", V.bag);
  on("/orders", V.orders);
  on("/favorites", V.favorites);
  on("/account", V.account);
  on("/admin/products", V.adminProducts);
  on("/admin/orders", V.adminOrders);

  document.addEventListener("DOMContentLoaded", async () => {
    await root.Store.refreshUser();
    root.Store.onChange(() => {
      const navAdmin = document.getElementById("navAdmin");
      if (navAdmin) navAdmin.hidden = !(root.Store.state.user && root.Store.state.user.role === "admin");
    });
    await root.Store.refreshBagBadge();
    start();
  });
})(window);
