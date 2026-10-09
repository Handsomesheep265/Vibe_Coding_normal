/**
 * JSON 文件持久化：首次启动自动用 seed.js 初始化 data/db.json。
 * 进程内缓存同一份对象，save() 时整体写回文件。
 * `node server/db.js --reset`（或 npm run seed）可随时恢复初始数据。
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const seed = require("./seed");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let cache = null;

function hashPassword(password) {
  return crypto.scryptSync(String(password), "mall-exam-salt", 32).toString("hex");
}

function buildFreshDb() {
  const users = seed.users.map((u) => ({
    id: u.id,
    account: u.account,
    passwordHash: hashPassword(u.password),
    name: u.name,
    role: u.role,
    createdAt: new Date().toISOString(),
  }));
  return {
    users,
    categories: seed.categories.map((c) => ({ ...c })),
    products: seed.products.map((p) => ({ ...p })),
    carts: seed.carts.map((c) => ({ userId: c.userId, items: c.items.map((i) => ({ ...i })) })),
    orders: seed.orders.map((o) => ({ ...o })),
    favorites: seed.favorites.map((f) => ({ userId: f.userId, productIds: [...f.productIds] })),
    seq: { order: 20260901002, cartItem: 201 },
  };
}

function writeFile(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function readOrInit() {
  if (!fs.existsSync(DB_FILE)) {
    const db = buildFreshDb();
    writeFile(db);
    return db;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (err) {
    console.error("[db] db.json 解析失败，已重置为初始数据：", err.message);
    const db = buildFreshDb();
    writeFile(db);
    return db;
  }
}

/** 取进程内共享的数据对象（首次调用时从文件加载或初始化） */
function load() {
  if (!cache) cache = readOrInit();
  return cache;
}

/** 写回文件；不传参数时写缓存对象 */
function save(db) {
  writeFile(db || cache);
}

/** 恢复初始种子数据 */
function reset() {
  cache = buildFreshDb();
  writeFile(cache);
  return cache;
}

if (require.main === module) {
  reset();
  console.log("[db] 已重置 data/db.json");
}

module.exports = { load, save, reset, hashPassword, DB_FILE };
