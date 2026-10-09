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
| `npm run check` | 骨架自检：目录结构 / 后端路由挂载 / 前端路由表 / 视图导出 / 共享模块双端可用 / 脚本加载顺序 |
| `npm run smoke` | 渲染冒烟（**需先 `npm start`**）：用最小 DOM mock 驱动真实视图，逐条渲染 10 个页面；结束后自动恢复种子数据 |
| `npm run verify:t1` | T1 专项验收（**需先 `npm start`**）：购物袋总计页面渲染 + 勾选/取消实时联动 |
| `npm run verify:t2` | T2 专项验收（**需先 `npm start`**）：规格价格联动 + 库存状态 + 页面/购物袋/订单三方一致 |
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
│   ├── render-smoke.js    视图渲染冒烟（npm run smoke，需服务已启动）
│   ├── verify-t1-page.js  T1 页面层验收：购物袋总计渲染值
│   ├── verify-t1-toggle.js T1 联动验收：勾选/取消后总计实时变化
│   └── verify-t2.js       T2 验收：价格联动 / 库存状态 / 三方金额一致
├── docs/
│   └── EXAM.md            考核题目文档（原样存档）
└── tests/                 15 个既有测试（未改动）+ 42 个新增测试 = 57 个
    ├── api.test.js            既有：登录/购物袋/下单/后台权限/响应契约
    ├── cart.test.js           既有：calcCartCount
    ├── price.test.js          既有：formatPrice
    ├── cart-selected-total.test.js  新增：calcSelectedTotal
    ├── price-resolve.test.js        新增：resolvePrice
    └── price-format.test.js         新增：formatPrice 加固 + 既有测试完整性自检
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
| 任务 0 | 环境搭建：依赖安装、目录结构、开发环境配置、基础路由与页面框架 | 已完成（`DEV.md` 所述即成果） |
| T1 | 缺陷修复：购物袋合计把未勾选商品也计入了（`shared/cart.js`） | **已完成**，见下节 |
| T2 | 功能实现：商品规格价格联动与库存状态（`shared/price.js`） | **已完成**，见下节 |
| T3 | 自动化测试：为核心计算补齐覆盖 | **已完成**，见下节 |

## 已知问题（基座自带，尚未修复）

| # | 问题 | 现象 | 影响 |
|---|---|---|---|
| 1 | **购物袋条目 id 冲突**：种子条目已用到 `id: 201`，而 `db.seq.cartItem` 初值也是 `201` | 种子后第一次加购会产生两条相同 id 的条目（如 `201/iPhone Air` 与 `201/MacBook`） | `PUT`/`DELETE /api/cart/201` 会作用在**错误的那一条**，`DELETE` 甚至一次删掉两条（实测复现）。后续"购物袋完整链路"阶段需要处理 |
| 2 | 种子购物袋条目缺 `name` / `image` 字段（接口新增的条目才有） | 购物袋页种子行的商品名与图标为空白 | 仅影响展示，不影响计价与下单 |

> 问题 1 的复现要点：`node server/db.js --reset` 后用 `3002` 加购任意商品，再看 `GET /api/cart` 的 id 是否重复。
> 彻底修复要动 `server/seed.js` 的 `seq.cartItem` 初值（种子数据是考核红线，需与出题方确认），
> 或者把取号逻辑改成"当前最大 id + 1"。本次 T1/T2 都不依赖该行为，故未改动。

## T1 缺陷修复说明（已完成）

**根因**：`shared/cart.js` 的 `calcSelectedTotal(items)` 对所有条目直接求和，reduce 里漏掉了 `selected` 判断，于是未勾选的 MagSafe 保护壳（¥199.00）也被计入了"总计"。

**改法**（最小改动，只动共享计算逻辑这一处）：

```js
return items.reduce(
  (sum, item) =>
    item && item.selected === true
      ? sum + (Number(item.unitPrice) || 0) * (Number(item.qty) || 0)
      : sum,
  0,
);
```

- 用 `selected === true` 严格判断：`undefined` / `0` / `1` 等都不算勾选，不会被误计入。
- 保留原有的 `Number(...) || 0` 容错，脏字段不会产生 `NaN`。
- **未改动**：`calcCartCount`（角标按数量求和、不看勾选，是正确设计）、`server/seed.js` 勾选态、`tests/` 既有测试、任何调用方传参。

**验证结果**（均为实测）：

| 场景 | 结果 |
|---|---|
| 种子数据全勾选 | ¥11,997.00（899900 + 149900×2）✅ 修复前为 ¥12,196.00 |
| 取消勾选 AirPods(102) | ¥8,999.00 |
| 只勾 AirPods | ¥2,998.00 |
| 全部取消勾选 | ¥0.00 |
| 空数组 / `null` / `undefined` / 数字 / 字符串 / 对象 | 均返回 0，不抛异常 |
| `selected` 缺失、`selected:1`、`null` 条目、字段缺失 | 不崩、不计入 |
| `calcCartCount` 回归 | 仍为 4（不看勾选） |
| 页面实时联动 | 取消/勾选后"总计"与"已选 N 件"实时变化 |
| `PUT /api/cart/102 {"selected":false}` | 仍 200 |
| 全部取消后 `POST /api/orders` | 仍 400"没有已勾选的商品" |
| `npm test` | 15 passed / 0 failed，exit 0 |

一键复跑：`npm run verify:t1`（需先 `npm start`）。

## T2 功能实现说明（已完成）

**根因**：`shared/price.js` 的 `resolvePrice` 是 TODO 桩，任何规格都 `return product.basePrice`，所以购买页切型号/容量价格恒定。

**改法 1 — 共享定价逻辑**（`shared/price.js`，前后端同一份实现）：

```js
function findDelta(list, value) {
  if (!Array.isArray(list) || value === undefined || value === null) return 0;
  const hit = list.find((item) => item && (item.label === value || item.name === value));
  if (!hit) return 0;
  const delta = Number(hit.priceDelta);
  return Number.isFinite(delta) ? delta : 0;
}

function resolvePrice(product, variant) {
  if (!product || typeof product !== "object") return 0;
  const base = Number(product.basePrice);
  const basePrice = Number.isFinite(base) ? base : 0;
  const picked = variant && typeof variant === "object" ? variant : {};
  return basePrice + findDelta(product.models, picked.model) + findDelta(product.storages, picked.storage);
}
```

- 价格 = 基础价 + 型号差价 + 容量差价；**颜色不参与定价**（题目明确列为范围外）。
- `findDelta` 同时接受 `label` 与 `name`：种子里型号用 `name`、容量用 `label`，两种都兼容，避免因字段名不一致算错价。
- 找不到规格项、规格字段缺省、`priceDelta` 非数字 → 该部分按 0 计，不抛错。
- **未改动**：UMD 包装方式（服务端 `require` / 浏览器 `<script>` 引入都不变），所以 `server/routes/cart.js` 早已 `require` 的同一份实现直接生效。

**改法 2 — 购买页联动与库存状态**（`public/js/views/product.js`）：

- `pick()` 切换规格后 `repaint()` 重绘 chip 选中态并刷新 `#buyPrice`（价格联动）。
- 进入页面时重新初始化 `current`，修掉"从商品 A 切到商品 B 会沿用 A 的规格与数量"的问题。
- 库存为 0：价格区下方显示红色「暂时缺货」（复用已有 `.stock-hint.low`），并把「加入购物袋」按钮设为 `disabled`；`addToCart()` 与 `qty()` 也有兜底提示。
- 数量步进钳制在 `[1, stock]`。
- `defaultVariant`/chip 渲染对空规格数组做了容错。

**验证结果**（均为实测）：

| 场景 | 期望 | 实测 |
|---|---|---|
| 默认规格（Pro / 深蓝色 / 256GB） | ¥8,999.00 | ✅ |
| Pro Max + 512GB | ¥10,799.00 | ✅ |
| Pro Max + 1TB | ¥11,599.00 | ✅ |
| 服务端加购（MacBook Neo 高速款 + 512GB） | 条目 `unitPrice` = 799900 | ✅ |
| 页面显示价 = 购物袋单价 = 订单条目单价 | 三者一致 | ✅ |
| 颜色切换（银色 / 星雾橙色） | 价格不变 | ✅ |
| MagSafe 充电器（库存 0） | 「暂时缺货」+ 按钮 disabled + 加购被拒（400 库存不足） | ✅ |
| 数量步进不超过库存 | 库存 5 时连加停在 5、连减停在 1 | ✅ |
| 边界：`variant` 缺省 / 未知规格 / 空数组 / `null` / 非法 product | 按 0 计或不抛错 | ✅ 27 项 |
| `npm test` | 15 passed / 0 failed | ✅ |

一键复跑：`npm run verify:t2`（需先 `npm start`；脚本会改动 3002 的购物袋并下单验证，结束后自动重置种子数据）。

## T3 自动化测试说明（已完成）

**统一入口**：`npm test` 一条命令、零依赖（`node:test` + `node:assert`）、全程离线、退出码 `0`。
实际结果：**57 个测试全部通过（15 个既有 + 42 个新增），0 失败、0 跳过**。

### 测试文件与覆盖矩阵

| 文件 | 数量 | 覆盖 |
|---|---|---|
| `tests/api.test.js`（既有，未改动） | 8 | 登录 / 购物袋 / 下单 / 后台权限 / 响应契约 |
| `tests/cart.test.js`（既有，未改动） | 2 | `calcCartCount` |
| `tests/price.test.js`（既有，未改动） | 5 | `formatPrice` |
| **`tests/cart-selected-total.test.js`（新增）** | 14 | `calcSelectedTotal` |
| **`tests/price-resolve.test.js`（新增）** | 21 | `resolvePrice` |
| **`tests/price-format.test.js`（新增）** | 7 | `formatPrice` 加固 + 既有测试完整性自检 |

**`calcSelectedTotal`**（题目要求的四项全覆盖，另加边界）：
种子 fixture（2 勾 1 不勾）`= 1199700`；只勾 AirPods `= 299800`；取消 AirPods `= 899900`；全不勾 `= 0`；
空数组 `= 0`；10 种非数组输入（`null`/`undefined`/数字/字符串/对象/类数组/`Map`/`Set`…）一律 `= 0` 且不抛错；
`selected` 缺失、`null`、`1`、`"true"`、`"false"` 均不计入；脏条目跳过不污染合计；
`calcCartCount` 回归（按数量求和、不看勾选）；不修改入参；与种子数据一致性。

**`resolvePrice`**：默认规格 `= 899900`；Pro Max + 1TB `= 1159900`；Pro Max + 512GB `= 1079900`；文档示例 `= 979900`；
未知型号/未知容量差价按 0；部分未知时另一部分仍生效；`variant` 缺省字段不抛错（`{}`、`null`、`undefined`、字符串、数字）；
颜色不影响价格；非法 `product` 返回 0；空规格数组/缺规格列表/脏 `priceDelta`；规格项 `name` 与 `label` 两种字段名都能匹配；
全部 6 个种子商品"默认价 = 基础价、顶配价 = 基础价 + 各项差价"；种子购物袋 `unitPrice` 与 `resolvePrice` 一致；**UMD 双端结果一致**。

**`formatPrice`** 加固：三位以上分组、大额、负数、负零、非法输入、四舍五入与浮点误差、极大值；既有 5 个断言保持原样未改。

### 防止"既有测试被删改"的自检

`tests/price-format.test.js` 内含一条自检，读取三个既有测试文件并断言：
文件存在、测试数分别为 8/2/5、总数 15，且**不得出现** `test.skip` / `test.only` / `test.todo` / `describe.skip` / `{ skip: true }`（检查前先剥离注释，避免把说明文字误判）。

### 变异测试（证明断言非"空转"）

把产品逻辑或既有测试故意改坏，确认测试会失败：

| 变异 | 结果 |
|---|---|
| `shared/cart.js` 把 `selected === true` 改成恒真（重造 T1 缺陷） | ✅ 捕获，7 个测试失败 |
| `shared/price.js` 退回桩实现（重造 T2 缺陷） | ✅ 捕获，12 个测试失败 |
| 把既有测试改成 `test.skip`（数量不变） | ✅ 捕获，完整性自检失败 |
| 删除一个既有测试（数量减少） | ✅ 捕获，完整性自检失败 |
| `formatPrice` 去掉千分位分组 | ✅ 捕获，3 个测试失败 |

### 手法约束遵守情况

- 测试文件全部位于 `tests/` 下，命名为 `<被测函数>-<语义>.test.js`。
- **未改** 任何既有测试文件（`git diff tests/api.test.js tests/cart.test.js tests/price.test.js` 为空），无 skip/disable。
- **未** 把断言写进产品代码；**未** 为测试改变任何浏览器内行为。
- 期望值取自《题目文档》验收表与种子数据，未按 id/名称写死特判；对数据的依赖统一走 `require("../server/seed")` 的只读种子，**不读会被其它测试 `db.reset()` 改写的 `data/db.json`**（避免并发测试文件互相干扰）。

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
