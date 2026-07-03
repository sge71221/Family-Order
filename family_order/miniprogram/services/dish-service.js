/**
 * dish-service.js — 菜品服务
 * 菜品 CRUD、搜索、收藏、上架/下架、图片上传
 */
const { CloudAdapter } = require('./cloud-adapter');
const { DB_COLLECTIONS, CACHE_KEYS, CACHE_EXPIRY, PAGE_SIZE } = require('../utils/constants');
const { CacheManager } = require('../utils/cache');
const { generateCloudPath } = require('../utils/id');
const { getToday } = require('../utils/date');
const { IngredientService } = require('./ingredient-service');

class DishService {
  constructor() {
    this.adapter = new CloudAdapter();
    this.cache = (getApp() || {}).cache || new CacheManager();
    this._ingredientService = new IngredientService();
  }

  /**
   * 获取菜品列表
   * 优先缓存，按分类和关键词筛选
   * @param {string} category - 分类ID（可选，空则全部）
   * @param {string} keyword - 搜索关键词（可选）
   * @returns {Promise<Array>}
   */
  async getDishList(category, keyword) {
    try {
      // 缓存优先（仅无条件查询时使用缓存）
      if (!category && !keyword) {
        const cached = this.cache.get(CACHE_KEYS.DISHES);
        if (cached) return cached;
      }

      const app = getApp();
      const familyId = app.globalData.familyId;
      if (!familyId) return [];

      const conditions = { familyId, isAvailable: true };
      if (category) conditions.category = category;

      const dishes = await this.adapter.query(DB_COLLECTIONS.DISH, conditions, {
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      });

      // 为每个菜品附加 totalCost（基于食材单价计算）
      for (const dish of dishes) {
        dish.totalCost = await this._ingredientService.calcDishCost(dish._id);
      }

      // 关键词筛选
      let result = dishes;
      if (keyword && keyword.trim() !== '') {
        const kw = keyword.trim().toLowerCase();
        result = dishes.filter((d) =>
          d.name.toLowerCase().includes(kw)
          || (d.tags && d.tags.some((t) => t.toLowerCase().includes(kw)))
          || (d.notes && d.notes.toLowerCase().includes(kw))
        );
      }

      // 缓存全量列表
      if (!category && !keyword) {
        this.cache.set(CACHE_KEYS.DISHES, result, CACHE_EXPIRY.DISHES);
      }

      return result;
    } catch (err) {
      console.error('[DishService] getDishList失败:', err);
      // 降级到缓存
      const cached = this.cache.get(CACHE_KEYS.DISHES);
      return cached || [];
    }
  }

  /**
   * 获取菜品详情
   * @param {string} dishId
   * @returns {Promise<Object|null>}
   */
  async getDishDetail(dishId) {
    try {
      const dish = await this.adapter.getOne(DB_COLLECTIONS.DISH, dishId);
      if (!dish) return null;

      // 确保数组字段
      dish.images = dish.images || [];
      dish.tags = dish.tags || [];
      dish.ingredients = dish.ingredients || [];
      dish.steps = dish.steps || [];
      dish.tips = dish.tips || '';

      // 附加 totalCost（基于食材单价计算）
      dish.totalCost = await this._ingredientService.calcDishCost(dishId);

      return dish;
    } catch (err) {
      console.error('[DishService] getDishDetail失败:', err);
      return null;
    }
  }

  /**
   * 创建菜品
   * @param {Object} dishData - 菜品数据
   * @returns {Promise<string>} 新菜品ID
   */
  async createDish(dishData) {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;
      const memberId = app.globalData.memberId;

      const data = {
        familyId,
        name: dishData.name || '',
        category: dishData.category || 'other',
        images: dishData.images || [],
        notes: dishData.notes || '',
        tags: dishData.tags || [],
        difficulty: dishData.difficulty || 'easy',
        cookTime: dishData.cookTime || 0,
        isAvailable: dishData.isAvailable !== undefined ? dishData.isAvailable : true,
        ingredients: dishData.ingredients || [],
        steps: dishData.steps || [],
        tips: dishData.tips || '',
        avgRating: 0,
        ratingCount: 0,
        orderCount: 0,
        createdBy: memberId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const id = await this.adapter.add(DB_COLLECTIONS.DISH, data);

      // 清除缓存
      this.cache.remove(CACHE_KEYS.DISHES);
      return id;
    } catch (err) {
      console.error('[DishService] createDish失败:', err);
      throw err;
    }
  }

  /**
   * 更新菜品
   * @param {string} dishId
   * @param {Object} dishData
   * @returns {Promise<boolean>}
   */
  async updateDish(dishId, dishData) {
    try {
      const updateData = { ...dishData, updatedAt: new Date() };
      const success = await this.adapter.update(DB_COLLECTIONS.DISH, dishId, updateData);

      if (success) {
        this.cache.remove(CACHE_KEYS.DISHES);
      }
      return success;
    } catch (err) {
      console.error('[DishService] updateDish失败:', err);
      throw err;
    }
  }

  /**
   * 删除菜品
   * @param {string} dishId
   * @returns {Promise<boolean>}
   */
  async deleteDish(dishId) {
    try {
      const success = await this.adapter.remove(DB_COLLECTIONS.DISH, dishId);

      if (success) {
        this.cache.remove(CACHE_KEYS.DISHES);
      }
      return success;
    } catch (err) {
      console.error('[DishService] deleteDish失败:', err);
      throw err;
    }
  }

  /**
   * 切换菜品上架/下架状态
   * @param {string} dishId
   * @param {boolean} isAvailable
   * @returns {Promise<boolean>}
   */
  async toggleAvailability(dishId, isAvailable) {
    try {
      const success = await this.adapter.update(DB_COLLECTIONS.DISH, dishId, {
        isAvailable: isAvailable,
        updatedAt: new Date(),
      });

      if (success) {
        this.cache.remove(CACHE_KEYS.DISHES);
      }
      return success;
    } catch (err) {
      console.error('[DishService] toggleAvailability失败:', err);
      throw err;
    }
  }

  /**
   * 搜索菜品（带搜索历史记录）
   * @param {string} keyword
   * @returns {Promise<Array>}
   */
  async searchDishes(keyword) {
    try {
      // 记录搜索历史
      if (keyword && keyword.trim() !== '') {
        this.cache.addSearchHistory(keyword.trim());
      }

      return await this.getDishList('', keyword);
    } catch (err) {
      console.error('[DishService] searchDishes失败:', err);
      return [];
    }
  }

  /**
   * 收藏/取消收藏菜品
   * @param {string} dishId
   * @returns {Promise<boolean>}
   */
  async toggleFavorite(dishId) {
    // 收藏功能为 P1 拓展，此处预留接口
    try {
      const app = getApp();
      const memberId = app.globalData.memberId;

      const cmd = this.adapter.getCmd();
      const existing = await this.adapter.query('Favorite', {
        memberId,
        dishId,
      });

      if (existing.length > 0) {
        // 已收藏，取消
        await this.adapter.remove('Favorite', existing[0]._id);
        return false;
      }

      // 新增收藏
      await this.adapter.add('Favorite', { memberId, dishId, createdAt: new Date() });
      return true;
    } catch (err) {
      console.error('[DishService] toggleFavorite失败:', err);
      throw err;
    }
  }

  /**
   * 获取收藏列表
   * @returns {Promise<Array>}
   */
  async getFavorites() {
    try {
      const app = getApp();
      const memberId = app.globalData.memberId;

      const favorites = await this.adapter.query('Favorite', { memberId }, {
        orderBy: [{ field: 'createdAt', direction: 'desc' }],
      });

      // 获取菜品详情
      const dishIds = favorites.map((f) => f.dishId);
      const dishes = [];
      for (const dishId of dishIds) {
        const dish = await this.getDishDetail(dishId);
        if (dish) dishes.push(dish);
      }
      return dishes;
    } catch (err) {
      console.error('[DishService] getFavorites失败:', err);
      return [];
    }
  }

  /**
   * 上传菜品图片到云存储
   * @param {string} localPath - 本地临时文件路径
   * @returns {Promise<string>} 云存储 fileID
   */
  async uploadDishImage(localPath) {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;

      // 获取文件扩展名
      const ext = localPath.substring(localPath.lastIndexOf('.')) || '.jpg';
      const cloudPath = generateCloudPath(familyId, 'dish', ext);

      const fileID = await this.adapter.uploadFile(localPath, cloudPath);
      return fileID;
    } catch (err) {
      console.error('[DishService] uploadDishImage失败:', err);
      throw err;
    }
  }
}

module.exports = { DishService };
