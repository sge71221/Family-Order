// order-summary.js — 今日点餐汇总页面
const { OrderService } = require('../../services/order-service');
const { fenToYuan, formatMoney } = require('../../utils/money');
const { formatTime, formatFriendlyDate } = require('../../utils/date');
const { ORDER_STATUS, ORDER_STATUS_CONFIG } = require('../../utils/constants');
const { showLoading, hideLoading, showError, showToast, showConfirm } = require('../../utils/network');

Page({
  data: {
    order: null,
    itemsByMember: {},
    totalCostYuan: '',
    statusLabel: '',
    statusConfig: null,
    loading: true,
  },

  _orderService: null,
  _watcher: null,

  onLoad() {
    this._orderService = new OrderService();
  },

  onShow() {
    this._loadTodayOrder();
  },

  onHide() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  },

  async _loadTodayOrder() {
    this.setData({ loading: true });
    try {
      const order = await this._orderService.getTodayOrder();
      this._processOrder(order);

      // 实时监听
      this._watcher = this._orderService.watchTodayOrder((updatedOrder) => {
        this._processOrder(updatedOrder);
      });

      this.setData({ loading: false });
    } catch (err) {
      this.setData({ loading: false });
      showError(err);
    }
  },

  _processOrder(order) {
    if (!order) {
      this.setData({ order: null, itemsByMember: {}, totalCostYuan: '', statusLabel: '' });
      return;
    }

    // 按成员分组
    const itemsByMember = {};
    (order.items || []).forEach((item) => {
      const memberId = item.memberId || 'unknown';
      if (!itemsByMember[memberId]) {
        itemsByMember[memberId] = {
          memberName: item.memberName || '未知',
          memberId: memberId,
          items: [],
          subtotalFen: 0,
        };
      }
      itemsByMember[memberId].items.push(item);
      itemsByMember[memberId].subtotalFen += (item.totalCost || 0);
    });

    // 状态配置
    const statusConfig = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.ordering;

    this.setData({
      order,
      itemsByMember,
      totalCostYuan: fenToYuan(order.totalCost || 0),
      statusLabel: statusConfig.label,
      statusConfig: statusConfig,
    });
  },

  async onMarkCooking() {
    if (!this.data.order) return;
    const confirmed = await showConfirm('确认开始烹饪？');
    if (!confirmed) return;
    showLoading('更新状态...');
    try {
      await this._orderService.markOrderStatus(this.data.order._id, ORDER_STATUS.COOKING);
      hideLoading();
      showToast('状态已更新', 'success');
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },

  async onMarkDone() {
    if (!this.data.order) return;
    const confirmed = await showConfirm('确认已完成烹饪？');
    if (!confirmed) return;
    showLoading('更新状态...');
    try {
      await this._orderService.markOrderStatus(this.data.order._id, ORDER_STATUS.DONE);
      hideLoading();
      showToast('状态已更新', 'success');
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },

  onViewHistory() {
    wx.navigateTo({ url: '/pages/order-history/order-history' });
  },
});
