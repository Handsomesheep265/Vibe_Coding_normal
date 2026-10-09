/** 账户中心：未登录显示登录/注册，已登录显示资料/收藏/订单入口 */
(function (root) {
  "use strict";

  let mode = "login"; // login | register

  async function account() {
    if (root.Store.state.user) {
      const u = root.Store.state.user;
      return `
        <h1 class="page-title">账户中心</h1>
        <div class="card" style="max-width:520px">
          <div class="field"><label>账号</label><input value="${u.account}" disabled /></div>
          <div class="field"><label>昵称</label><input id="profileName" value="${u.name}" /></div>
          <div class="row">
            <button class="btn" onclick="Views.account.save()">保存资料</button>
            <button class="btn btn-plain" onclick="location.hash='#/favorites'">我的收藏</button>
            <button class="btn btn-plain" onclick="location.hash='#/orders'">我的订单</button>
            <button class="btn btn-danger" onclick="Views.account.logout()">退出登录</button>
          </div>
        </div>`;
    }
    const isLogin = mode === "login";
    return `
      <div class="card form-card">
        <h1 class="page-title" style="text-align:center">${isLogin ? "登录" : "注册"}</h1>
        <div class="field"><label>账号（4-20 位数字）</label><input id="authAccount" placeholder="请输入账号" /></div>
        <div class="field"><label>密码（至少 6 位）</label><input id="authPassword" type="password" placeholder="请输入密码" /></div>
        ${isLogin ? "" : '<div class="field"><label>昵称</label><input id="authName" placeholder="选填" /></div>'}
        <div class="form-error" id="authError"></div>
        <button class="btn" style="width:100%" onclick="Views.account.submit()">${isLogin ? "登录" : "注册"}</button>
        <p class="muted" style="text-align:center;margin-top:14px">
          ${isLogin ? "还没有账号？" : "已有账号？"}
          <a href="javascript:Views.account.switchMode('${isLogin ? "register" : "login"}')" style="color:var(--accent)">${isLogin ? "去注册" : "去登录"}</a>
        </p>
        <p class="muted" style="text-align:center">演示账号：3001 / 123456（学生）· admin / admin123（管理员）</p>
      </div>`;
  }

  function switchMode(next) {
    mode = next;
    root.Router.render();
  }

  async function submit() {
    const account = document.getElementById("authAccount").value.trim();
    const password = document.getElementById("authPassword").value;
    const errorEl = document.getElementById("authError");
    const name = document.getElementById("authName") ? document.getElementById("authName").value.trim() : "";
    errorEl.textContent = "";
    try {
      if (mode === "register") {
        await root.Api.register({ account, password, name });
        root.Store.toast("注册成功，请登录");
        switchMode("login");
        return;
      }
      const data = await root.Api.login({ account, password });
      root.Api.setToken(data.token);
      await root.Store.refreshUser();
      await root.Store.refreshBagBadge();
      root.Store.toast("登录成功");
      root.Router.render();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  }

  async function save() {
    const name = document.getElementById("profileName").value.trim();
    if (!name) {
      root.Store.toast("昵称不能为空");
      return;
    }
    try {
      const user = await root.Api.updateMe({ name });
      root.Store.setUser({ ...root.Store.state.user, name: user.name });
      root.Store.toast("已保存");
    } catch (err) {
      root.Store.toast(err.message);
    }
  }

  function logout() {
    root.Api.setToken(null);
    root.Store.setUser(null);
    root.Store.toast("已退出登录");
    root.Router.render();
  }

  root.Views = root.Views || {};
  root.Views.account = account;
  root.Views.account.switchMode = switchMode;
  root.Views.account.submit = submit;
  root.Views.account.save = save;
  root.Views.account.logout = logout;
})(window);
