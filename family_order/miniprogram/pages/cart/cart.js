// cart.js — 购物车详情页面
const { OrderService } = require('../../services/order-service');
const { DishService } = require('../../services/dish-service');
const { fenToYuan, multiplyFen, addFen, sumFen } = require('../../utils/money');
const { showLoading, hideLoading, showError, showToast, showConfirm } = require('../../utils/network');

Page({
  data: {
    cartItems: [],
    totalCostFen: 0,
    totalCostYuan: '0.00',
    itemCount: 0,
  },

  _orderService: null,
  _dishService: null,

  onLoad() {
    this._orderService = new OrderService();
    this._dishService = new DishService();
  },

  onShow() {
    this._refreshCart();
  },

  async _refreshCart() {
    const cart = this._orderService.getCart();
    const items = [];

    for (const c of cart) {
      const dish = await this._dishService.getDishDetail(c.dishId);
      items.push({
        ...c,
        dishName: dish ? dish.name : '未知菜品',
        dishImage: dish && dish.images ? dish.images[0] : '',
        pricePerUnitFen: dish ? (dish.totalCost || 0) : 0,
        totalPriceFen: multiplyFen(dish ? (dish.totalCost || 0) : 0, c.quantity || 1),
      });
    }

    const totalFen = sumFen(items.map((i) => i.totalPriceFen));

    this.setData({
      cartItems: items,
      totalCostFen: totalFen,
      totalCostYuan: fenToYuan(totalFen),
      itemCount: cart.length,
    });
  },

  onQuantityChange(e) {
    const index = e.currentTarget.dataset.index;
    const quantity = e.detail.value;
    const cart = this._orderService.getCart();
    const dishId = cart[index].dishId;
    this._orderService.updateCartQuantity(dishId, quantity);
    this._refreshCart();
  },

  onRemoveItem(e) {
    const index = e.currentTarget.dataset.index;
    const cart = this._orderService.getCart();
    const dishId = cart[index].dishId;
    this._orderService.removeFromCart(dishId);
    this._refreshCart();
  },

  async onClearCart() {
    const confirmed = await showConfirm('确定清空购物车？');
    if (confirmed) {
      this._orderService.clearCart();
      this._refreshCart();
    }
  },

  async onSubmit() {
    if (this.data.cartItems.length === 0) {
      showToast('购物车为空', 'none');
      return;
    }

    showLoading('提交订单...');
    try {
      await this._orderService.submitOrder();
      hideLoading();
      showToast('订单提交成功！', 'success');
      wx.navigateTo({ url: '/pages/order-summary/order-summary' });
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },
});
