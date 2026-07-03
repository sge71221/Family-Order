/**
 * cache.js — 缓存管理器
 * 统一管理 wx.setStorageSync / wx.getStorageSync，支持过期策略
 */
const { CACHE_EXPIRY, CACHE_KEYS } = require('./constants');
const { getToday, toTimestamp } = require('./date');

class CacheManager {
  /**
   * 设置缓存
   * @param {string} key - 缓存Key
   * @param {*} data - 缓存数据
   * @param {number|string} expiryMs - 过期时间（毫秒），-1表示不过期，'daily'表示当日有效
   */
  set(key, data, expiryMs) {
    try {
      const cacheItem = {
        data: data,
        timestamp: Date.now(),
        expiry: expiryMs || CACHE_EXPIRY.DISHES,
      };
      wx.setStorageSync(key, cacheItem);
    } catch (err) {
      console.error('[Cache] set失败:', key, err);
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存Key
   * @returns {*} 缓存数据，过期或不存在返回null
   */
  get(key) {
    try {
      const cacheItem = wx.getStorageSync(key);
      if (!cacheItem) return null;

      // 检查过期
      if (this._isExpired(cacheItem, key)) {
        this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (err) {
      console.error('[Cache] get失败:', key, err);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param {string} key
   */
  remove(key) {
    try {
      wx.removeStorageSync(key);
    } catch (err) {
      console.error('[Cache] remove失败:', key, err);
    }
  }

  /**
   * 清除所有 cache_ 前缀的缓存
   */
  clearAll() {
    try {
      const info = wx.getStorageInfoSync();
      info.keys.forEach((k) => {
        if (k.startsWith('cache_')) {
          wx.removeStorageSync(k);
        }
      });
    } catch (err) {
      console.error('[Cache] clearAll失败:', err);
    }
  }

  /**
   * 清除过期缓存
   */
  clearExpired() {
    try {
      const info = wx.getStorageInfoSync();
      info.keys.forEach((k) => {
        if (k.startsWith('cache_')) {
          const cacheItem = wx.getStorageSync(k);
          if (cacheItem && this._isExpired(cacheItem, k)) {
            wx.removeStorageSync(k);
          }
        }
      });
    } catch (err) {
      console.error('[Cache] clearExpired失败:', err);
    }
  }

  /**
   * 判断缓存项是否过期
   * @param {Object} cacheItem
   * @param {string} key
   * @returns {boolean}
   */
  _isExpired(cacheItem, key) {
    if (!cacheItem.expiry) return false;

    // 不过期
    if (cacheItem.expiry === -1) return false;

    // 当日有效
    if (cacheItem.expiry === 'daily') {
      const cacheDate = new Date(cacheItem.timestamp);
      const todayDate = new Date();
      return cacheDate.getFullYear() !== todayDate.getFullYear()
        || cacheDate.getMonth() !== todayDate.getMonth()
        || cacheDate.getDate() !== todayDate.getDate();
    }

    // 按毫秒过期
    const elapsed = Date.now() - cacheItem.timestamp;
    return elapsed > cacheItem.expiry;
  }

  /**
   * 获取带 memberId 的购物车缓存
   * @param {string} memberId
   * @returns {*} 购物车数据
   */
  getCart(memberId) {
    return this.get(CACHE_KEYS.CART + memberId);
  }

  /**
   * 设置购物车缓存（不过期）
   * @param {string} memberId
   * @param {*} cartData
   */
  setCart(memberId, cartData) {
    this.set(CACHE_KEYS.CART + memberId, cartData, CACHE_EXPIRY.CART);
  }

  /**
   * 删除购物车缓存
   * @param {string} memberId
   */
  removeCart(memberId) {
    this.remove(CACHE_KEYS.CART + memberId);
  }

  /**
   * 获取今日订单缓存
   * @returns {*}
   */
  getTodayOrder() {
    return this.get(CACHE_KEYS.TODAY_ORDER);
  }

  /**
   * 设置今日订单缓存（当日有效）
   * @param {*} orderData
   */
  setTodayOrder(orderData) {
    this.set(CACHE_KEYS.TODAY_ORDER, orderData, CACHE_EXPIRY.TODAY_ORDER);
  }

  /**
   * 获取搜索历史
   * @returns {Array<string>}
   */
  getSearchHistory() {
    const history = this.get(CACHE_KEYS.SEARCH_HISTORY);
    return history || [];
  }

  /**
   * 添加搜索关键词到历史
   * @param {string} keyword
   */
  addSearchHistory(keyword) {
    if (!keyword || keyword.trim() === '') return;
    const history = this.getSearchHistory();
    // 去重：移除已有相同关键词
    const filtered = history.filter((h) => h !== keyword.trim());
    // 新关键词放最前面
    filtered.unshift(keyword.trim());
    // 最多保留10条
    if (filtered.length > 10) filtered.splice(10);
    this.set(CACHE_KEYS.SEARCH_HISTORY, filtered, CACHE_EXPIRY.SEARCH_HISTORY);
  }

  /**
   * 清空搜索历史
   */
  clearSearchHistory() {
    this.remove(CACHE_KEYS.SEARCH_HISTORY);
  }
}

module.exports = { CacheManager };
