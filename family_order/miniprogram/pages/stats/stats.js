// stats.js — 统计页面（TabBar第四页）
const { StatsService } = require('../../services/stats-service');
const { fenToYuan, formatMoney } = require('../../utils/money');
const { getMonthStart, getMonthEnd, getMonthLabel, formatFriendlyDate } = require('../../utils/date');
const { showLoading, hideLoading, showError } = require('../../utils/network');

Page({
  data: {
    currentMonth: '',
    summary: null,
    dailyTrend: [],
    topDishes: [],
    loading: true,
  },

  _statsService: null,

  onLoad() {
    this._statsService = new StatsService();
    this.setData({ currentMonth: getMonthLabel(getMonthStart()) });
  },

  onShow() {
    this._loadStats();
  },

  async _loadStats() {
    this.setData({ loading: true });
    showLoading('加载统计...');

    try {
      const month = this.data.currentMonth;

      const summary = await this._statsService.getMonthlySummary(month);
      const dailyTrend = await this._statsService.getDailyTrend(month);
      const topDishes = await this._statsService.getTopDishes(5);

      // 格式化日趋势
      const trendData = dailyTrend.map((d) => ({
        ...d,
        dateFriendly: formatFriendlyDate(d.date),
        costYuan: fenToYuan(d.costFen || 0),
      }));

      this.setData({
        summary,
        dailyTrend: trendData,
        topDishes: topDishes.map((d) => ({
          ...d,
          totalCostYuan: fenToYuan(d.totalCostFen || 0),
        })),
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
    this._loadStats();
  },

  onOrderTap(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-history/order-history` });
  },
});
