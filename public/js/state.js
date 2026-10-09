/**
 * 极简全局状态：当前登录用户 + 购物袋角标 + toast。
 */
(function (root) {
  "use strict";

  const state = {
    user: null, // { id, account, name, role }
  };

  const listeners = [];

  function emit() {
    listeners.forEach((fn) => fn(state));
  }

  function setUser(user) {
    state.user = user;
    emit();
  }

  async function refreshUser() {
    if (!root.Api.getToken()) {
      setUser(null);
      return null;
    }
    try {
      const user = await root.Api.me();
      setUser(user);
      return user;
    } catch {
      root.Api.setToken(null);
      setUser(null);
      return null;
    }
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  async function refreshBagBadge() {
    const badges = [document.getElementById("bagBadge"), document.getElementById("bagBadgeTop")];
    if (!root.Api.getToken()) {
      badges.forEach((b) => b && b.setAttribute("hidden", ""));
      return;
    }
    try {
      const items = await root.Api.cart();
      const count = root.CartUtils.calcCartCount(items);
      badges.forEach((b) => {
        if (!b) return;
        b.textContent = String(count);
        if (count > 0) b.removeAttribute("hidden");
        else b.setAttribute("hidden", "");
      });
    } catch {
      badges.forEach((b) => b && b.setAttribute("hidden", ""));
    }
  }

  let toastTimer = null;
  function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.removeAttribute("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.setAttribute("hidden", ""), 2200);
  }

  function requireLogin() {
    if (!state.user) {
      root.location.hash = "#/account";
      toast("请先登录");
      return false;
    }
    return true;
  }

  root.Store = { state, setUser, refreshUser, onChange, refreshBagBadge, toast, requireLogin };
})(window);
