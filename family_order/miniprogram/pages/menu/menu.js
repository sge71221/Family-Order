// menu.js — 菜单页面（TabBar首页）
const { DishService } = require('../../services/dish-service');
const { DietaryService } = require('../../services/dietary-service');
const { CATEGORIES } = require('../../data/categories');
const { showLoading, hideLoading, showError, isOnline } = require('../../utils/network');
const { formatMoney, fenToYuan } = require('../../utils/money');

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: '',
    dishes: [],
    filteredDishes: [],
    keyword: '',
    searchHistory: [],
    loading: true,
    isOffline: false,
    dietaryConflictMap: {},
    totalCount: 0,
    totalCostFen: 0,
  },

  _dishService: null,
  _dietaryService: null,
  _watcher: null,

  onLoad() {
    this._dishService = new DishService();
    this._dietaryService = new DietaryService();
    this.setData({ activeCategory: CATEGORIES[0].id });
  },

  onShow() {
    this._loadDishes();
    this._checkNetwork();
    this._updateCartBadge();
  },

  onHide() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  },

  /** 加载菜品列表 */
  async _loadDishes() {
    this.setData({ loading: true });

    try {
      const dishes = await this._dishService.getDishList();

      // 忌口检测
      const app = getApp();
      const memberId = app.globalData.memberId;
      let conflictMap = {};

      if (memberId) {
        const checkedDishes = await this._dietaryService.batchCheckConflicts(dishes, memberId);
        checkedDishes.forEach((d) => {
          if (d.dietaryConflict && d.dietaryConflict.hasConflict) {
            conflictMap[d._id] = d.dietaryConflict;
          }
        });
      }

      this.setData({
        dishes: dishes,
        filteredDishes: this._filterByCategory(dishes, this.data.activeCategory),
        dietaryConflictMap: conflictMap,
        loading: false,
      });
    } catch (err) {
      console.error('[Menu] 加载菜品失败:', err);
      this.setData({ loading: false });
      showError(err);
    }
  },

  /** 按分类筛选 */
  _filterByCategory(dishes, categoryId) {
    if (!categoryId) return dishes;
    return dishes.filter((d) => d.category === categoryId);
  },

  /** 分类切换 */
  onCategoryChange(e) {
    const categoryId = e.detail.categoryId;
    this.setData({
      activeCategory: categoryId,
      filteredDishes: this._filterByCategory(this.data.dishes, categoryId),
    });
  },

  /** 搜索输入 */
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  /** 执行搜索 */
  async onSearch(e) {
    const keyword = e.detail.value || this.data.keyword;
    if (!keyword || keyword.trim() === '') {
      this.setData({ filteredDishes: this._filterByCategory(this.data.dishes, this.data.activeCategory) });
      return;
    }

    try {
      const results = await this._dishService.searchDishes(keyword);
      this.setData({ filteredDishes: results });
    } catch (err) {
      showError(err);
    }
  },

  /** 清除搜索 */
  onSearchClear() {
    this.setData({
      keyword: '',
      filteredDishes: this._filterByCategory(this.data.dishes, this.data.activeCategory),
    });
  },

  /** 清除搜索历史 */
  onClearHistory() {
    const app = getApp();
    app.cache.clearSearchHistory();
    this.setData({ searchHistory: [] });
  },

  /** 菜品卡片点击 → 菜品详情 */
  onDishTap(e) {
    const dishId = e.detail.dishId;
    wx.navigateTo({ url: `/pages/dish-detail/dish-detail?dishId=${dishId}` });
  },

  /** 空状态点击 → 新建菜品 */
  onAddDish() {
    wx.navigateTo({ url: '/pages/dish-edit/dish-edit' });
  },

  /** 网络检测 */
  async _checkNetwork() {
    const online = await isOnline();
    this.setData({ isOffline: !online });
  },

  /** 网络重试 */
  onNetworkRetry() {
    this._loadDishes();
    this._checkNetwork();
  },

  /** 更新购物车徽标 */
  _updateCartBadge() {
    const cart = this._dishService ? getApp().cache.getCart(getApp().globalData.memberId) : [];
    // 不在 TabBar 上显示徽标，由 cart-bar 组件处理
  },
});
