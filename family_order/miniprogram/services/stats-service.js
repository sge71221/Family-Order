/**
 * stats-service.js — 统计服务
 * 月度汇总、日趋势、菜品排行、订单成本明细
 */
const { CloudAdapter } = require('./cloud-adapter');
const { DB_COLLECTIONS } = require('../utils/constants');
const { getMonthStart, getMonthEnd, getMonthLabel } = require('../utils/date');
const { fenToYuan, formatMoney, sumFen } = require('../utils/money');

class StatsService {
  constructor() {
    this.adapter = new CloudAdapter();
  }

  /**
   * 获取月度汇总数据
   * @param {string} month - YYYY-MM 格式月份
   * @returns {Promise<Object>} { totalCost, orderCount, dishCount, avgCostPerDay }
   */
  async getMonthlySummary(month) {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;
      if (!familyId) return this._emptySummary();

      // 计算月份起止日期
      const monthStart = month ? `${month}-01` : getMonthStart();
      const monthEnd = month ? `${month}-31` : getMonthEnd();

      const cmd = this.adapter.getCmd();
      const orders = await this.adapter.query(DB_COLLECTIONS.ORDER, {
        familyId,
        date: cmd.gte(monthStart).and(cmd.lte(monthEnd)),
        status: cmd.neq('ordering'),  // 排除进行中
      }, {
        orderBy: [{ field: 'date', direction: 'asc' }],
      });

      if (orders.length === 0) return this._emptySummary();

      // 统计汇总
      const totalCostFen = orders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
      const orderCount = orders.length;

      // 汇总菜品数
      const dishSet = new Set();
      orders.forEach((order) => {
        (order.items || []).forEach((item) => dishSet.add(item.dishId));
      });

      // 计算日均
      const days = new Set(orders.map((o) => o.date)).size;
      const avgCostPerDayFen = days > 0 ? Math.round(totalCostFen / days) : 0;

      return {
        totalCostFen,
        totalCostYuan: fenToYuan(totalCostFen),
        orderCount,
        dishCount: dishSet.size,
        avgCostPerDayFen,
        avgCostPerDayYuan: fenToYuan(avgCostPerDayFen),
        days,
        month: month || getMonthLabel(monthStart),
      };
    } catch (err) {
      console.error('[StatsService] getMonthlySummary失败:', err);
      return this._emptySummary();
    }
  }

  /**
   * 获取日消费趋势
   * @param {string} month - YYYY-MM
   * @returns {Promise<Array>} [{ date, costFen, costYuan, orderCount }]
   */
  async getDailyTrend(month) {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;
      if (!familyId) return [];

      const monthStart = month ? `${month}-01` : getMonthStart();
      const monthEnd = month ? `${month}-31` : getMonthEnd();

      const cmd = this.adapter.getCmd();
      const orders = await this.adapter.query(DB_COLLECTIONS.ORDER, {
        familyId,
        date: cmd.gte(monthStart).and(cmd.lte(monthEnd)),
        status: cmd.neq('ordering'),
      }, {
        orderBy: [{ field: 'date', direction: 'asc' }],
      });

      // 按日期分组汇总
      const dailyMap = {};
      orders.forEach((order) => {
        const date = order.date;
        if (!dailyMap[date]) {
          dailyMap[date] = { date, costFen: 0, orderCount: 0 };
        }
        dailyMap[date].costFen += order.totalCost || 0;
        dailyMap[date].orderCount += 1;
      });

      return Object.values(dailyMap).map((d) => ({
        ...d,
        costYuan: fenToYuan(d.costFen),
      }));
    } catch (err) {
      console.error('[StatsService] getDailyTrend失败:', err);
      return [];
    }
  }

  /**
   * 获取菜品排行榜
   * @param {number} limit - 排行数量，默认10
   * @returns {Promise<Array>} [{ dishId, dishName, orderCount, totalCostFen, totalCostYuan }]
   */
  async getTopDishes(limit = 10) {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;
      if (!familyId) return [];

      const cmd = this.adapter.getCmd();
      const orders = await this.adapter.query(DB_COLLECTIONS.ORDER, {
        familyId,
        status: cmd.neq('ordering'),
      });

      // 汇总菜品排行
      const dishStatsMap = {};
      orders.forEach((order) => {
        (order.items || []).forEach((item) => {
          if (!dishStatsMap[item.dishId]) {
            dishStatsMap[item.dishId] = {
              dishId: item.dishId,
              dishName: item.dishName,
              orderCount: 0,
              totalCostFen: 0,
            };
          }
          dishStatsMap[item.dishId].orderCount += item.quantity || 1;
          dishStatsMap[item.dishId].totalCostFen += (item.quantity || 1) * (item.costPerDish || 0);
        });
      });

      // 排序并截取
      const sorted = Object.values(dishStatsMap)
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, limit);

      return sorted.map((d) => ({
        ...d,
        totalCostYuan: fenToYuan(d.totalCostFen),
      }));
    } catch (err) {
      console.error('[StatsService] getTopDishes失败:', err);
      return [];
    }
  }

  /**
   * 获取订单成本明细
   * @param {string} orderId
   * @returns {Promise<Object>} 订单成本详情
   */
  async getOrderCostDetail(orderId) {
    try {
      const order = await this.adapter.getOne(DB_COLLECTIONS.ORDER, orderId);
      if (!order) return null;

      return {
        orderId: order._id,
        date: order.date,
        status: order.status,
        totalCostFen: order.totalCost || 0,
        totalCostYuan: fenToYuan(order.totalCost || 0),
        items: (order.items || []).map((item) => ({
          ...item,
          costYuan: fenToYuan(item.costPerDish || 0),
        })),
        costBreakdown: (order.costBreakdown || []).map((b) => ({
          ...b,
          costPerDishYuan: fenToYuan(b.costPerDish || 0),
          totalCostYuan: fenToYuan(b.totalCost || 0),
        })),
      };
    } catch (err) {
      console.error('[StatsService] getOrderCostDetail失败:', err);
      return null;
    }
  }

  /** 空汇总数据模板 */
  _emptySummary() {
    return {
      totalCostFen: 0,
      totalCostYuan: '0.00',
      orderCount: 0,
      dishCount: 0,
      avgCostPerDayFen: 0,
      avgCostPerDayYuan: '0.00',
      days: 0,
      month: '',
    };
  }
}

module.exports = { StatsService };
