/**
 * API 请求封装：统一前缀、注入 token、统一解包 { success, data, message }。
 */
(function (root) {
  "use strict";

  const TOKEN_KEY = "mall_token";

  async function request(path, options = {}) {
    const token = root.localStorage.getItem(TOKEN_KEY);
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    let resp;
    try {
      resp = await fetch(`/api${path}`, { ...options, headers });
    } catch {
      throw new Error("网络异常，请稍后重试");
    }
    let payload = null;
    try {
      payload = await resp.json();
    } catch {
      throw new Error(`服务端返回异常（HTTP ${resp.status}）`);
    }
    if (!resp.ok || !payload.success) {
      throw new Error(payload.message || `请求失败（HTTP ${resp.status}）`);
    }
    return payload.data;
  }

  const api = {
    token: TOKEN_KEY,
    setToken(token) {
      if (token) root.localStorage.setItem(TOKEN_KEY, token);
      else root.localStorage.removeItem(TOKEN_KEY);
    },
    getToken() {
      return root.localStorage.getItem(TOKEN_KEY);
    },
    // auth
    register: (body) => request("/auth/register", { method: "POST", body }),
    login: (body) => request("/auth/login", { method: "POST", body }),
    me: () => request("/auth/me"),
    updateMe: (body) => request("/auth/me", { method: "PUT", body }),
    // catalog
    categories: () => request("/categories"),
    products: (query = "") => request(`/products${query}`),
    product: (id) => request(`/products/${id}`),
    // cart
    cart: () => request("/cart"),
    addToCart: (body) => request("/cart", { method: "POST", body }),
    updateCartItem: (id, body) => request(`/cart/${id}`, { method: "PUT", body }),
    removeCartItem: (id) => request(`/cart/${id}`, { method: "DELETE" }),
    // orders
    orders: (query = "") => request(`/orders${query}`),
    order: (id) => request(`/orders/${id}`),
    createOrder: (body) => request("/orders", { method: "POST", body }),
    cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: "POST" }),
    // favorites
    favorites: () => request("/favorites"),
    toggleFavorite: (productId) => request(`/favorites/${productId}`, { method: "POST" }),
    // admin
    adminProducts: () => request("/admin/products"),
    createProduct: (body) => request("/admin/products", { method: "POST", body }),
    updateProduct: (id, body) => request(`/admin/products/${id}`, { method: "PUT", body }),
    setProductStatus: (id, status) => request(`/admin/products/${id}/status`, { method: "PUT", body: { status } }),
    deleteProduct: (id) => request(`/admin/products/${id}`, { method: "DELETE" }),
    createCategory: (body) => request("/admin/categories", { method: "POST", body }),
    updateCategory: (id, body) => request(`/admin/categories/${id}`, { method: "PUT", body }),
    deleteCategory: (id) => request(`/admin/categories/${id}`, { method: "DELETE" }),
    adminOrders: (query = "") => request(`/admin/orders${query}`),
    setOrderStatus: (id, status) => request(`/admin/orders/${id}/status`, { method: "PUT", body: { status } }),
  };

  root.Api = api;
})(window);
