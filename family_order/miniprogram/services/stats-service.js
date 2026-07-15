/**
 * stats-service.js — 统计服务
 * 月度汇总（采购支出）、日趋势、菜品排行
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
   * 获取月度汇总
   * 花费只来自采购记录（PurchaseRecord），点餐次数来自订单（Order）
   * @param {string} month - YYYY-MM
   * @returns {Promise<Object>}
   */
  async getMonthlySummary(month) {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;
      if (!familyId) return this._emptySummary();

      const monthStart = month ? `${month}-01` : getMonthStart();
      const monthEnd = month ? `${month}-31` : getMonthEnd();
      const cmd = this.adapter.getCmd();

      // 1. 采购支出（实际买菜花费）
      let purchaseCostFen = 0;
      let purchaseDays = 0;
      try {
        const purchaseRecords = await this.adapter.query(DB_COLLECTIONS.PURCHASE_RECORD, {
          familyId,
          date: cmd.gte(monthStart).and(cmd.lte(monthEnd)),
        });
        purchaseCostFen = purchaseRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);
        purchaseDays = new Set(purchaseRecords.map((r) => r.date)).size;
      } catch (e) {
        console.warn('[StatsService] 采购记录查询失败:', e.message);
      }

      // 2. 订单次数（仅统计次数，不计金额）
      const orders = await this.adapter.query(DB_COLLECTIONS.ORDER, {
        familyId,
        date: cmd.gte(monthStart).and(cmd.lte(monthEnd)),
        status: cmd.neq('ordering'),
      });
      const orderCount = orders.length;

      // 汇总菜品数
      const dishSet = new Set();
      orders.forEach((order) => {
        (order.items || []).forEach((item) => dishSet.add(item.dishId));
      });

      const days = purchaseDays || 1;
      const avgCostPerDayFen = days > 0 ? Math.round(purchaseCostFen / days) : 0;

      return {
        totalCostFen: purchaseCostFen,
        totalCostYuan: fenToYuan(purchaseCostFen),
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
   * 获取日消费趋势（只统计采购支出）
   */
  async getDailyTrend(month) {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;
      if (!familyId) return [];

      const monthStart = month ? `${month}-01` : getMonthStart();
      const monthEnd = month ? `${month}-31` : getMonthEnd();
      const cmd = this.adapter.getCmd();

      try {
        const purchaseRecords = await this.adapter.query(DB_COLLECTIONS.PURCHASE_RECORD, {
          familyId,
          date: cmd.gte(monthStart).and(cmd.lte(monthEnd)),
        }, {
          orderBy: [{ field: 'date', direction: 'asc' }],
        });

        // 按日期汇总
        const dailyMap = {};
        purchaseRecords.forEach((r) => {
          const date = r.date;
          if (!dailyMap[date]) {
            dailyMap[date] = { date, costFen: 0, orderCount: 0 };
          }
          dailyMap[date].costFen += r.totalCost || 0;
          dailyMap[date].orderCount += 1;
        });

        return Object.values(dailyMap).map((d) => ({
          ...d,
          costYuan: fenToYuan(d.costFen),
        }));
      } catch (e) {
        console.warn('[StatsService] 日趋势查询失败:', e.message);
        return [];
      }
    } catch (err) {
      console.error('[StatsService] getDailyTrend失败:', err);
      return [];
    }
  }

  /**
   * 获取菜品排行榜
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
          // 不再统计金额
        });
      });

      const sorted = Object.values(dishStatsMap)
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, limit);

      return sorted.map((d) => ({
        ...d,
        totalCostYuan: '0.00',
      }));
    } catch (err) {
      console.error('[StatsService] getTopDishes失败:', err);
      return [];
    }
  }

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
