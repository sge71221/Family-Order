/**
 * order-service.js — 点餐服务
 * 购物车操作、订单提交/查询/状态变更、实时监听
 */
const { CloudAdapter } = require('./cloud-adapter');
const { DB_COLLECTIONS, CACHE_KEYS, CACHE_EXPIRY, CLOUD_FUNCTIONS, ORDER_STATUS } = require('../utils/constants');
const { CacheManager } = require('../utils/cache');
const { addFen, sumFen, formatMoney } = require('../utils/money');
const { getToday, formatDate } = require('../utils/date');
const { addToOfflineQueue, withNetworkCheck } = require('../utils/network');
const { IngredientService } = require('./ingredient-service');

class OrderService {
  constructor() {
    this.adapter = new CloudAdapter();
    this.cache = (getApp() || {}).cache || new CacheManager();
  }

  /**
   * 添加菜品到购物车
   * @param {string} dishId
   * @param {number} quantity - 默认1
   * @param {string} notes - 备注
   * @returns {Promise<Object>} 购物车数据
   */
  addToCart(dishId, quantity = 1, notes = '') {
    const app = getApp();
    const memberId = app.globalData.memberId;

    let cart = this.cache.getCart(memberId) || [];
    const existingIndex = cart.findIndex((item) => item.dishId === dishId && item.notes === notes);

    if (existingIndex >= 0) {
      // 已存在，增加数量
      cart[existingIndex].quantity += quantity;
    } else {
      // 新增
      cart.push({
        dishId,
        quantity,
        notes,
        addedAt: Date.now(),
      });
    }

    this.cache.setCart(memberId, cart);
    return cart;
  }

  /**
   * 从购物车移除菜品
   * @param {string} dishId
   * @returns {Object} 更新后的购物车
   */
  removeFromCart(dishId) {
    const app = getApp();
    const memberId = app.globalData.memberId;

    let cart = this.cache.getCart(memberId) || [];
    cart = cart.filter((item) => item.dishId !== dishId);

    this.cache.setCart(memberId, cart);
    return cart;
  }

  /**
   * 更新购物车中菜品数量
   * @param {string} dishId
   * @param {number} quantity
   * @returns {Object}
   */
  updateCartQuantity(dishId, quantity) {
    const app = getApp();
    const memberId = app.globalData.memberId;

    let cart = this.cache.getCart(memberId) || [];
    const item = cart.find((i) => i.dishId === dishId);

    if (item) {
      item.quantity = Math.max(1, quantity);
      this.cache.setCart(memberId, cart);
    }
    return cart;
  }

  /**
   * 清空购物车
   */
  clearCart() {
    const app = getApp();
    const memberId = app.globalData.memberId;
    this.cache.removeCart(memberId);
  }

  /**
   * 获取购物车数据
   * @returns {Array}
   */
  getCart() {
    const app = getApp();
    const memberId = app.globalData.memberId;
    return this.cache.getCart(memberId) || [];
  }

  /**
   * 提交订单
   * @param {Object} cartData - 购物车数据（可选，默认从缓存获取）
   * @returns {Promise<Object>} 订单信息
   */
  async submitOrder(cartData) {
    try {
      const app = getApp();
      const memberId = app.globalData.memberId;
      const familyId = app.globalData.familyId;
      const nickname = app.globalData.nickname;

      const cart = cartData || this.getCart();
      if (!cart || cart.length === 0) {
        throw new Error('购物车为空');
      }

      // 构建订单 items
      const items = [];
      let totalCostFen = 0;
      const costBreakdown = [];

      for (const cartItem of cart) {
        const dish = await this.adapter.getOne(DB_COLLECTIONS.DISH, cartItem.dishId);
        if (!dish) continue;

        // 计算单品成本
        const ingredientService = new IngredientService();
        const costPerDishFen = await ingredientService.calcDishCost(cartItem.dishId);
        const itemTotalCostFen = addFen(costPerDishFen * cartItem.quantity, 0);

        items.push({
          memberId,
          memberName: nickname,
          dishId: cartItem.dishId,
          dishName: dish.name,
          quantity: cartItem.quantity,
          notes: cartItem.notes || '',
        });

        costBreakdown.push({
          dishId: cartItem.dishId,
          dishName: dish.name,
          quantity: cartItem.quantity,
          costPerDish: costPerDishFen,
          totalCost: itemTotalCostFen,
        });

        totalCostFen = addFen(totalCostFen, itemTotalCostFen);
      }

      // 查找今日是否已有订单
      const today = getToday();
      const existingOrders = await this.adapter.query(DB_COLLECTIONS.ORDER, {
        familyId,
        date: today,
        status: ORDER_STATUS.ORDERING,
      });

      if (existingOrders.length > 0) {
        // 今日已有订单，追加 items
        const existingOrder = existingOrders[0];
        const mergedItems = [...(existingOrder.items || []), ...items];
        const mergedBreakdown = [...(existingOrder.costBreakdown || []), ...costBreakdown];
        const mergedTotalCost = sumFen(mergedBreakdown.map((b) => b.totalCost));

        await this.adapter.update(DB_COLLECTIONS.ORDER, existingOrder._id, {
          items: mergedItems,
          totalCost: mergedTotalCost,
          costBreakdown: mergedBreakdown,
          updatedAt: new Date(),
        });

        // 清空购物车
        this.clearCart();
        this.cache.remove(CACHE_KEYS.TODAY_ORDER);

        return { orderId: existingOrder._id, items: mergedItems, totalCost: mergedTotalCost };
      }

      // 创建新订单
      const orderData = {
        familyId,
        date: today,
        status: ORDER_STATUS.ORDERING,
        items,
        totalCost: totalCostFen,
        costBreakdown,
        createdBy: memberId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const orderId = await this.adapter.add(DB_COLLECTIONS.ORDER, orderData);

      // 清空购物车
      this.clearCart();
      this.cache.remove(CACHE_KEYS.TODAY_ORDER);

      return { orderId, items, totalCost: totalCostFen };
    } catch (err) {
      console.error('[OrderService] submitOrder失败:', err);
      // 离线处理：加入离线队列
      addToOfflineQueue('submitOrder', cartData || this.getCart());
      throw err;
    }
  }

  /**
   * 获取今日订单
   * @returns {Promise<Object|null>}
   */
  async getTodayOrder() {
    try {
      // 缓存优先
      const cached = this.cache.getTodayOrder();
      if (cached) return cached;

      const app = getApp();
      const familyId = app.globalData.familyId;
      const today = getToday();

      const orders = await this.adapter.query(DB_COLLECTIONS.ORDER, {
        familyId,
        date: today,
      }, {
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      });

      if (orders.length === 0) return null;

      // 取最新订单或合并当日所有订单
      const latestOrder = orders[0];
      this.cache.setTodayOrder(latestOrder);
      return latestOrder;
    } catch (err) {
      console.error('[OrderService] getTodayOrder失败:', err);
      return this.cache.getTodayOrder();
    }
  }

  /**
   * 实时监听今日订单变化
   * @param {Function} onChange - 变化回调
   * @returns {Object} watcher 对象
   */
  watchTodayOrder(onChange) {
    const app = getApp();
    const familyId = app.globalData.familyId;
    const today = getToday();

    return this.adapter.watch(
      DB_COLLECTIONS.ORDER,
      { familyId, date: today },
      (snapshot) => {
        if (snapshot.docs && snapshot.docs.length > 0) {
          const order = snapshot.docs[0];
          this.cache.setTodayOrder(order);
          if (onChange) onChange(order);
        } else if (onChange) {
          onChange(null);
        }
      },
      (err) => {
        console.error('[OrderService] watchTodayOrder错误:', err);
      },
    );
  }

  /**
   * 获取历史订单列表
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @param {string} memberId - 筛选成员（可选）
   * @returns {Promise<Array>}
   */
  async getOrderHistory(startDate, endDate, memberId) {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;
      const cmd = this.adapter.getCmd();

      const conditions = {
        familyId,
        date: cmd.gte(startDate).and(cmd.lte(endDate)),
        status: cmd.neq(ORDER_STATUS.ORDERING), // 排除进行中的订单
      };

      const orders = await this.adapter.query(DB_COLLECTIONS.ORDER, conditions, {
        orderBy: [{ field: 'date', direction: 'desc' }],
      });

      // 按成员筛选
      if (memberId) {
        return orders.filter((order) =>
          (order.items || []).some((item) => item.memberId === memberId)
        );
      }

      return orders;
    } catch (err) {
      console.error('[OrderService] getOrderHistory失败:', err);
      return [];
    }
  }

  /**
   * 标记订单状态变更
   * @param {string} orderId
   * @param {string} status - ordering/cooking/done
   * @returns {Promise<boolean>}
   */
  async markOrderStatus(orderId, status) {
    try {
      const success = await this.adapter.update(DB_COLLECTIONS.ORDER, orderId, {
        status,
        updatedAt: new Date(),
      });

      if (success) {
        this.cache.remove(CACHE_KEYS.TODAY_ORDER);
      }
      return success;
    } catch (err) {
      console.error('[OrderService] markOrderStatus失败:', err);
      throw err;
    }
  }

  /**
   * 修改订单（增减菜品）
   * @param {string} orderId
   * @param {Array} items - 新的 items 列表
   * @returns {Promise<boolean>}
   */
  async modifyOrder(orderId, items) {
    try {
      // 重新计算成本
      const totalCostFen = sumFen(items.map((item) => item.totalCost || 0));
      const costBreakdown = items.map((item) => ({
        dishId: item.dishId,
        dishName: item.dishName,
        quantity: item.quantity,
        costPerDish: item.costPerDish || 0,
        totalCost: item.totalCost || 0,
      }));

      const success = await this.adapter.update(DB_COLLECTIONS.ORDER, orderId, {
        items,
        totalCost: totalCostFen,
        costBreakdown,
        updatedAt: new Date(),
      });

      if (success) {
        this.cache.remove(CACHE_KEYS.TODAY_ORDER);
      }
      return success;
    } catch (err) {
      console.error('[OrderService] modifyOrder失败:', err);
      throw err;
    }
  }
}

module.exports = { OrderService };
