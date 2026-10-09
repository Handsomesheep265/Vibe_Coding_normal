/**
 * hash 路由：#/、#/store、#/category/:id、#/product/:id、#/bag、#/orders、
 * #/favorites、#/account、#/admin/products、#/admin/orders
 */
(function (root) {
  "use strict";

  const routes = [];
  const notFound = () => `<div class="empty">页面不存在</div>`;

  function match(pattern, path) {
    const p = pattern.split("/").filter(Boolean);
    const s = path.split("/").filter(Boolean);
    if (p.length !== s.length) return null;
    const params = {};
    for (let i = 0; i < p.length; i++) {
      if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(s[i]);
      else if (p[i] !== s[i]) return null;
    }
    return params;
  }

  function on(pattern, handler) {
    routes.push({ pattern, handler });
  }

  async function render() {
    const app = document.getElementById("app");
    const hash = root.location.hash.replace(/^#/, "") || "/";
    const path = hash.split("?")[0];
    for (const r of routes) {
      const params = match(r.pattern, path);
      if (params) {
        document.querySelectorAll("[data-route]").forEach((a) => {
          const href = a.getAttribute("href") || "";
          a.classList.toggle("active", href === `#${hash}`);
        });
        try {
          app.innerHTML = await r.handler(params);
        } catch (err) {
          app.innerHTML = `<div class="error-box">${err.message}</div>`;
        }
        return;
      }
    }
    app.innerHTML = notFound();
  }

  function start() {
    root.addEventListener("hashchange", render);
    render();
  }

  root.Router = { on, start, render };
})(window);
