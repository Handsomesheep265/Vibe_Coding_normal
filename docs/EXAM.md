# 商城系统 AI Coding 上机考核 · 题目文档

| 项 | 值 |
|---|---|
| 考核名称 | 商城系统（LumiStore）AI Coding 上机测试 |
| 编程阶段时长 | 90 分钟（第二部分倒计时归零即提交；第一部分问卷与第三部分简答另行计时） |
| 考核对象 | 前端 / 全栈方向（前后端均涉及，偏全栈） |
| 考核基座 | `mall-exam-base`（Node + Express + JSON 持久化 + 无构建 SPA 的科技产品商城） |
| 固定基线 | commit `d204eee68814c6433a15272b8a795c6c30dc679b`（所有人同一份代码） |
| AI 政策 | 允许使用自备 AI 编程工具、搜索引擎和官方文档；无需完整操作记录，但须在平台提交首条完整 Prompt。平台不提供 API Key；本文件评分仅针对第二部分编程交付，第三部分另行人工评阅 |
| 方向与难度 | 全栈 · 标准；任务、时长和分值不变，不代表四套工作量完全相同 |
| 面试追问 | 考生须能逐行解释每一处改动：为什么改、怎么验证的 |

## 一、考试说明

你将在 90 分钟内，在一个**可运行的全栈商城项目**上完成 1 个缺陷修复、1 个功能实现和 1 组自动化测试。项目覆盖：首页/商店/分类/购买页/购物袋/订单/收藏/账户中心/后台（商品+订单）的完整链路，前后端通过 JSON API 交互。

**本项目刻意保留了一个缺陷（任务一）和一个未完成的功能（任务二）**，这不是一个"写完的项目"。

评分构成：T1 缺陷修复 25% + T2 功能实现 35% + T3 自动化测试 20% + 回归与提交 20%。存在一票否决项（见第七节）。

做不完是正常的，请优先保证已完成的部分"对且说得清"。

## 二、环境与约束

### 环境准备（开考前完成）

```bash
git clone https://github.com/LUOLIN926/mall-exam-base.git mall-exam-base
cd mall-exam-base
git checkout d204eee68814c6433a15272b8a795c6c30dc679b
npm install
npm start        # http://localhost:3000
```

- Node.js **18 或更高**（`node -v` 确认）；不需要数据库、不需要任何云服务
- 首次启动自动生成 `data/db.json` 种子数据；删除该文件或 `npm run seed` 可恢复初始数据
- 浏览器访问 <http://localhost:3000>；接口文档用浏览器 Network 面板或 curl 均可

### 内置账号与种子数据

| 账号 | 密码 | 角色 | 购物袋种子数据 |
|---|---|---|---|
| `admin` | `admin123` | 管理员 | — |
| `3001` | `123456` | 学生 张三 | 3 条：iPhone 17 Pro ×1（勾选）、AirPods Pro 3 ×2（勾选）、MagSafe 保护壳 ×1（**未勾选**） |
| `3002` | `123456` | 学生 李四 | 1 条：iPhone Air ×1（勾选） |

关键商品（`server/seed.js`）：iPhone 17 Pro 基础价 ¥8,999.00（型号 Pro Max +¥1,000.00；容量 512GB +¥800.00、1TB +¥1,600.00）、AirPods Pro 3 ¥1,499.00、MagSafe 保护壳 ¥199.00、**MagSafe 充电器库存 0**。

### 允许 / 禁止

| 允许 | 禁止（一票否决） |
|---|---|
| 使用任意 AI 工具、搜索引擎、官方文档 | **不得删除或改写 `tests/` 下既有测试**（含 skip/disable 等手段） |
| 修改任何产品代码，新增文件、重构 | 不得修改 `server/seed.js` 种子数据让用例"通过" |
| 为纯函数补测试、引入测试框架 | 不得修改 `server/auth.js` 的鉴权逻辑走捷径（如关闭权限校验） |
| — | 不得为了通过而硬编码 fixture 特判（如按名称/ID 写死返回值） |

## 三、代码导览

### 技术栈与结构

| 层 | 技术 |
|---|---|
| 后端 | Node 18+ / Express 4；JSON 文件持久化（`server/db.js` 进程内缓存 + 落盘） |
| 认证 | scrypt 口令散列 + HMAC 签名令牌（`server/auth.js`，无第三方依赖） |
| 前端 | 无构建 SPA：hash 路由 + `<script>` 经典脚本；视图在 `public/js/views/` |
| 共享逻辑 | `shared/price.js`、`shared/cart.js`——浏览器挂 `window` / Node `require` 双端复用（**两端必须是同一份实现**） |

```
mall-exam-base/
├── server/
│   ├── index.js          入口：路由挂载、静态资源、错误处理
│   ├── db.js / seed.js   JSON 持久化 / 种子数据
│   ├── auth.js           令牌签发校验 + requireAuth / requireAdmin
│   └── routes/           auth / catalog / cart / orders / favorites / admin
├── shared/price.js       formatPrice、resolvePrice（规格差价）   ← 任务二
├── shared/cart.js        calcCartCount、calcSelectedTotal       ← 任务一
├── public/js/
│   ├── api.js            请求封装（token 注入、统一解包）
│   ├── router.js / state.js / app.js
│   └── views/            home/store/category/product/bag/orders/favorites/account/admin
└── tests/                price / cart / api 冒烟（15 个既有测试，请勿删改）
```

### 两个约定

1. **接口统一返回**：`{"success": true, "data": ...}` 或 `{"success": false, "message": "..."}`
2. **鉴权**：`Authorization: Bearer <token>`；登录接口返回的 `token` 在 `data` 内；购物袋/订单/收藏数据与登录用户严格关联

### 关键位置索引（行号以固定基线为准）

| 位置 | 内容 | 关联任务 |
|---|---|---|
| `shared/cart.js:35` | `calcSelectedTotal(items)`：勾选商品合计（当前有缺陷） | T1 |
| `shared/cart.js:22` | `calcCartCount(items)`：购物袋总件数（正确，勿破坏） | T3 |
| `shared/price.js:45` | `resolvePrice(product, variant)`：规格差价（当前未实现） | T2 |
| `shared/price.js:23` | `formatPrice(cents)`：分 → `¥1,299.00` | T3 |
| `server/routes/cart.js:35` | `POST /api/cart`：加购（服务端用 resolvePrice 落单价） | T2 |
| `server/routes/cart.js:77` | `PUT /api/cart/:itemId`：改数量/勾选 | T1 |
| `server/routes/orders.js:31` | `POST /api/orders`：勾选商品生成订单，`total` 见 52 行 | T1/T2 |
| `server/routes/admin.js:11` | 后台路由统一 `requireAdmin` | 回归 |
| `server/auth.js:22/61/69` | `issueToken` / `requireAuth` / `requireAdmin` | 禁止改动 |
| `public/js/views/bag.js:39/70` | 购物袋合计渲染（调 `calcSelectedTotal`） | T1 |
| `public/js/views/product.js:22/90` | 购买页价格渲染与规格切换重绘 | T2 |
| `server/seed.js:136` | 购物袋种子数据（3001 三条勾选态见上表） | T1 |

## 四、T1 缺陷修复：购物袋合计把未勾选商品也计入了（25%，建议 25 分钟）

**现象**：用 `3001` 登录打开购物袋（<http://localhost:3000/#/bag>），"总计"显示 **¥12,196.00**；但页面只应统计**已勾选**商品——把未勾选的 MagSafe 保护壳（¥199.00）排除后应为 **¥11,997.00**。取消/勾选任意商品，"总计"都不变化。

**复现步骤**

1. `3001 / 123456` 登录，进入购物袋
2. 观察"总计"= ¥12,196.00；取消勾选 iPhone 或 AirPods 任意一条，总计仍为 ¥12,196.00
3. 接口层同样可复现：`GET /api/cart` 拿三条数据，用 `shared/cart.js` 的 `calcSelectedTotal` 计算，结果为 1219600

**验收要求**

- `calcSelectedTotal` 只统计 `selected === true` 的条目：合计 = Σ(单价 × 数量)。fixture 下（种子数据原样）：
  - 全勾选状态总计 = **¥11,997.00**（899900 + 149900×2）
  - 取消勾选 AirPods（id 102）后总计 = **¥8,999.00**
  - 全部取消勾选后总计 = **¥0.00**
- 页面行为一致：勾选/取消后"总计"实时变化且数值正确
- 边界：条目数为 0 / 传入非数组时报错不崩（返回 0）
- 接口层不受影响：`PUT /api/cart/102 {"selected":false}` 仍 200；全部取消勾选后 `POST /api/orders` 仍返回 400"没有已勾选的商品"
- 购物袋角标（`calcCartCount`）行为不变——它按数量求和、不看勾选，这是正确设计，**不要"顺手改错"**

**不要动**：`server/seed.js` 的勾选态种子、`tests/` 既有测试。只改共享计算逻辑（必要时可同步调整调用方的传参），禁止按条目 id/名称写死特判。

## 五、T2 功能实现：商品规格的价格联动与库存状态（35%，建议 35 分钟）

**现象**：购买页（如 <http://localhost:3000/#/product/1>）切换型号/容量时，价格**恒定显示基础价 ¥8,999.00**——规格差价没有实现。选择 Pro Max + 1TB 时应为 **¥11,599.00**。

**需求**

1. **实现 `shared/price.js` 的 `resolvePrice(product, variant)`**（当前是 TODO 桩）：价格 = 商品基础价 + 型号差价 + 容量差价；找不到对应规格项时该部分差价按 0 计
2. **购买页联动**：切换型号/颜色/容量 chip 时，页面价格（`#buyPrice`）实时刷新为所选规格价格；初始进入按默认规格（每项第一个）展示
3. **加购与下单一致**：`POST /api/cart` 传入 `{model, color, storage}` 后，服务端仍用同一份 `resolvePrice` 计算并落库 `unitPrice`——页面显示价、购物袋单价、订单金额三者一致
4. **库存状态**：库存为 0 的商品（种子中 MagSafe 充电器，id 5）在购买页显示"暂时缺货"，"加入购物袋"禁用或点击后明确提示不提交；库存 > 0 时正常加购；数量步进不超过库存

**验收要求（精确值）**

| 场景 | 期望 |
|---|---|
| iPhone 17 Pro 默认规格（Pro / 深蓝 / 256GB） | ¥8,999.00 |
| 切到 Pro Max + 512GB | ¥10,799.00（899900+100000+80000） |
| 切到 Pro Max + 1TB | ¥11,599.00（899900+100000+160000） |
| 服务端加购 Pro Max + 1TB | 返回条目 `unitPrice = 1159900` |
|  MagSafe 充电器（库存 0） | 价格区下方显示缺货提示；无法成功加购 |
| 颜色切换（不影响价格） | 价格保持不变 |

**范围外（不要求）**：颜色差价、每个规格组合独立库存、前端构建体系改造。`resolvePrice` 必须保持"前后端同一份实现"——服务端 `require`、浏览器 `<script>` 引入的方式不变。

## 六、T3 自动化测试（20%，建议 20 分钟）

项目自带 `tests/` 下 15 个测试（`npm test`，node:test，零依赖）。请为核心计算补齐测试：

1. **统一入口**：`npm test` 一条命令、离线、退出码为 0
2. **必须新增覆盖**：
   - `calcSelectedTotal`（T1 修复后）：fixture 三条数据全勾选=1199700；只勾 AirPods=299800；取消 AirPods=899900；全不勾=0；空数组/非数组=0
   - `resolvePrice`（T2 实现后）：默认规格=899900；Pro Max+1TB=1159900；未知型号差价按 0；`variant` 缺省字段不抛错
   - `formatPrice` 已在既有测试覆盖，可自行加固但不得删除原断言
3. **既有测试**：15 个必须保持通过，**不得删改**（含 skip/disable）
4. **手法约束**：不得把断言写进产品代码；不得为测试改变浏览器内行为；测试文件放 `tests/` 下，命名清晰
5. 推荐零依赖方案：继续用 `node:test` + `node:assert`（`shared/` 模块 Node 端可直接 require）

## 七、提交物与一票否决项

### 提交物（考试结束时）

| 项 | 要求 |
|---|---|
| 代码 | 基线之后的全部改动提交并推送到自己新建的 GitHub 公开仓库，在平台提交仓库根地址；本地提交、压缩包或 patch 仅作辅助材料，不能替代公开仓库 |
| 说明 | 200 字以内：每个任务的实现思路与关键决策（`SUBMISSION.md` 存于仓库根目录） |
| 测试 | `npm test` 的终端输出（通过/失败数量） |

### 一票否决项（触发即整卷不通过）

- 删除/篡改 `tests/` 下既有测试，或让其 skip/禁用以蒙混
- 修改 `server/seed.js` 种子数据、`server/auth.js` 鉴权逻辑让用例"通过"
- 按条目 id/名称硬编码特判 fixture（如 `if (id === 102) return 0`）
- `npm test` 退出码非 0，或测试依赖网络
- 新增 `console.log` 调试残留（仓库中已有的日志除外，但不得新增）

## 八、时间分配与评分权重预览

| 阶段 | 时间 | 内容 |
|---|---|---|
| 0:00-0:25 | 25 min | T1 缺陷修复 |
| 0:25-1:00 | 35 min | T2 功能实现 |
| 1:00-1:20 | 20 min | T3 自动化测试 |
| 1:20-1:30 | 10 min | 缓冲、自测与提交 |

| 权重项 | 分值 | 说明 |
|---|---|---|
| T1 缺陷修复 | 25 | 合计只算勾选 18 / 边界与接口一致 4 / 回归 3 |
| T2 功能实现 | 35 | resolvePrice 正确 15 / 购买页联动 10 / 库存状态 5 / 页面-加购-下单一致 5 |
| T3 自动化测试 | 20 | 一条命令 exit 0 得 5 / 覆盖矩阵 10 / 未破坏既有测试 5 |
| 回归与提交 | 20 | 15 个既有测试全绿 10 / 主流程冒烟不坏 5 / 提交物与代码卫生 5 |

评分细则由考官依据《02-验收标准.md》逐条判定；测试操作步骤见《03-测试用例.md》（考官用，与考生无关）。

## 平台交付与计时说明

- 编程阶段结束前推送全部改动到 GitHub 公开仓库，并在平台提交仓库根地址与启动项目时向 AI 发出的第一条完整指令。首条 Prompt 只需填入平台，不要求公开到仓库。
- 将实现说明及测试输出放在仓库内，确保管理员可从公开提交复现；不得提交 API Key、Token 或个人敏感信息。
- 无需完整 AI 操作记录。第一部分问卷、第二部分编程和第三部分 5+3 简答分别按平台计时；第三部分准备期不占简答时间。
