// order-history.js — 历史订单记录页面
const { OrderService } = require('../../services/order-service');
const { fenToYuan } = require('../../utils/money');
const { formatFriendlyDate, getMonthStart, getMonthEnd } = require('../../utils/date');
const { ORDER_STATUS, ORDER_STATUS_CONFIG } = require('../../utils/constants');
const { showLoading, hideLoading, showError } = require('../../utils/network');

Page({
  data: {
    orders: [],
    startDate: '',
    endDate: '',
    loading: true,
  },

  _orderService: null,

  onLoad() {
    this._orderService = new OrderService();
    this.setData({
      startDate: getMonthStart(),
      endDate: getMonthEnd(),
    });
  },

  onShow() {
    this._loadOrders();
  },

  async _loadOrders() {
    this.setData({ loading: true });
    showLoading('加载历史...');
    try {
      const orders = await this._orderService.getOrderHistory(
        this.data.startDate,
        this.data.endDate,
      );

      const processedOrders = orders.map((o) => {
        const statusConfig = ORDER_STATUS_CONFIG[o.status] || {};
        return {
          ...o,
          costYuan: fenToYuan(o.totalCost || 0),
          dateFriendly: formatFriendlyDate(o.date),
          statusLabel: statusConfig.label || o.status,
          itemCount: (o.items || []).length,
        };
      });

      this.setData({ orders: processedOrders, loading: false });
      hideLoading();
    } catch (err) {
      this.setData({ loading: false });
      hideLoading();
      showError(err);
    }
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
    this._loadOrders();
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value });
    this._loadOrders();
  },

  onOrderTap(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-summary/order-summary?orderId=${orderId}` });
  },
});
