# 开发环境说明（DEV）

对应任务 0：**依赖安装 → 目录结构 → 开发环境配置 → 基础路由与页面框架**。本文记录配置结果、核对方法与验收清单。

## 1. 环境要求与当前实测版本

| 项 | 要求 | 本机实测 |
|---|---|---|
| 操作系统 | Windows | Windows（PowerShell） |
| Node.js | ≥ 18 | v24.21.0 |
| npm | 随 Node | 11.19.0 |
| 数据库 / 云服务 | 不需要 | 不需要（JSON 文件持久化） |
| 网络 | 仅 `npm install` 需要 | 已安装，测试与启动全程离线 |

```powershell
node -v
npm -v
```

## 2. 依赖安装

```powershell
npm install
```

- 唯一运行时依赖：`express ^4.19.2`；无 devDependencies、无测试框架（用 Node 内置 `node:test`）。
- 依赖树已锁定在 `package-lock.json`，便于复现；`node_modules/` 与 `npm-debug.log*` 已在 `.gitignore` 中忽略。

## 3. 目录结构（与题面一致）

项目直接位于仓库根目录，`package.json` 与 `server/`、`shared/`、`public/`、`tests/` 同级：

```
.
├── server/
│   ├── index.js            入口：express、路由挂载、/shared 与 public 静态托管、API 404、SPA 回退、统一错误处理
│   ├── db.js               JSON 持久化；首次启动自动生成 data/db.json；`node server/db.js --reset` 重置
│   ├── seed.js             种子数据（users / categories / products / carts / orders / favorites / seq）
│   ├── auth.js             scrypt 口令 + HMAC 令牌 + attachUser / requireAuth / requireAdmin（改动禁区）
│   ├── respond.js          ok() / fail() 统一响应
│   └── routes/
│       ├── auth.js         /api/auth     注册·登录·me
│       ├── catalog.js      /api/categories · /api/products（内部自带前缀）
│       ├── cart.js         /api/cart     查·加购·改数量/勾选·删除
│       ├── orders.js       /api/orders   查·下单·取消
│       ├── favorites.js    /api/favorites
│       └── admin.js        /api/admin/** 统一 requireAdmin
├── shared/                 前后端共享（浏览器挂 window、Node 走 require，同一份实现）
│   ├── price.js            formatPrice · resolvePrice      ← T2 实现点
│   └── cart.js             calcCartCount · calcSelectedTotal ← T1 修复点
├── public/
│   ├── index.html          SPA 外壳：导航（含购物袋角标）+ #app + 15 个脚本按序引入
│   ├── css/app.css         全站样式，含移动端媒体查询
│   └── js/
│       ├── api.js          fetch 封装（token 注入、统一解包、错误归一）
│       ├── state.js        Store：当前用户、购物袋角标、toast、requireLogin
│       ├── router.js       Router：hash 解析、:param 匹配、on/render/start
│       ├── app.js          注册 10 条路由 + DOMContentLoaded 启动
│       └── views/          home·store·category·product·bag·orders·favorites·account·admin
├── scripts/
│   ├── check-skeleton.js   骨架自检：目录/后端挂载/前端路由表/视图导出/脚本顺序
│   └── render-smoke.js     视图渲染冒烟：最小 DOM mock 驱动真实视图渲染 10 条路由
├── docs/
│   └── EXAM.md             考核题目文档（原样存档）
├── data/                   运行时生成，db.json 已被 .gitignore 忽略
└── tests/                  price.test.js · cart.test.js · api.test.js（15 个既有测试，勿删改）
```

## 4. 开发环境配置

| 配置项 | 值 / 位置 | 说明 |
|---|---|---|
| 端口 | `PORT` 环境变量，默认 `3000` | `server/index.js` 读取；`$env:PORT=3100; npm start` |
| 令牌密钥 | `MALL_TOKEN_SECRET`，默认开发固定值 | `server/auth.js` 读取；部署时应替换 |
| 环境变量样例 | `.env.example` | 项目**不引入 dotenv**，`.env` 不会自动加载；按需在启动前设置进程环境变量 |
| 忽略规则 | `.gitignore` | `node_modules/`、`data/db.json`、`data/db.json.tmp`、`npm-debug.log*`、`.env` |
| 静态资源 | `/` → `public/`，`/shared` → `shared/` | `server/index.js` 中 `express.static` |
| SPA 回退 | `GET /^\/(?!api|shared).*/` → `public/index.html` | 支持 `#/` 之外的直接访问路径 |
| 前端构建 | 无 | 改完 JS/CSS 刷新浏览器即生效，无需编译 |

未引入 ESLint / Prettier / 监听重启等额外工具：项目约定"保持简洁、避免过度设计"，且 `npm test` 必须零依赖离线通过。若需保存即重启，可自行用 `npx nodemon` 或 `node --watch server/index.js`，不必写入 `package.json`。

### 4.1 账号与内部 userId 的映射（调试必看）

**登录账号是字符串 `"3001"`，而数据里的 `userId` 是数字 `2`**，`data/db.json` 里按 `userId` 存储购物袋/收藏：

| 登录账号 | 密码 | `users[].id`（= `userId`） | `account` 字段 | 角色 |
|---|---|---|---|---|
| `admin` | `admin123` | `1` | `"admin"` | admin |
| `3001` | `123456` | `2` | `"3001"` | student（张三） |
| `3002` | `123456` | `3` | `"3002"` | student（李四） |

所以核对落盘数据要用 `userId === 2`，不能用 `3001`：

```powershell
node -e "const db=require('./data/db.json');db.carts.forEach(c=>console.log('userId='+c.userId, c.items.map(i=>i.id+'(sel='+i.selected+',qty='+i.qty+')').join(' ')))"
```

### 4.2 数据的两种形状：种子条目 vs 接口新增条目

`shared/cart.js` 顶部注释声明的条目结构是
`{ id, productId, name, image, model, color, storage, unitPrice, qty, selected }`，
但实测**种子数据与接口新增条目的字段并不一致**，属于基座既有数据形状差异（不是环境配置问题）：

| 来源 | 实测字段 | 购物袋页表现 |
|---|---|---|
| 种子条目（101/102/103/201） | `id, productId, model, color, storage, unitPrice, qty, selected` | 商品列的商品名与图标为**空白** |
| `POST /api/cart` 新增条目 | 上述字段 + `name, image` | 商品名与图标正常 |

`public/js/views/bag.js` 渲染的是 `${i.image} ${i.name}`，因此种子行只显示规格（`model / color / storage`）。
计算与下单链路不受影响（`calcSelectedTotal`、`POST /api/orders` 只用 `unitPrice`/`qty`/`selected`/`model` 等字段），
`tests/` 中 15 个既有测试也不涉及该字段差异。

> 这条差异留给"购物袋完整链路"阶段一并处理（例如渲染时按 `productId` 回查商品名，或让种子条目补齐 `name`/`image`）。
> 注意：**不得**通过修改 `server/seed.js` 来"改数据"，改动应落在视图或 `GET /api/cart` 的组装逻辑上。

## 5. 基础路由与页面框架

- 前端：`public/js/app.js` 注册 10 条 hash 路由，一一对应 `public/js/views/` 下 9 个视图模块（后台商品/订单共用一个模块）。
- 后端：`server/index.js` 挂载 6 个路由层（`/api/auth`、`/api`、`/api/cart`、`/api/orders`、`/api/favorites`、`/api/admin`），另有 `/api/health` 与统一 404 / 错误处理。
- 路由与页面的完整对照表见 [`README.md`](README.md)。

## 6. 一键核对（任务 0 验收清单）

```powershell
npm run check      # 1. 骨架自检：目录结构、路由挂载、路由表、视图导出、脚本顺序
npm start          # 2. 启动服务 → http://localhost:3000
npm test           # 3. 15 个既有测试应全绿，退出码 0
```

> ⚠️ **执行顺序有讲究**：`npm test` 之后请重启服务再跑页面级验收。
> `tests/api.test.js` 会调用 `db.reset()` 并真实下单，从而改写 `data/db.json`；而运行中的服务持有自己的
> 进程内缓存（见 7 节），于是会出现"磁盘是种子数据、接口返回的却是测试后的状态"。
> 建议顺序：`npm start` → `npm run verify:t1` / `verify:t2`（需服务的页面级验收）→ `npm test`（纯计算，无需服务）
> → 若要继续手工点页面，先 `Ctrl+C` 重启服务。

手工冒烟（服务已启动）：

```powershell
# 健康检查
Invoke-RestMethod http://localhost:3000/api/health

# 登录 3001 拿 token
$login = Invoke-RestMethod http://localhost:3000/api/auth/login -Method Post `
  -ContentType 'application/json' -Body '{"account":"3001","password":"123456"}'
$token = $login.data.token

# 购物袋（应为 3 条，勾选态 true,true,false；种子条目无 name 字段，见 4.2）
$h = @{ Authorization = "Bearer $token" }
(Invoke-RestMethod http://localhost:3000/api/cart -Headers $h).data |
  Format-Table id, productId, model, color, storage, unitPrice, qty, selected

# 分类 / 商品 / 收藏 / 订单 / 后台
(Invoke-RestMethod http://localhost:3000/api/categories).data.Count      # 3
(Invoke-RestMethod http://localhost:3000/api/products).data.Count        # 6
(Invoke-RestMethod http://localhost:3000/api/favorites -Headers $h).data.Count
(Invoke-RestMethod http://localhost:3000/api/orders -Headers $h).data.Count
```

浏览器逐页确认（应各自渲染，无红色报错框）：

`#/` → `#/store` → `#/category/1` → `#/product/1` → `#/bag` → `#/orders` → `#/favorites` → `#/account` → `#/admin/products`（需 admin 登录）

若无法开浏览器，可用渲染冒烟脚本代替（**需服务已启动**，跑完会自动把 `data/db.json` 恢复为种子数据）：

```powershell
npm run smoke
# PASS  /            home()  910 chars
# PASS  /store       store()  2809 chars
# ... 共 10 条路由，全部 PASS
# [smoke] 已重置 data/db.json 为种子数据
```

### T1 专项验收（服务已启动）

```powershell
npm run verify:t1
```

- `verify-t1-page.js`：渲染真实购物袋视图，断言 `#bagTotal` 为 `¥11,997.00`、已选 2 件。
- `verify-t1-toggle.js`：调用视图的 `toggle()`，断言"取消 AirPods → ¥8,999.00""全部取消 → ¥0.00""已选 N 件"实时变化，并确认全不勾选时下单被拒；跑完把勾选态恢复为种子状态。

### T2 专项验收（服务已启动）

```powershell
npm run verify:t2
```

- 用最小 DOM mock 渲染真实购买页视图，断言：默认规格 ¥8,999.00；切 Pro Max + 512GB → ¥10,799.00；切 Pro Max + 1TB → ¥11,599.00；颜色切换价格不变。
- 断言服务端加购落库 `unitPrice`，并核对**页面显示价 = 购物袋单价 = 订单条目单价**三者一致。
- 断言 MagSafe 充电器（库存 0）显示「暂时缺货」、按钮 `disabled`、服务端加购被拒；数量步进不超过库存。
- 验收表用 `data/db.json` 的种子商品读实际规格，**不硬编码除题面金额外的期望值**。
- ⚠️ 该脚本会改动 3002 的购物袋并真实下单，结束时自动 `reset()` 种子数据；因进程内缓存不同步，**跑完请重启服务**（脚本会提示）。

### 任务 0 完成判据

| # | 判据 | 结果 |
|---|---|---|
| 1 | `npm install` 成功、无漏洞告警 | ✅ 68 包，0 vulnerabilities |
| 2 | 目录结构与 README 第三节一致 | ✅ `npm run check` 通过 |
| 3 | 开发环境可配置（端口/密钥/忽略规则） | ✅ `PORT`、`MALL_TOKEN_SECRET`、`.env.example`；`PORT=3100` 实测可切换 |
| 4 | 基础路由与页面框架完整 | ✅ 前端 10 路由 / 9 视图；后端 6 路由层 |
| 5 | 服务可启动 | ✅ <http://localhost:3000>，`/api/health` 返回 `{"success":true,"data":{"status":"up"}}` |
| 6 | 15 个既有测试全绿、退出码 0 | ✅ 15 passed / 0 failed |
| 7 | 关键接口冒烟（登录·购物袋·分类·商品·订单·收藏·后台权限） | ✅ 学生访问后台 403，管理员正常 |
| 8 | 页面可渲染（10 条路由逐一渲染） | ✅ `npm run smoke` 全部 PASS，无异常、无错误框 |
| 9 | 静态资源全部可达 | ✅ `index.html` 引用的 15 个脚本 + `app.css` 均 200 |
| 10 | 共享模块双端可用（浏览器挂 window / Node require） | ✅ `npm run check` 含 UMD 双端断言 |
| 11 | 核心逻辑未退回桩实现 | ✅ `npm run check` 断言 `resolvePrice` 默认价≠顶配价、`calcSelectedTotal` 排除未勾选 |
| 12 | 既有 15 个测试未被删改、仍全绿 | ✅ 单独运行 `node --test tests/api.test.js tests/cart.test.js tests/price.test.js` → 15 pass |
| 13 | 新增测试并统一入口 | ✅ `npm test` → 57 pass / 0 fail / 0 skipped，exit 0 |

### T1 / T2 移动端适配

- 无新增 CSS；新增的库存提示（`.stock-hint`）与按钮沿用既有样式。
- 购买页 `.buy-layout` 在 `@media (max-width: 760px)` 下由两列塌陷为单列，缺货提示与禁用按钮都在该栅格内，随页面一起堆叠。
- 禁用态使用既有 `.btn:disabled`（灰底 + `cursor: not-allowed`），触屏与鼠标表现一致。

## 7. 常见问题

**`npm test` 报 `Error: spawn EPERM` / `errno: -4048`**
这是**沙箱环境**限制，不是项目问题：`node --test` 需要 spawn 子进程并通过管道收集输出，而受限沙箱禁止进程打开命名管道。在普通 Windows 终端/CI 中直接 `npm test` 即可；若在受限沙箱内，需放开子进程管道权限后重跑。判据是最终 `exit code = 0` 且 `pass 15 / fail 0`。

**端口 3000 被占用**
`$env:PORT=3100; npm start`，然后访问 <http://localhost:3100>。

**购物袋显示"请先登录"**
`requireLogin()` 会把未登录用户送回 `#/account`；用 `3001 / 123456` 登录即可。

**改了数据想回到初始状态**
`npm run seed`（等价于 `node server/db.js --reset`），或删除 `data/db.json` 后重启。

> ⚠️ **重要：`npm run seed` 只重置文件，不会同步正在运行的服务的进程内缓存。**
> `server/db.js` 把 `db.json` 缓存在进程内存里，每次写操作都会用这份缓存整体覆盖文件。
> 所以"服务运行中执行 `npm run seed`"会出现：文件是种子数据、接口返回的却仍是旧数据；
> 且下一次任何写操作又会把文件覆盖回去。**要真正重置，先停服务 → `npm run seed` → 再 `npm start`。**
> 典型踩坑：把购物袋全部取消勾选后跑 `npm run seed`，再刷新页面仍是"全未勾选 / 总计 ¥0.00"。

**购买页价格切换规格不变**
已修复（T2）：`shared/price.js` 的 `resolvePrice` 现在按"基础价 + 型号差价 + 容量差价"计算，购买页切换 chip 会实时刷新 `#buyPrice`。

**购物袋里种子条目的商品名是空白**
基座既有的数据形状差异，原因与影响见 4.2，属于"购物袋完整链路"阶段的范围。

**加购后购物袋出现两条 id 相同的条目 / 改数量改错了行 / 删除一次删掉两条**
基座既有的 id 冲突缺陷：种子条目已占用 `id: 201`，而 `db.seq.cartItem` 初值也是 `201`，种子之后第一次加购就会撞号。
复现与影响范围见 [`README.md`](README.md) 的「已知问题」。修复需调整取号逻辑或 `seed.js` 的序号初值（后者是考核红线，需与出题方确认），目前未改动。

**改了视图后页面没更新 / 路由 404**
检查三处是否同步：`public/js/views/<x>.js` 的 `Views.<x>` 导出、`public/js/app.js` 的 `on(...)` 注册、`public/index.html` 的 `<script>`（须在 `app.js` 之前）。`npm run check` 会直接指出缺哪一处。
