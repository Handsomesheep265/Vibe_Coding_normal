# LumiStore 商城（考核基座）

一个**科技产品展示与商城**的小型全栈项目：Node + Express + JSON 文件持久化，前端为无构建的 SPA（原生 HTML/CSS/JS）。用于「AI Coding 上机考核」——考生在此基础上完成 1 个缺陷修复、1 个功能实现和 1 组测试。

> ⚠️ 这是考核基座，**刻意保留了一个缺陷（任务一）和一个未完成的功能（任务二）**，详见《01-题目文档.md》。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js（>= 18）+ Express 4 |
| 持久化 | JSON 文件（`data/db.json`，首次启动自动用 `server/seed.js` 初始化） |
| 认证 | scrypt 口令散列 + HMAC 签名令牌（无第三方依赖） |
| 前端 | 无构建 SPA：hash 路由 + `<script>` 引入的经典脚本 |
| 共享逻辑 | `shared/price.js`、`shared/cart.js`（浏览器挂 `window` / Node `require` 双端复用） |

## 快速开始

```bash
npm install
npm start          # http://localhost:3000
```

首次启动会在 `data/db.json` 生成初始数据；删除该文件或执行 `npm run seed` 可随时恢复初始数据。

## 测试

```bash
npm test           # node --test tests/
```

## 内置账号

| 账号 | 密码 | 角色 |
|---|---|---|
| `admin` | `admin123` | 管理员（后台：商品/订单管理） |
| `3001` | `123456` | 学生（购物袋有 3 条记录，其中 1 条未勾选） |
| `3002` | `123456` | 学生（购物袋有 1 条记录） |

## 目录结构

```
mall-exam-base/
├── server/
│   ├── index.js            入口：express、中间件、路由挂载、错误处理
│   ├── db.js               JSON 持久化（进程内缓存 + 落盘）
│   ├── seed.js             初始数据（用户/分类/商品/购物袋/订单/收藏）
│   ├── auth.js             令牌签发校验 + 登录/管理员中间件
│   ├── respond.js          统一响应 { success, message, data }
│   └── routes/             auth / catalog / cart / orders / favorites / admin
├── shared/
│   ├── price.js            formatPrice（分→金额字符串）、resolvePrice（规格差价）
│   └── cart.js             calcCartCount、calcSelectedTotal
├── public/
│   ├── index.html          SPA 外壳（导航 + #app 容器）
│   ├── css/app.css         样式与响应式
│   └── js/
│       ├── api.js          请求封装（token 注入、统一解包）
│       ├── router.js       hash 路由
│       ├── state.js        全局状态/角标/toast
│       ├── app.js          注册路由与启动
│       └── views/          home / store / category / product / bag / orders /
│                           favorites / account / admin
└── tests/                  price / cart / api 冒烟（既有测试，请勿删改）
```

## API 一览

| 方法与路径 | 说明 | 鉴权 |
|---|---|---|
| `POST /api/auth/register` `POST /api/auth/login` | 注册 / 登录（返回 `data.token`） | 公开 |
| `GET /api/auth/me` `PUT /api/auth/me` | 当前用户 / 改昵称 | 登录 |
| `GET /api/categories` `GET /api/products` `GET /api/products/:id` | 分类与商品 | 公开 |
| `GET /api/cart` `POST /api/cart` `PUT /api/cart/:itemId` `DELETE /api/cart/:itemId` | 购物袋 | 登录 |
| `GET /api/orders` `POST /api/orders` `GET /api/orders/:id` `POST /api/orders/:id/cancel` | 订单 | 登录 |
| `GET /api/favorites` `POST /api/favorites/:productId` | 收藏 | 登录 |
| `GET/POST/PUT/DELETE /api/admin/products`、`/api/admin/categories`、`GET /api/admin/orders`、`PUT /api/admin/orders/:id/status` | 后台管理 | 管理员 |

响应统一为 `{"success": true, "data": ...}` 或 `{"success": false, "message": "..."}`；令牌通过 `Authorization: Bearer <token>` 传递。

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | `3000` | 服务端口 |
| `MALL_TOKEN_SECRET` | 开发默认值 | 令牌签名密钥（生产必须覆盖） |
