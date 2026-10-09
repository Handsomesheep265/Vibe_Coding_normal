/**
 * 服务入口：express + 静态前端 + REST API。
 * 开发：npm start  → http://localhost:3000
 */
"use strict";

const express = require("express");
const path = require("path");

const { load } = require("./db");
const { attachUser, requireAuth } = require("./auth");

const authRoutes = require("./routes/auth");
const catalogRoutes = require("./routes/catalog");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const favoriteRoutes = require("./routes/favorites");
const adminRoutes = require("./routes/admin");

const app = express();
app.use(express.json({ limit: "1mb" }));

const db = load();
app.use(attachUser((id) => db.users.find((u) => u.id === id)));

// API
app.use("/api/auth", authRoutes);
app.use("/api", catalogRoutes); // catalog 内部自带 /categories 与 /products 前缀
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => res.json({ success: true, data: { status: "up" } }));

// 前后端共享模块（页面通过 <script src="/shared/price.js"> 引入）
app.use("/shared", express.static(path.join(__dirname, "..", "shared")));

// 静态前端
app.use(express.static(path.join(__dirname, "..", "public")));

// 404（API）与 SPA 回退
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "接口不存在" });
});
app.get(/^\/(?!api|shared).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// 统一错误处理
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[server] 未处理错误：", err);
  res.status(500).json({ success: false, message: "服务器内部错误" });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`[server] 商城已启动: http://localhost:${port}`);
  });
}

module.exports = { app, requireAuth };
