/**
 * dietary-service.js — 忌口与健康适配服务
 * 成员忌口 CRUD、过敏源检测、偏好筛选
 */
const { CloudAdapter } = require('./cloud-adapter');
const { DB_COLLECTIONS, CACHE_KEYS, CACHE_EXPIRY } = require('../utils/constants');
const { CacheManager } = require('../utils/cache');
const { checkDishConflicts, sortByPreference, filterSafeDishes } = require('../utils/dietary-check');

class DietaryService {
  constructor() {
    this.adapter = new CloudAdapter();
    this.cache = (getApp() || {}).cache || new CacheManager();
  }

  /**
   * 获取成员忌口设置
   * @param {string} memberId
   * @returns {Promise<Object>} { allergens, dislikes, preferences }
   */
  async getDietary(memberId) {
    try {
      // 缓存优先
      const cached = this.cache.get(CACHE_KEYS.MEMBER_DIETARY + memberId);
      if (cached) return cached;

      const records = await this.adapter.query(DB_COLLECTIONS.MEMBER_DIETARY, {
        memberId,
      });

      if (records.length === 0) {
        // 返回默认空忌口
        const defaultDietary = {
          allergens: [],
          dislikes: [],
          preferences: [],
        };
        return defaultDietary;
      }

      const dietary = records[0];
      const result = {
        _id: dietary._id,
        memberId: dietary.memberId,
        allergens: dietary.allergens || [],
        dislikes: dietary.dislikes || [],
        preferences: dietary.preferences || [],
        updatedAt: dietary.updatedAt,
      };

      this.cache.set(CACHE_KEYS.MEMBER_DIETARY + memberId, result, CACHE_EXPIRY.MEMBER_DIETARY);
      return result;
    } catch (err) {
      console.error('[DietaryService] getDietary失败:', err);
      return { allergens: [], dislikes: [], preferences: [] };
    }
  }

  /**
   * 保存成员忌口设置
   * @param {string} memberId
   * @param {Object} dietaryData - { allergens, dislikes, preferences }
   * @returns {Promise<boolean>}
   */
  async saveDietary(memberId, dietaryData) {
    try {
      const existing = await this.adapter.query(DB_COLLECTIONS.MEMBER_DIETARY, {
        memberId,
      });

      const updateData = {
        allergens: dietaryData.allergens || [],
        dislikes: dietaryData.dislikes || [],
        preferences: dietaryData.preferences || [],
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        // 更新已有记录
        await this.adapter.update(DB_COLLECTIONS.MEMBER_DIETARY, existing[0]._id, updateData);
      } else {
        // 新增记录
        await this.adapter.add(DB_COLLECTIONS.MEMBER_DIETARY, {
          memberId,
          ...updateData,
        });
      }

      // 清除缓存
      this.cache.remove(CACHE_KEYS.MEMBER_DIETARY + memberId);
      return true;
    } catch (err) {
      console.error('[DietaryService] saveDietary失败:', err);
      throw err;
    }
  }

  /**
   * 检测菜品过敏源冲突
   * @param {string} dishId
   * @param {string} memberId
   * @returns {Promise<Object>} { hasConflict, allergenWarnings, dislikeWarnings, severity }
   */
  async checkDishAllergen(dishId, memberId) {
    try {
      const dish = await this.adapter.getOne(DB_COLLECTIONS.DISH, dishId);
      if (!dish) {
        return { hasConflict: false, allergenWarnings: [], dislikeWarnings: [], severity: 'none' };
      }

      const dietary = await this.getDietary(memberId);
      return checkDishConflicts(dish, dietary);
    } catch (err) {
      console.error('[DietaryService] checkDishAllergen失败:', err);
      return { hasConflict: false, allergenWarnings: [], dislikeWarnings: [], severity: 'none' };
    }
  }

  /**
   * 根据偏好筛选菜品列表
   * @param {Array<string>} preferences - 偏好标签ID
   * @returns {Promise<Array>}
   */
  async filterByPreference(preferences) {
    try {
      const { DishService } = require('./dish-service');
      const dishService = new DishService();
      const dishes = await dishService.getDishList();

      return sortByPreference(dishes, preferences);
    } catch (err) {
      console.error('[DietaryService] filterByPreference失败:', err);
      return [];
    }
  }

  /**
   * 批量检测菜品列表与成员忌口的冲突
   * @param {Array<Object>} dishes
   * @param {string} memberId
   * @returns {Promise<Array>} 带冲突标记的菜品列表
   */
  async batchCheckConflicts(dishes, memberId) {
    try {
      const dietary = await this.getDietary(memberId);
      return dishes.map((dish) => {
        const conflict = checkDishConflicts(dish, dietary);
        return { ...dish, dietaryConflict: conflict };
      });
    } catch (err) {
      console.error('[DietaryService] batchCheckConflicts失败:', err);
      return dishes;
    }
  }
}

module.exports = { DietaryService };
