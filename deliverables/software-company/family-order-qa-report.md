# 家庭点菜微信小程序 — QA 验证报告

## 概要

- **项目路径**: `C:\Users\Sge\WorkBuddy\2026-07-02-11-21-13\family_order\`
- **验证日期**: 2026-07-02
- **验证范围**: 全部源文件（97个）结构完整性、代码一致性、数据模型、UI逻辑、缓存Key、金额处理、代码质量
- **发现问题总数**: 12
- **严重**: 1 | **中等**: 4 | **轻微**: 7
- **智能路由判定**: Engineer（需工程师修复源码Bug）

---

## 1. 结构完整性检查

### 1.1 页面路由注册（app.json）

| 检查项 | 结果 |
|--------|------|
| 15个页面路由全部注册 | ✅ 通过 |
| TabBar 5个页面（菜单/点餐/采购/统计/我的） | ✅ 通过 |
| cloud: true 已声明 | ✅ 通过 |
| lazyCodeLoading 已配置 | ✅ 通过 |

**app.json pages 列表与文件结构完全匹配**：login, menu, dish-detail, dish-edit, order, cart, order-summary, order-history, purchase, inventory, ingredient-edit, profile, family-manage, dietary, stats — 15个页面全部有对应的4文件（.js/.json/.wxml/.wxss）。

### 1.2 TabBar 配置

✅ 5个TabBar项配置完整，含 iconPath/selectedIconPath/text/pagePath，对应5个图标文件。

### 1.3 组件声明（页面JSON usingComponents）

| 页面 | usingComponents | 结果 |
|------|----------------|------|
| menu.json | category-tab, search-bar, dish-card, empty-state, skeleton, offline-banner | ✅ 全部存在 |
| order.json | category-tab, dish-card, cart-bar, search-bar, skeleton, empty-state | ✅ 全部存在 |
| purchase.json | ingredient-item, empty-state, skeleton | ✅ 全部存在 |
| stats.json | bar-chart, dish-card, skeleton, empty-state | ✅ 全部存在 |
| profile.json | member-avatar | ✅ 存在 |

**所有组件均有完整的4文件（.js/.json/.wxml/.wxss）**，共15个组件。

### 1.4 云函数目录结构

| 云函数 | index.js | config.json | 结果 |
|--------|----------|-------------|------|
| login | ✅ | ✅ | ✅ |
| create-family | ✅ | ✅ | ✅ |
| join-family | ✅ | ✅ | ✅ |
| submit-order | ✅ | ✅ | ✅ |
| generate-purchase-list | ✅ | ✅ | ✅ |
| calc-cost | ✅ | ✅ | ✅ |

**6个云函数全部完整**。

---

## 2. 代码一致性检查

### 2.1 app.js — 云开发初始化与全局生命周期

✅ 云开发初始化（initCloud）、全局单例初始化（CacheManager、EventBus、AuthService、FamilyService）
✅ 网络监听（_initNetworkMonitor）、恢复登录态（_restoreAuth）、主题初始化（_initTheme）
✅ onHide 保存离线队列到缓存

⚠️ **轻微问题 #7**: app.js 多处使用硬编码缓存Key字符串（'cache_pending_orders'、'cache_auth_token'、'cache_family_info'），而非引用 `CACHE_KEYS` 常量。虽然值与常量一致，但不够规范。

### 2.2 styles/variables.wxss — CSS变量系统

✅ 色彩体系（primary/success/warning/error/info + bg变体）完整
✅ 忌口标记色（--color-allergen-severe, --color-allergen-mild）已定义
✅ 字体尺寸、圆角、间距、阴影、尺寸、动画、Z层级 全部定义
**共89行，88个CSS变量，覆盖设计规范全部维度**。

### 2.3 utils/constants.js — 常量定义

✅ ORDER_STATUS、MEMBER_ROLE、PERMISSION_OPERATIONS、DISH_DIFFICULTY 全部定义
✅ CACHE_EXPIRY 时间值与架构文档一致
✅ CACHE_KEYS 全部与架构文档一致
✅ DB_COLLECTIONS、CLOUD_FUNCTIONS 全部定义
✅ NAME_LENGTH_LIMIT、FAMILY_CODE_LENGTH 等

⚠️ **轻微问题 #6**: CACHE_KEYS.DISHES_EXPIRE ('cache_dishes_expire') 已定义但从未在任何代码中使用。属于冗余定义。

### 2.4 utils/money.js — 金额计算

✅ yuanToFen/fenToYuan/fenToYuanSimple/addFen/subtractFen/multiplyFen/sumFen/formatMoney/formatMoneySimple/parseInputToFen 全部正确实现
✅ multiplyFen 使用 Math.round 避免浮点误差
✅ fenToYuan 使用 num/100 + toFixed(2)，展示用途可接受
✅ parseInputToFen 有最大金额限制（99999.99元）和负数保护

⚠️ **轻微问题 #8**: order-service.js L134 使用 `addFen(costPerDishFen * cartItem.quantity, 0)`，直接 `*` 运算而非 `multiplyFen()`。虽整数运算安全，但不符合最佳实践。

⚠️ **轻微问题 #9**: purchase-service.js L160 `estimatedCostFen = purchaseQuantity * pricePerUnitFen`，同上，直接乘法而非 multiplyFen。

⚠️ **轻微问题 #11**: stats-service.js L145 `(item.quantity || 1) * (item.costPerDish || 0)`，直接乘法而非 multiplyFen。

### 2.5 utils/cache.js — 缓存管理器

✅ set/get/remove/clearAll/clearExpired 全部实现
✅ _isExpired 支持 -1（不过期）、'daily'（当日有效）、毫秒数过期
✅ getCart/setCart/removeCart 使用 CACHE_KEYS.CART + memberId
✅ getTodayOrder/setTodayOrder 使用 CACHE_KEYS.TODAY_ORDER + 'daily'过期
✅ 搜索历史管理（去重、最多10条）

### 2.6 utils/dietary-check.js — 忌口检测

✅ checkDishConflicts 算法正确（匹配 ingredientId 或 name）
✅ 严重程度分级逻辑正确（severe > mild > caution）
✅ getConflictLabels 返回展示标签含颜色
✅ sortByPreference 按偏好排序
✅ filterSafeDishes 仅过滤严重过敏

### 2.7 utils/network.js — 离线队列与网络监听

✅ isOnline、withNetworkCheck、addToOfflineQueue 功能完整
✅ showOfflineToast/showOnlineToast/showToast/showLoading/showConfirm 全部实现

⚠️ **轻微问题 #5**: L4 `const app = getApp();` 在模块加载时调用，但该变量未被使用（后续代码都重新调用 `getApp()`）。可能在小程序未初始化时抛异常。

### 2.8 utils/event-bus.js — 事件总线

✅ on/off/once/emit/clear/hasListeners 全部实现
✅ emit 中复制监听列表避免遍历中修改
✅ once 触发后自动移除
✅ handler 内异常有 try-catch 保护

---

## 3. 数据模型一致性检查

### 3.1 Family 模型

| 字段 | 云函数 create-family | 前端 family-service | 结果 |
|------|---------------------|---------------------|------|
| familyCode | ✅ 生成并存储 | ✅ 读取展示 | 一致 |
| name | ✅ 存储 | ✅ 读取展示 | 一致 |
| adminId | ✅ 存储OPENID | ✅ 读取展示 | 一致 |

### 3.2 Member 模型

| 字段 | 云函数 login | 云函数 join-family | 前端 family-service | 结果 |
|------|-------------|--------------------|--------------------|------|
| openid | ✅ | ✅ | ✅ | 一致 |
| nickname | ✅ | ✅ | ✅ | 一致 |
| role | ✅ member/admin | ✅ member | ✅ | 一致 |
| identity | ✅ | ✅ | ✅ | 一致 |
| bigFontMode | ✅ false | ✅ | ✅ | 一致 |
| darkMode | ✅ false | ✅ | ✅ | 一致 |

### 3.3 Dish 模型

| 字段 | dish-service createDish | 前端引用 | 结果 |
|------|------------------------|----------|------|
| name | ✅ | ✅ | 一致 |
| category | ✅ | ✅ | 一致 |
| images | ✅ [] | ✅ | 一致 |
| ingredients[{ingredientId,name,quantity,unit}] | ✅ | ✅ | 一致 |
| tags | ✅ [] | ✅ | 一致 |
| isAvailable | ✅ true | ✅ | 一致 |
| **totalCost** | ❌ 未定义 | ⚠️ 多处引用 | **不一致 — 严重Bug** |

🔴 **严重问题 #1**: Dish 数据模型中**不存在 `totalCost` 字段**，但以下3处代码引用了它：
- `dish-card.js` L22: `dish.totalCost ? fenToYuan(dish.totalCost) : ''`
- `order.js` L80: `priceFen: dish ? (dish.totalCost || 0) : 0`
- `cart.js` L37-38: `pricePerUnitFen: dish ? (dish.totalCost || 0) : 0`

**影响**: dish-card 永不显示价格，购物车价格始终为0，订单成本计算为0。而 `dish-detail.js` 正确使用了 `ingredientService.calcDishCost(dishId)` 计算成本。

**修复方案**: Dish 模型需增加 `totalCost` 字段，或在 dish-service.getDishList/getDishDetail 中为每个菜品附加计算后的成本值。

### 3.4 Order 模型

| 字段 | order-service submitOrder | 云函数 submit-order | 结果 |
|------|--------------------------|--------------------|------|
| date(YYYY-MM-DD) | ✅ getToday() | ✅ 手动拼接 | 一致 |
| status | ✅ ordering | ✅ ordering | 一致 |
| items[{memberId,dishId,quantity,notes}] | ✅ | ✅ | 一致 |
| totalCost(分) | ✅ | ✅ | 一致 |

### 3.5 Ingredient 模型

| 字段 | ingredient-service | 云函数引用 | 结果 |
|------|--------------------|-----------|------|
| name | ✅ | ✅ | 一致 |
| unit | ✅ | ✅ | 一致 |
| pricePerUnit(分) | ✅ yuanToFen转换 | ✅ 直接存储分 | 一致 |
| stockQuantity | ✅ | ✅ | 一致 |

---

## 4. UI 页面逻辑检查

### 4.1 菜单页（menu）

✅ 分类Tab + 菜品列表 + 搜索 + 忌口标记逻辑完整
✅ onCategoryChange、onSearch、onSearchClear 事件绑定正确
✅ dietaryConflictMap 通过 dietaryService.batchCheckConflicts 获取
✅ skeleton/empty-state/offline-banner 条件渲染正确

⚠️ **中等问题 #3**: menu.wxml L30 `bind:action="onAddDish"`，但 menu.js 中**未定义 `onAddDish` 方法**。点击"添加菜品"按钮会触发运行时错误。

### 4.2 点餐页（order）

✅ 分类Tab + 菜品列表 + 购物车底部栏逻辑完整
✅ onAddToCart → addToCart → _refreshCart 流程正确
✅ cart-bar 的 itemCount/totalCostFen/totalCostYuan 数据绑定正确

🔴 **严重问题 #1（同上）**: order.js L80 `priceFen: dish ? (dish.totalCost || 0) : 0`，dish.totalCost 不存在，购物车价格永远为0。

### 4.3 采购页（purchase）

✅ 采购清单展示 + 按分类分组 + 复制清单 + 管理食材库入口
✅ fenToYuan 金额展示正确
✅ generatePurchaseList 逻辑完整（对照库存计算采购量）

⚠️ **中等问题 #4**: purchase.wxml L17 `data-index="{{item._originalIndex}}"`，但 `_originalIndex` 属性在 purchase.js 的格式化数据中**从未设置**。purchase.js L85 的 `onItemCheck` 使用 `e.currentTarget.dataset.index` 获取索引，该值将为 undefined，导致勾选功能无法正常工作。

### 4.4 统计页（stats）

✅ 月度汇总 + 柱状图(bar-chart) + 菜品排行逻辑完整
✅ 月份选择器(picker)绑定正确
✅ fenToYuan 金额展示正确
✅ bar-chart 组件完整实现（Canvas绘制柱状图）

### 4.5 我的页（profile）

✅ 角色展示 + 功能入口完整
✅ 大字模式/深色模式切换正确（调用 app.toggleBigFont/toggleTheme）
✅ 家庭信息异步获取
✅ 退出登录清除缓存并跳转

---

## 5. 组件逻辑检查

### 5.1 dish-card

✅ 图片 + 标签 + 忌口徽章 + 难度 + 时间 展示逻辑正确
✅ dietaryConflict observer → getConflictLabels → 颜色标签
✅ showPrice/showTags/showConflict/compact 属性控制展示

🔴 **严重问题 #1（同上）**: L22 `dish.totalCost ? fenToYuan(dish.totalCost) : ''`，totalCost字段不存在。

### 5.2 quantity-stepper

✅ 加减控件逻辑正确
✅ 最小值 min=1，Math.max(this.data.min, this.data.value - this.data.step)
✅ 最大值 max=99，Math.min(this.data.max, this.data.value + this.data.step)
✅ triggerEvent('change', { value: newVal }) 事件正确

### 5.3 cart-bar

✅ 购物车数量(itemCount) + 总价(totalCostFen) + 提交按钮
✅ totalCostFen observer → fenToYuan → displayCost
✅ disabled 属性控制按钮可用状态

### 5.4 allergen-badge

✅ 严重(severe → 红色/--color-allergen-severe) + 轻微(mild → 黄色/--color-allergen-mild) 两级显示
✅ severity observer → ALLERGEN_SEVERITY_CONFIG → label/color/bgColor

⚠️ **轻微问题 #10**: allergen-badge 支持3个严重级别(severe/mild/caution)，而PRD描述为"严重(红色)/轻微(黄色)两级显示"。caution级别为额外扩展，轻微偏离规范但功能更完善。

### 5.5 offline-banner

✅ isOffline 属性绑定正确
✅ retry 事件触发正确
✅ 显示/隐藏由页面 isOffline 数据控制

---

## 6. 缓存 Key 统一性检查

| 缓存Key | constants定义 | 实际使用 | 过期时间 | 结果 |
|---------|-------------|---------|---------|------|
| cache_dishes | ✅ | ✅ dish-service | 24h | ✅ 一致 |
| cache_dishes_expire | ✅ | ❌ 未使用 | — | ⚠️ 冗余 |
| cache_ingredients | ✅ | ✅ ingredient-service | 24h | ✅ 一致 |
| cache_cart_{memberId} | ✅ | ✅ order-service/cart | 不过期(-1) | ✅ 一致 |
| cache_pending_orders | ✅ | ✅ app.js/network.js | 不过期(-1) | ✅ 一致 |
| cache_today_order | ✅ | ✅ order-service | 当日(daily) | ✅ 一致 |
| cache_family_info | ✅ | ✅ family-service/auth-service | 7天 | ✅ 一致 |
| cache_search_history | ✅ | ✅ dish-service/cache.js | 不过期(-1) | ✅ 一致 |
| cache_auth_token | ✅ | ✅ auth-service/app.js | 30天 | ✅ 一致 |
| cache_member_dietary_{memberId} | ✅ | ✅ dietary-service | 24h | ✅ 一致 |

**9/10 缓存Key使用一致**。`cache_dishes_expire` 为冗余定义。

⚠️ app.js 使用硬编码字符串而非 CACHE_KEYS 常量（轻微问题 #7）。

---

## 7. 金额处理检查

### 7.1 存储层（分单位整数）

| 位置 | 检查项 | 结果 |
|------|--------|------|
| ingredient-service createIngredient | pricePerUnit: yuanToFen(输入值) | ✅ 以分存储 |
| ingredient-service updateIngredient | data.pricePerUnit = yuanToFen(输入值) | ✅ 以分存储 |
| order-service submitOrder | totalCost: totalCostFen | ✅ 以分存储 |
| 云函数 submit-order | totalCost: totalCostFen | ✅ 以分存储 |
| 云函数 calc-cost | costPerDish/totalCost 全为分 | ✅ 以分存储 |
| 云函数 generate-purchase-list | estimatedCost 以分 | ✅ 以分存储 |

### 7.2 展示层（fenToYuan/formatMoney 转换）

| 位置 | 检查项 | 结果 |
|------|--------|------|
| dish-card.js | fenToYuan(dish.totalCost) | ⚠️ totalCost不存在 |
| cart-bar.js | fenToYuan(totalCostFen) | ✅ |
| ingredient-item.js | fenToYuan(ing.pricePerUnit) | ✅ |
| purchase.js | fenToYuan(item.estimatedCost) | ✅ |
| stats.js | fenToYuan(d.costFen/d.totalCostFen) | ✅ |
| inventory.js | fenToYuan(ing.pricePerUnit) | ✅ |
| dish-detail.js | fenToYuan(costFen) | ✅ |

### 7.3 浮点运算避免

| 位置 | 检查项 | 结果 |
|------|--------|------|
| multiplyFen | Math.round(fenPerUnit * quantity) | ✅ |
| addFen | 整数加法 | ✅ |
| sumFen | reduce + addFen | ✅ |
| calcDishCost | multiplyFen(pricePerUnitFen, quantity) | ✅ |
| 云函数 calcDishCostFen | Math.round(pricePerUnit * quantity) | ✅ |

⚠️ 3处直接乘法而非 multiplyFen（轻微问题 #8、#9、#11），虽运算安全但不规范。

---

## 8. 代码质量检查

### 8.1 占位符/TODO检查

✅ 全项目无 TODO、FIXME、pass、省略号占位符。

### 8.2 语法错误检查

✅ 无明显语法错误。所有 JS 文件语法正确。

### 8.3 错误处理完整性

| 模块 | try-catch 包裹 | 结果 |
|------|---------------|------|
| 所有 service 层方法 | ✅ | ✅ |
| 云函数 main | ✅ | ✅ |
| cloud-adapter 所有方法 | ✅ | ✅ |
| 页面 JS 异步操作 | ✅ | ✅ |

### 8.4 云函数返回格式

| 云函数 | {code, data, message} | 结果 |
|--------|----------------------|------|
| login | ✅ | ✅ |
| create-family | ✅ | ✅ |
| join-family | ✅ | ✅ |
| submit-order | ✅ | ✅ |
| generate-purchase-list | ✅ | ✅ |
| calc-cost | ✅ | ✅ |

### 8.5 其他质量问题

⚠️ **中等问题 #2**: cloud-adapter.js `_sanitizeArrays()` 方法逻辑Bug。

```javascript
// L258: value === null && Array.isArray(value) === false
// 当 value === null 时，Array.isArray(null) 恒为 false
// 因此条件简化为 value === null，所有 null 字段都变成 []
// 注释说"字段为 null 时不写入"，但代码实际写入 []
```

影响：非数组类型的 null 字段（如 notes、identity 等字符串字段）会被错误地设为 `[]`。

---

## 9. 发现的问题清单（按严重程度排序）

### 🔴 严重（1个）— 需 Engineer 修复

| # | 文件 | 行号 | 问题描述 | 影响 |
|---|------|------|---------|------|
| 1 | dish-card.js L22, order.js L80, cart.js L37-38 | 多处 | Dish 模型无 `totalCost` 字段，但3处代码引用 `dish.totalCost` 作为菜品价格来源 | 菜品卡片不显示价格，购物车价格永远为0，订单成本为0。dish-detail.js 正确使用 calcDishCost 计算，说明开发者遗漏了在列表场景为菜品附加成本数据。 |

### 🟡 中等（4个）— 需 Engineer 修复

| # | 文件 | 行号 | 问题描述 | 影响 |
|---|------|------|---------|------|
| 2 | cloud-adapter.js | L258 | `_sanitizeArrays` 逻辑Bug：`value === null && Array.isArray(value) === false` 恒为 `value === null`，所有null字段错误变成 `[]` | null字符串字段（如 notes、identity）会变成空数组，数据类型不匹配 |
| 3 | menu.js / menu.wxml | L30(WXML) | WXML引用 `bind:action="onAddDish"` 但 menu.js 未定义该方法 | 空状态点击"添加菜品"按钮会报运行时错误 |
| 4 | purchase.js / purchase.wxml | L17(WXML), L85(JS) | WXML引用 `item._originalIndex` 但数据中从未设置该属性；JS `onItemCheck` 使用 `e.currentTarget.dataset.index` 获取索引，值为 undefined | 采购清单勾选功能无法正常工作 |
| 5 | cloud-adapter.js / join-family/index.js | L62(云函数) | 云函数 join-family 在L62直接访问 `memberRes.data[0]._id`，但未检查 `memberRes.data.length > 0` | 若用户无Member记录（理论上不应发生但缺少防御），会导致运行时崩溃 |

### 🟢 轻微（7个）— 可选修复

| # | 文件 | 行号 | 问题描述 |
|---|------|------|---------|
| 6 | constants.js | L65 | `CACHE_KEYS.DISHES_EXPIRE` 定义后从未使用，属于冗余 |
| 7 | app.js | L74,84,98,154,210 | 使用硬编码缓存Key字符串而非 `CACHE_KEYS` 常量，虽值一致但不规范 |
| 8 | order-service.js | L134 | `addFen(costPerDishFen * cartItem.quantity, 0)` 直接乘法而非 `multiplyFen()` |
| 9 | purchase-service.js | L160 | `purchaseQuantity * pricePerUnitFen` 直接乘法而非 `multiplyFen()` |
| 10 | allergen-badge.js | — | 支持3级(severe/mild/caution)严重程度，PRD描述为2级(严重/轻微)。caution为额外扩展 |
| 11 | stats-service.js | L145 | `(item.quantity || 1) * (item.costPerDish || 0)` 直接乘法而非 `multiplyFen()` |
| 12 | network.js | L4 | `const app = getApp()` 在模块顶层调用，该变量未被使用，可能在小程序未初始化时抛异常 |

---

## 10. 智能路由判定

### 判定结果：**Engineer**

**理由**：发现1个严重源码Bug（Dish模型缺少totalCost字段导致价格展示和购物车成本计算失效）和4个中等源码Bug（_sanitizeArrays逻辑错误、缺失方法、缺失数据属性、缺少防御性检查），这些均属于源码实现层面的问题，需由工程师修复源码。QA验证代码本身无错误。

### 修复优先级建议

| 优先级 | 问题# | 修复方案 |
|--------|-------|---------|
| P0-紧急 | #1 | Dish模型增加 `totalCost` 字段，或在 dish-service.getDishList 返回数据时为每个菜品附加 `totalCost: await ingredientService.calcDishCost(dish._id)` |
| P1-重要 | #2 | `_sanitizeArrays` 修正：null 字段应省略不写入（delete from result），而非设为 `[]` |
| P1-重要 | #3 | menu.js 增加 `onAddDish` 方法（导航到 dish-edit 页面） |
| P1-重要 | #4 | purchase.js 在格式化数据时为每项添加 `_originalIndex` 属性（`formatted.map((item, index) => ({ ...item, _originalIndex: index }))`） |
| P2-建议 | #5-#12 | 各轻微问题可后续迭代修复 |

---

## 11. 亮点与正面评价

1. **缓存策略设计优秀**：CacheManager 支持 -1/daily/ms 三种过期策略，搜索历史去重+限10条，购物车按 memberId 分离
2. **金额处理核心正确**：money.js 以分为单位整数运算，multiplyFen 使用 Math.round，整个金额体系设计理念正确
3. **忌口检测算法完善**：ingredientId/name 双匹配、三级严重程度、偏好排序、安全过滤
4. **云函数统一返回格式**：所有6个云函数均返回 {code, data, message}，错误处理完整
5. **事件总线实现健壮**：emit 中复制监听列表、once 自动移除、handler 异常捕获
6. **离线处理完整**：网络监听 + 离线队列 + 恢复提交 + 降级到缓存
7. **代码无占位符**：全部97个源文件无 TODO/FIXME/pass/省略号

---

*第1轮验证结束 — QA工程师 Edward*

---

## 12. 第2轮回归验证报告

- **验证日期**: 2026-07-02（Round 2）
- **验证范围**: 仅验证工程师修复的5个文件
- **验证轮次**: 第2轮（最终轮，最多2轮）
- **修复文件**: dish-service.js, cloud-adapter.js, menu.js, purchase.js, join-family/index.js

### Bug #1 回归验证（严重 — Dish模型缺少 totalCost）

**修复文件**: `miniprogram/services/dish-service.js`

**验证要点**:
- getDishList 是否为每个菜品附加了 totalCost（通过 ingredientService.calcDishCost 计算）
- getDishDetail 是否为菜品附加了 totalCost

**验证结果**:

| 检查项 | 代码位置 | 结果 |
|--------|---------|------|
| getDishList 附加 totalCost | L46-48: `for (const dish of dishes) { dish.totalCost = await this._ingredientService.calcDishCost(dish._id); }` | ✅ 已修复 |
| getDishDetail 附加 totalCost | L92-93: `dish.totalCost = await this._ingredientService.calcDishCost(dishId);` | ✅ 已修复 |
| 引用 dish.totalCost 的下游代码现在有数据来源 | dish-card.js L22, order.js L80, cart.js L37-38 | ✅ 数据链路完整 |

**结论**: ✅ **已修复** — dish-service 通过 IngredientService.calcDishCost 为每个菜品动态计算 totalCost，下游消费者（dish-card、order、cart）的 `dish.totalCost` 引用现在有完整数据来源。

---

### Bug #2 回归验证（中等 — _sanitizeArrays 逻辑Bug）

**修复文件**: `miniprogram/services/cloud-adapter.js`

**验证要点**:
- 是否使用 ARRAY_FIELDS 白名单替代原来的 `value === null && Array.isArray(value) === false` 条件
- 白名单数组字段 null → [] 是否正确
- 非白名单 null 字段是否从结果中删除（不写入 result）

**验证结果**:

| 检查项 | 代码位置 | 结果 |
|--------|---------|------|
| ARRAY_FIELDS 白名单定义 | L257-260: `['images', 'tags', 'ingredients', 'items', 'allergens', 'dislikes', 'preferences', 'steps', 'costBreakdown']` | ✅ 白名单完整，覆盖所有已知数组字段 |
| 白名单字段 null → [] | L264-268: `if (value === null) { if (ARRAY_FIELDS.includes(key)) { result[key] = []; } }` | ✅ 正确转换 |
| 非白名单 null 字段不写入 | L269 注释: `// 非白名单的 null 字段：不写入 result，即删除` | ✅ null 非白名单字段被跳过，不写入 result |

**结论**: ✅ **已修复** — `_sanitizeArrays` 现使用白名单机制，只有已知数组字段在 null 时转换为 `[]`，其余 null 字段直接省略不写入结果对象，符合"null 字段不写入让数据库保持默认"的设计意图。

---

### Bug #3 回归验证（中等 — menu.js 缺失 onAddDish 方法）

**修复文件**: `miniprogram/pages/menu/menu.js`

**验证要点**:
- 是否新增了 onAddDish 方法
- 方法是否导航到 dish-edit 页面
- menu.wxml 的 `bind:action="onAddDish"` 是否有对应方法

**验证结果**:

| 检查项 | 代码位置 | 结果 |
|--------|---------|------|
| onAddDish 方法存在 | L138-140: `onAddDish() { wx.navigateTo({ url: '/pages/dish-edit/dish-edit' }); }` | ✅ 方法已定义 |
| 导航目标正确 | `/pages/dish-edit/dish-edit` | ✅ 对应 dish-edit 页面（app.json 已注册该路由） |
| WXML bind:action 有对应方法 | menu.wxml L30 `bind:action="onAddDish"` → menu.js L138 | ✅ 绑定匹配 |

**结论**: ✅ **已修复** — menu.js 新增 `onAddDish()` 方法，导航到菜品编辑页，WXML绑定与方法一致。

---

### Bug #4 回归验证（中等 — purchase.js 缺失 _originalIndex）

**修复文件**: `miniprogram/pages/purchase/purchase.js`

**验证要点**:
- 格式化数据时是否为每项附加了 _originalIndex 属性
- onItemCheck 中 `e.currentTarget.dataset.index` 是否有数据来源

**验证结果**:

| 检查项 | 代码位置 | 结果 |
|--------|---------|------|
| _originalIndex 属性设置 | L55-58: `formatted.forEach((item, index) => { item._originalIndex = index; });` | ✅ 每项附加了原始索引 |
| WXML data-index 有数据来源 | purchase.wxml L17 `data-index="{{item._originalIndex}}"` → purchase.js L56-58 | ✅ 数据链路完整 |
| onItemCheck 正确使用索引 | L90-91: `const index = e.currentTarget.dataset.index; const list = [...this.data.purchaseList]; list[index].isChecked = !list[index].isChecked;` | ✅ 索引有效，勾选功能可正常工作 |

**结论**: ✅ **已修复** — purchase.js 在格式化采购清单数据时为每项附加 `_originalIndex`（从0开始的整数索引），WXML 的 `data-index` 和 JS 的 `onItemCheck` 数据链路完整。

---

### Bug #5 回归验证（中等 — join-family 缺少防御检查）

**修复文件**: `cloudfunctions/join-family/index.js`

**验证要点**:
- 是否在访问 memberRes.data[0]._id 之前添加了 memberRes.data.length > 0 的防御检查
- 防御检查的处理方式是否合理

**验证结果**:

| 检查项 | 代码位置 | 结果 |
|--------|---------|------|
| 防御检查存在 | L61-64: `if (!memberRes.data || memberRes.data.length === 0) { return { code: -1, data: null, message: '用户信息异常，请重新登录' }; }` | ✅ 检查已添加 |
| 检查位置正确（在访问 data[0] 之前） | L62 检查 → L67 访问 memberRes.data[0]._id | ✅ 顺序正确 |
| 返回格式符合云函数规范 | `{ code: -1, data: null, message: '...' }` | ✅ 符合 {code, data, message} 格式 |

**结论**: ✅ **已修复** — join-family 云函数在访问 `memberRes.data[0]._id` 之前新增了防御检查，若用户无 Member 记录则返回错误码 -1 并提示重新登录，避免运行时崩溃。

---

### 回归验证总结

| Bug编号 | 严重程度 | 验证结果 |
|---------|---------|---------|
| #1 | 🔴 严重 | ✅ 已修复 |
| #2 | 🟡 中等 | ✅ 已修复 |
| #3 | 🟡 中等 | ✅ 已修复 |
| #4 | 🟡 中等 | ✅ 已修复 |
| #5 | 🟡 中等 | ✅ 已修复 |

**全部5个Bug均已修复，0个未修复。**

### 整体判定：**ALL_PASS**

5个修复文件均通过回归验证，修复方案与QA报告建议的修复方案一致：

| Bug | QA建议修复方案 | 工程师实际修复方案 | 一致性 |
|-----|-------------|-----------------|--------|
| #1 | dish-service 为菜品附加 totalCost（通过 calcDishCost） | getDishList L46-48 + getDishDetail L92-93 附加 calcDishCost 结果 | ✅ 一致 |
| #2 | _sanitizeArrays 使用白名单，null 非白名单字段不写入 | ARRAY_FIELDS 白名单 + null 非白名单跳过 | ✅ 一致 |
| #3 | menu.js 增加 onAddDish → navigateTo dish-edit | L138-140 新增方法，导航到 dish-edit | ✅ 一致 |
| #4 | purchase.js 附加 _originalIndex | L55-58 forEach 附加 index | ✅ 一致 |
| #5 | join-family 添加 memberRes.data.length 检查 | L61-64 防御检查 + 返回错误 | ✅ 一致 |

### 智能路由判定：**NoOne**

第1轮发现的所有5个严重/中等Bug已由工程师修复并通过回归验证。7个轻微问题属可选修复范畴，不影响核心功能。无需进一步路由。

### 遗留轻微问题（7个，不影响核心功能）

这些轻微问题在第1轮中已记录，属 P2-建议级别，可在后续迭代中优化：
- #6: CACHE_KEYS.DISHES_EXPIRE 冗余定义
- #7: app.js 硬编码缓存Key字符串
- #8: order-service.js 直接乘法而非 multiplyFen
- #9: purchase-service.js 直接乘法而非 multiplyFen
- #10: allergen-badge 3级而非PRD的2级
- #11: stats-service.js 直接乘法而非 multiplyFen
- #12: network.js 未使用的顶层 getApp()

---

*第2轮回归验证结束 — QA工程师 Edward*
*最终判定：ALL_PASS | 智能路由：NoOne*
