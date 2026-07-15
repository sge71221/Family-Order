// purchase.js — 采购记录页面（TabBar第三页）
const { PurchaseService, PurchaseRecordService } = require('../../services/purchase-service');
const { fenToYuan } = require('../../utils/money');
const { showLoading, hideLoading, showError } = require('../../utils/network');

// 分类颜色映射
const CAT_COLORS = {
  meat: '#E07856',
  vegetable: '#4CAF50',
  seasoning: '#FFC107',
  fruit: '#F4A261',
  seafood: '#2196F3',
  dairy: '#9C27B0',
  grain: '#8D6E63',
  oil: '#FF9800',
  drink: '#00BCD4',
  other: '#9E9E9E',
};

Page({
  data: {
    currentMonth: '',
    dailyGroups: [], // [{ date, records: [...], totalYuan }]
    monthlyTotal: '0.00',
    weeklyTotal: '0.00',
    recordCount: 0,
    loading: true,
  },

  _purchaseRecordService: null,

  onLoad() {
    this._purchaseRecordService = new PurchaseRecordService();
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.setData({ currentMonth: month });
  },

  onShow() {
    this._loadRecords();
  },

  async _loadRecords() {
    this.setData({ loading: true });
    showLoading('加载采购记录...');

    try {
      const records = await this._purchaseRecordService.getRecordsByMonth(this.data.currentMonth);
      const summary = await this._purchaseRecordService.getMonthSummary(records);

      // 按日期分组，转为数组格式
      const dayMap = {};
      records.forEach((r) => {
        const dayKey = r.date.substring(0, 10);
        if (!dayMap[dayKey]) dayMap[dayKey] = [];
        dayMap[dayKey].push(r);
      });

      const dailyGroups = Object.keys(dayMap).sort().reverse().map((date) => {
        const dayRecords = dayMap[date];
        const totalFen = dayRecords.reduce((s, r) => s + (r.totalCost || 0), 0);
        return {
          date,
          records: dayRecords.map((r) => ({
            ...r,
            dotColor: CAT_COLORS[r.category] || '#9E9E9E',
          })),
          totalYuan: fenToYuan(totalFen),
        };
      });

      this.setData({
        dailyGroups,
        monthlyTotal: summary.monthlyTotal,
        weeklyTotal: summary.weeklyTotal,
        recordCount: summary.recordCount,
        loading: false,
      });

      hideLoading();
    } catch (err) {
      this.setData({ loading: false });
      hideLoading();
      showError(err);
    }
  },

  onMonthChange(e) {
    this.setData({ currentMonth: e.detail.value });
    this._loadRecords();
  },

  onAddRecord() {
    wx.navigateTo({ url: '/pages/add-record/add-record' });
  },

  onGoInventory() {
    wx.navigateTo({ url: '/pages/inventory/inventory' });
  },
});
