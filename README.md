# LumiStore 商城系统

科技产品商城（全栈）：**Node 18+ / Express 4 + JSON 文件持久化 + 无构建 SPA**。
前端无打包、无编译，`public/` 下的经典 `<script>` 直接由 Express 静态托管；前后端共用 `shared/` 里的同一份纯函数实现。

本项目基于考核基座 `mall-exam-base` 的固定基线 commit `d204eee68814c6433a15272b8a795c6c30dc679b`，在该基线上继续完成缺陷修复与功能实现。

## 快速开始（Windows PowerShell）

```powershell
npm install                 # 仅一个运行时依赖 express
npm start                   # http://localhost:3000
```

- 首次启动自动生成 `data/db.json` 种子数据（`server/seed.js`）。
- 想恢复初始数据：删除 `data/db.json`，或执行 `npm run seed`。
- 接口文档即代码：`server/routes/*.js`；也可用浏览器 Network 面板或 `curl` 观察。

### 内置账号

| 账号 | 密码 | 角色 |
|---|---|---|
| `admin` | `admin123` | 管理员（可进后台） |
| `3001` | `123456` | 学生 张三（购物袋 3 条） |
| `3002` | `123456` | 学生 李四（购物袋 1 条） |

## npm 脚本

| 命令 | 作用 |
|---|---|
| `npm start` | 启动服务，默认 <http://localhost:3000> |
| `npm run seed` | 重置 `data/db.json` 为种子数据 |
| `npm run check` | 骨架自检：目录结构 / 后端路由挂载 / 前端路由表 / 视图导出 / 脚本加载顺序 |
| `npm run smoke` | 渲染冒烟（**需先 `npm start`**）：用最小 DOM mock 驱动真实视图，逐条渲染 10 个页面；结束后自动恢复种子数据 |
| `npm test` | 运行 `tests/*.test.js`（node:test，零第三方依赖、离线） |

## 目录结构

```
.
├── server/
│   ├── index.js           入口：路由挂载、静态资源、SPA 回退、统一错误处理
│   ├── db.js              JSON 持久化（进程内缓存 + 原子落盘 data/db.json）
│   ├── seed.js            种子数据（账号 / 分类 / 商品 / 购物袋 / 订单 / 收藏）
│   ├── auth.js            scrypt 口令散列 + HMAC 令牌 + requireAuth / requireAdmin
│   ├── respond.js         统一响应 { success, data } / { success, message }
│   └── routes/            auth · catalog · cart · orders · favorites · admin
├── shared/
│   ├── price.js           formatPrice · resolvePrice（规格差价，前后端同一份实现）
│   └── cart.js            calcCartCount · calcSelectedTotal（前后端同一份实现）
├── public/
│   ├── index.html         SPA 外壳：导航 + #app 容器 + 按序加载脚本
│   ├── css/app.css        全部样式（含移动端适配）
│   └── js/
│       ├── api.js         fetch 封装：注入 token、统一解包
│       ├── state.js       全局状态：当前用户、购物袋角标、toast
│       ├── router.js      hash 路由：#/path/:param
│       ├── app.js         注册路由表 + 启动
│       └── views/         home · store · category · product · bag · orders · favorites · account · admin
├── scripts/
│   ├── check-skeleton.js  骨架自检（npm run check）
│   └── render-smoke.js    视图渲染冒烟（npm run smoke，需服务已启动）
├── docs/
│   └── EXAM.md            考核题目文档（原样存档）
└── tests/                 price · cart · api 冒烟（15 个既有测试，请勿删改）
```

## 前后端两条链路

### 页面路由（hash）

| 页面 | 路由 | 视图文件 | 视图函数 |
|---|---|---|---|
| 首页 | `#/` | `views/home.js` | `Views.home` |
| 商店 | `#/store` | `views/store.js` | `Views.store` |
| 分类 | `#/category/:id` | `views/category.js` | `Views.category` |
| 购买页 | `#/product/:id` | `views/product.js` | `Views.product` |
| 购物袋 | `#/bag` | `views/bag.js` | `Views.bag` |
| 订单 | `#/orders` | `views/orders.js` | `Views.orders` |
| 收藏 | `#/favorites` | `views/favorites.js` | `Views.favorites` |
| 账户中心 | `#/account` | `views/account.js` | `Views.account` |
| 后台·商品 | `#/admin/products` | `views/admin.js` | `Views.adminProducts` |
| 后台·订单 | `#/admin/orders` | `views/admin.js` | `Views.adminOrders` |

新增页面三件套：`public/js/views/<x>.js` 导出 `Views.<x>` → `public/js/app.js` 里 `on("/<x>", V.<x>)` → `public/index.html` 引入 `<script src="/js/views/<x>.js"></script>`（必须在 `app.js` 之前）。漏任何一步，`npm run check` 都会报错。

### JSON API

统一返回 `{"success": true, "data": ...}` 或 `{"success": false, "message": "..."}`；需要鉴权的接口带 `Authorization: Bearer <token>`（登录返回的 token 在 `data.token` 内）。

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/auth/register` · `/api/auth/login` | — | 注册 / 登录 |
| GET / PUT | `/api/auth/me` | 登录 | 当前用户 / 修改昵称 |
| GET | `/api/categories` | — | 分类列表 |
| GET | `/api/products?categoryId=&keyword=&recommend=true` | — | 商品列表（仅上架） |
| GET | `/api/products/:id` | — | 商品详情 |
| GET | `/api/cart` | 登录 | 我的购物袋 |
| POST | `/api/cart` | 登录 | 加购（服务端用 `resolvePrice` 落 `unitPrice`） |
| PUT / DELETE | `/api/cart/:itemId` | 登录 | 改数量或勾选 / 删除 |
| GET / POST | `/api/orders` | 登录 | 我的订单 / 由**已勾选**商品生成订单 |
| GET | `/api/orders/:id` | 登录 | 订单详情（仅本人） |
| POST | `/api/orders/:id/cancel` | 登录 | 取消未付款订单 |
| GET | `/api/favorites` · POST `/api/favorites/:productId` | 登录 | 收藏列表 / 切换收藏 |
| ALL | `/api/admin/**` | 管理员 | 商品与订单后台（统一 `requireAdmin`） |
| GET | `/api/health` | — | 健康检查 |

## 当前任务与进度

| 任务 | 内容 | 状态 |
|---|---|---|
| 任务 0 | 环境搭建：依赖安装、目录结构、开发环境配置、基础路由与页面框架 | 已完成（本文件 + `DEV.md` 所述即成果） |
| T1 | 缺陷修复：购物袋合计把未勾选商品也计入了（`shared/cart.js:35`） | 待做 |
| T2 | 功能实现：商品规格价格联动与库存状态（`shared/price.js:45`） | 待做 |
| T3 | 自动化测试：补齐 `calcSelectedTotal` / `resolvePrice` 覆盖 | 待做 |

> ⚠️ 任务 0 完成后，购买页仍恒定显示基础价、购物袋合计仍包含未勾选商品——这是基座**刻意保留的缺陷**（T1 / T2 的目标），不是环境问题。

## 约束与红线（来自考题）

- 不得删除或改写 `tests/` 下既有 15 个测试（含 skip/disable 等手段）。
- 不得修改 `server/seed.js` 种子数据、`server/auth.js` 鉴权逻辑来"让用例通过"。
- 不得按条目 id/名称硬编码特判 fixture；`shared/` 的前后端必须是同一份实现。
- `npm test` 必须一条命令、离线、退出码为 0；不新增 `console.log` 调试残留。

## 文档索引

| 文件 | 内容 |
|---|---|
| `README.md`（本文件） | 项目总览、启动方式、目录与路由、API、任务进度 |
| [`DEV.md`](DEV.md) | 开发环境配置、目录结构核对、验收清单、常见问题 |
| [`docs/EXAM.md`](docs/EXAM.md) | 考核题目文档（原样存档，含 T1/T2/T3 验收标准） |
| [`README.baseline.md`](README.baseline.md) | 考核基座原始说明（原样存档） |
| `AGENT.md` | AI 开发指令 |
