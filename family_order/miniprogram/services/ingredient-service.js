/**
 * ingredient-service.js — 食材服务
 * 食材 CRUD、库存管理、成本计算、过期预警
 */
const { CloudAdapter } = require('./cloud-adapter');
const { DB_COLLECTIONS, CACHE_KEYS, CACHE_EXPIRY } = require('../utils/constants');
const { CacheManager } = require('../utils/cache');
const { yuanToFen, fenToYuan, multiplyFen, formatMoney } = require('../utils/money');
const { getUnitName, toBaseUnit, getBasePricePerUnit } = require('../utils/unit');
const { isExpired, getToday } = require('../utils/date');

class IngredientService {
  constructor() {
    this.adapter = new CloudAdapter();
    this.cache = (getApp() || {}).cache || new CacheManager();
  }

  /**
   * 获取食材列表
   * 优先缓存
   * @returns {Promise<Array>}
   */
  async getIngredientList() {
    try {
      const cached = this.cache.get(CACHE_KEYS.INGREDIENTS);
      if (cached) return cached;

      const app = getApp();
      const familyId = app.globalData.familyId;
      if (!familyId) return [];

      const ingredients = await this.adapter.query(DB_COLLECTIONS.INGREDIENT, {
        familyId,
      }, {
        orderBy: [{ field: 'category', direction: 'asc' }, { field: 'createdAt', direction: 'asc' }],
      });

      this.cache.set(CACHE_KEYS.INGREDIENTS, ingredients, CACHE_EXPIRY.INGREDIENTS);
      return ingredients;
    } catch (err) {
      console.error('[IngredientService] getIngredientList失败:', err);
      const cached = this.cache.get(CACHE_KEYS.INGREDIENTS);
      return cached || [];
    }
  }

  /**
   * 创建食材
   * @param {Object} ingredientData
   * @returns {Promise<string>}
   */
  async createIngredient(ingredientData) {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;

      // 金额以分存储
      const pricePerUnitFen = yuanToFen(ingredientData.pricePerUnit || 0);

      const data = {
        familyId,
        name: ingredientData.name || '',
        unit: ingredientData.unit || 'g',
        pricePerUnit: pricePerUnitFen,
        stockQuantity: ingredientData.stockQuantity || 0,
        stockUpdatedAt: new Date(),
        expiryDate: ingredientData.expiryDate || '',
        type: ingredientData.type || 'permanent',
        category: ingredientData.category || 'other',
        createdAt: new Date(),
      };

      const id = await this.adapter.add(DB_COLLECTIONS.INGREDIENT, data);

      this.cache.remove(CACHE_KEYS.INGREDIENTS);
      return id;
    } catch (err) {
      console.error('[IngredientService] createIngredient失败:', err);
      throw err;
    }
  }

  /**
   * 更新食材信息
   * @param {string} id - 食材ID
   * @param {Object} data - 更新数据
   * @returns {Promise<boolean>}
   */
  async updateIngredient(id, data) {
    try {
      // 金额字段转换
      if (data.pricePerUnit !== undefined) {
        data.pricePerUnit = yuanToFen(data.pricePerUnit);
      }

      const success = await this.adapter.update(DB_COLLECTIONS.INGREDIENT, id, data);

      if (success) {
        this.cache.remove(CACHE_KEYS.INGREDIENTS);
      }
      return success;
    } catch (err) {
      console.error('[IngredientService] updateIngredient失败:', err);
      throw err;
    }
  }

  /**
   * 更新库存数量
   * @param {string} ingredientId
   * @param {number} quantity - 新库存数量
   * @returns {Promise<boolean>}
   */
  async updateStock(ingredientId, quantity) {
    try {
      const success = await this.adapter.update(DB_COLLECTIONS.INGREDIENT, ingredientId, {
        stockQuantity: quantity,
        stockUpdatedAt: new Date(),
      });

      if (success) {
        this.cache.remove(CACHE_KEYS.INGREDIENTS);
      }
      return success;
    } catch (err) {
      console.error('[IngredientService] updateStock失败:', err);
      throw err;
    }
  }

  /**
   * 根据订单扣减库存
   * @param {string} orderId
   * @returns {Promise<boolean>}
   */
  async deductStockByOrder(orderId) {
    try {
      // 获取订单详情
      const order = await this.adapter.getOne(DB_COLLECTIONS.ORDER, orderId);
      if (!order) return false;

      const items = order.items || [];
      // 对每道菜的食材扣减库存
      for (const item of items) {
        const dish = await this.adapter.getOne(DB_COLLECTIONS.DISH, item.dishId);
        if (!dish) continue;

        const ingredients = dish.ingredients || [];
        for (const ing of ingredients) {
          // 查找食材记录
          const ingredientRecords = await this.adapter.query(DB_COLLECTIONS.INGREDIENT, {
            _id: ing.ingredientId,
          });
          if (ingredientRecords.length === 0) continue;

          const ingredient = ingredientRecords[0];
          const deduction = (ing.quantity || 0) * (item.quantity || 1);
          const newStock = Math.max(0, (ingredient.stockQuantity || 0) - deduction);

          await this.adapter.update(DB_COLLECTIONS.INGREDIENT, ingredient._id, {
            stockQuantity: newStock,
            stockUpdatedAt: new Date(),
          });
        }
      }

      this.cache.remove(CACHE_KEYS.INGREDIENTS);
      return true;
    } catch (err) {
      console.error('[IngredientService] deductStockByOrder失败:', err);
      throw err;
    }
  }

  /**
   * 获取过期预警食材列表
   * @returns {Promise<Array>} 即将过期或已过期的食材
   */
  async getExpiryWarnings() {
    try {
      const ingredients = await this.getIngredientList();
      const today = getToday();

      return ingredients.filter((ing) => {
        if (!ing.expiryDate) return false;
        // 3天内过期或已过期
        const daysLeft = Math.ceil((new Date(ing.expiryDate).getTime() - new Date(today).getTime()) / (24 * 3600 * 1000));
        return daysLeft <= 3;
      }).map((ing) => ({
        ...ing,
        daysLeft: Math.ceil((new Date(ing.expiryDate).getTime() - new Date(today).getTime()) / (24 * 3600 * 1000)),
        isExpired: isExpired(ing.expiryDate),
      }));
    } catch (err) {
      console.error('[IngredientService] getExpiryWarnings失败:', err);
      return [];
    }
  }

  /**
   * 计算菜品成本（基于食材单价）
   * @param {string} dishId
   * @returns {Promise<number>} 成本金额（分）
   */
  async calcDishCost(dishId) {
    try {
      const dish = await this.adapter.getOne(DB_COLLECTIONS.DISH, dishId);
      if (!dish) return 0;

      const dishIngredients = dish.ingredients || [];
      let totalCostFen = 0;

      for (const ing of dishIngredients) {
        // 查找食材单价
        const ingredientRecords = await this.adapter.query(DB_COLLECTIONS.INGREDIENT, {
          _id: ing.ingredientId,
        });
        if (ingredientRecords.length === 0) continue;

        const ingredient = ingredientRecords[0];
        const pricePerUnitFen = ingredient.pricePerUnit || 0;
        const quantity = ing.quantity || 0;
        const costFen = multiplyFen(pricePerUnitFen, quantity);
        totalCostFen = totalCostFen + costFen;
      }

      return totalCostFen;
    } catch (err) {
      console.error('[IngredientService] calcDishCost失败:', err);
      return 0;
    }
  }

  /**
   * 搜索食材
   * @param {string} keyword
   * @returns {Promise<Array>}
   */
  async searchIngredients(keyword) {
    try {
      const all = await this.getIngredientList();
      if (!keyword || keyword.trim() === '') return all;

      const kw = keyword.trim().toLowerCase();
      return all.filter((ing) =>
        ing.name.toLowerCase().includes(kw)
        || (ing.category && ing.category.toLowerCase().includes(kw))
      );
    } catch (err) {
      console.error('[IngredientService] searchIngredients失败:', err);
      return [];
    }
  }
}

module.exports = { IngredientService };
