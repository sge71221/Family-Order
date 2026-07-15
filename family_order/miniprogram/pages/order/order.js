// order.js — 点餐页面（TabBar第二页）
const { DishService } = require('../../services/dish-service');
const { DietaryService } = require('../../services/dietary-service');
const { OrderService } = require('../../services/order-service');
const { CATEGORIES } = require('../../data/categories');
const { fenToYuan, sumFen } = require('../../utils/money');
const { showLoading, hideLoading, showError, showToast } = require('../../utils/network');

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: '',
    dishes: [],
    filteredDishes: [],
    cart: [],
    cartItems: [],
    cartTotalFen: 0,
    cartTotalYuan: '0.00',
    cartCount: 0,
    keyword: '',
    loading: true,
    dietaryConflictMap: {},
    stockWarningMap: {},
  },

  _dishService: null,
  _dietaryService: null,
  _orderService: null,

  onLoad() {
    this._dishService = new DishService();
    this._dietaryService = new DietaryService();
    this._orderService = new OrderService();
    this.setData({ activeCategory: CATEGORIES[0].id });
  },

  onShow() {
    this._loadDishes();
    this._refreshCart();
  },

  async _loadDishes() {
    this.setData({ loading: true });
    try {
      const dishes = await this._dishService.getDishList();
      const app = getApp();
      const memberId = app.globalData.memberId;
      let conflictMap = {};
      if (memberId) {
        const checked = await this._dietaryService.batchCheckConflicts(dishes, memberId);
        checked.forEach((d) => {
          if (d.dietaryConflict && d.dietaryConflict.hasConflict) {
            conflictMap[d._id] = d.dietaryConflict;
          }
        });
      }
      // 食材库存检测
      const stockWarningMap = await this._dishService.checkStockForDishes(dishes);

      this.setData({
        dishes,
        filteredDishes: this._filterByCategory(dishes, this.data.activeCategory),
        dietaryConflictMap: conflictMap,
        stockWarningMap: stockWarningMap,
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      showError(err);
    }
  },

  _filterByCategory(dishes, categoryId) {
    if (!categoryId) return dishes;
    return dishes.filter((d) => d.category === categoryId);
  },

  _refreshCart() {
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
      cart,
      cartItems,
      cartTotalFen,
      cartTotalYuan: fenToYuan(cartTotalFen),
      cartCount: cart.length,
    });
  },

  onCategoryChange(e) {
    const categoryId = e.detail.categoryId;
    this.setData({
      activeCategory: categoryId,
      filteredDishes: this._filterByCategory(this.data.dishes, categoryId),
    });
  },

  onAddToCart(e) {
    const dishId = e.detail.dishId;
    this._orderService.addToCart(dishId, 1);
    this._refreshCart();
    showToast('已加入购物车', 'success', 1000);
  },

  onSearch(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    if (keyword) {
      const filtered = this.data.dishes.filter((d) => d.name.toLowerCase().includes(keyword.toLowerCase()));
      this.setData({ filteredDishes: filtered });
    } else {
      this.setData({ filteredDishes: this._filterByCategory(this.data.dishes, this.data.activeCategory) });
    }
  },

  onViewCart() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },

  async onSubmitOrder() {
    if (this.data.cart.length === 0) {
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
