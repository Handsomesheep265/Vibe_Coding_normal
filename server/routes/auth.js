/** 注册 / 登录 / 当前用户 */
"use strict";

const express = require("express");
const crypto = require("crypto");
const { load, save, hashPassword } = require("../db");
const { issueToken, requireAuth } = require("../auth");
const { ok, fail } = require("../respond");

const router = express.Router();

router.post("/register", (req, res) => {
  const { account, password, name } = req.body || {};
  if (!account || !/^\d{4,20}$/.test(account)) {
    return fail(res, 400, "账号需为 4-20 位数字");
  }
  if (!password || String(password).length < 6) {
    return fail(res, 400, "密码至少 6 位");
  }
  const db = load();
  if (db.users.some((u) => u.account === account)) {
    return fail(res, 409, "账号已存在");
  }
  const user = {
    id: db.users.length ? Math.max(...db.users.map((u) => u.id)) + 1 : 1,
    account,
    passwordHash: hashPassword(password),
    name: name || `用户${account.slice(-4)}`,
    role: "student",
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  save(db);
  return ok(res, { id: user.id, account: user.account, name: user.name, role: user.role }, 201);
});

router.post("/login", (req, res) => {
  const { account, password } = req.body || {};
  if (!account || !password) {
    return fail(res, 400, "账号和密码不能为空");
  }
  const db = load();
  const user = db.users.find((u) => u.account === account);
  const hash = hashPassword(password);
  if (!user || !crypto.timingSafeEqual(Buffer.from(user.passwordHash), Buffer.from(hash))) {
    return fail(res, 401, "账号或密码错误");
  }
  return ok(res, {
    token: issueToken(user),
    user: { id: user.id, account: user.account, name: user.name, role: user.role },
  });
});

router.get("/me", requireAuth, (req, res) => {
  const db = load();
  const user = db.users.find((u) => u.id === req.currentUser.id);
  if (!user) return fail(res, 404, "用户不存在");
  return ok(res, {
    id: user.id,
    account: user.account,
    name: user.name,
    role: user.role,
  });
});

router.put("/me", requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) {
    return fail(res, 400, "昵称不能为空");
  }
  const db = load();
  const user = db.users.find((u) => u.id === req.currentUser.id);
  if (!user) return fail(res, 404, "用户不存在");
  user.name = String(name).trim();
  save(db);
  return ok(res, { id: user.id, account: user.account, name: user.name, role: user.role });
});

module.exports = router;
