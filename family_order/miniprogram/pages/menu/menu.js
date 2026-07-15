// menu.js — 菜单页面（TabBar首页）
const { DishService } = require('../../services/dish-service');
const { DietaryService } = require('../../services/dietary-service');
const { OrderService } = require('../../services/order-service');
const { CATEGORIES } = require('../../data/categories');
const { showLoading, hideLoading, showError, showToast, isOnline } = require('../../utils/network');
const { fenToYuan } = require('../../utils/money');

const ALL_CATEGORY = { id: 'all', name: '全部' };
const MENU_CATEGORIES = [ALL_CATEGORY, ...CATEGORIES];

Page({
  data: {
    categories: MENU_CATEGORIES,
    activeCategory: ALL_CATEGORY.id,
    dishes: [],
    filteredDishes: [],
    keyword: '',
    searchHistory: [],
    loading: true,
    isOffline: false,
    dietaryConflictMap: {},
    stockWarningMap: {},
    cartCount: 0,
    cartTotalFen: 0,
    cartTotalYuan: '0.00',
  },

  _dishService: null,
  _dietaryService: null,
  _orderService: null,
  _watcher: null,

  onLoad() {
    this._dishService = new DishService();
    this._dietaryService = new DietaryService();
    this._orderService = new OrderService();
    this.setData({ activeCategory: ALL_CATEGORY.id });
  },

  onShow() {
    this._loadDishes();
    this._checkNetwork();
    this._refreshCart();
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

      // 食材库存检测
      const stockWarningMap = await this._dishService.checkStockForDishes(dishes);

      this.setData({
        dishes: dishes,
        filteredDishes: this._filterByCategory(dishes, this.data.activeCategory),
        dietaryConflictMap: conflictMap,
        stockWarningMap: stockWarningMap,
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
    if (!categoryId || categoryId === ALL_CATEGORY.id) return dishes;
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

  /** 刷新购物车信息 */
  _refreshCart() {
    if (!this._orderService) return;
    const cart = this._orderService.getCart();
    const cartItems = cart.map((c) => {
      const dish = this.data.dishes.find((d) => d._id === c.dishId);
      return {
        ...c,
        dishName: dish ? dish.name : '未知菜品',
        priceFen: dish ? (dish.totalCost || 0) : 0,
      };
    });
    const cartTotalFen = cartItems.reduce((sum, item) => sum + (item.priceFen || 0) * (item.quantity || 0), 0);
    this.setData({
      cartCount: cart.length,
      cartTotalFen,
      cartTotalYuan: fenToYuan(cartTotalFen),
    });
  },

  /** 加入购物车 */
  onAddToCart(e) {
    const dishId = e.detail.dishId;
    // 二次确认库存（组件已拦截无库存的情况）
    this._orderService.addToCart(dishId, 1);
    this._refreshCart();
    showToast('已加入购物车', 'success', 1000);
  },

  /** 查看购物车 */
  onViewCart() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },

  /** 提交订单 */
  async onSubmitOrder() {
    if (this.data.cartCount === 0) {
      showToast('购物车为空', 'none');
      return;
    }
    showLoading('提交订单...');
    try {
      await this._orderService.submitOrder();
      hideLoading();
      showToast('订单提交成功！', 'success');
      this._refreshCart();
      wx.navigateTo({ url: '/pages/order-summary/order-summary' });
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },
});
