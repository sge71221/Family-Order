/**
 * purchase-service.js — 采购服务
 * 采购清单生成、勾选、导出、分享、采购记录管理
 */
const { CloudAdapter } = require('./cloud-adapter');
const { DB_COLLECTIONS, CLOUD_FUNCTIONS } = require('../utils/constants');
const { formatMoney, fenToYuan } = require('../utils/money');
const { getUnitName, formatQuantityUnit } = require('../utils/unit');
const { showToast } = require('../utils/network');
const { IngredientService } = require('./ingredient-service');

class PurchaseService {
  constructor() {
    this.adapter = new CloudAdapter();
  }

  /**
   * 根据订单生成采购清单
   * @param {string} orderId
   * @returns {Promise<Array>} 采购清单 [{ ingredientId, name, quantity, unit, isChecked, estimatedCost }]
   */
  async generatePurchaseList(orderId) {
    try {
      const order = await this.adapter.getOne(DB_COLLECTIONS.ORDER, orderId);
      if (!order) return [];

      return await this._buildPurchaseListFromItems(order.items || []);
    } catch (err) {
      console.error('[PurchaseService] generatePurchaseList失败:', err);
      return [];
    }
  }

  /**
   * 根据购物车生成采购清单
   * @param {Object} cartData - 购物车数据
   * @returns {Promise<Array>}
   */
  async generatePurchaseListFromCart(cartData) {
    try {
      if (!cartData || cartData.length === 0) return [];

      // 构建临时 items 结构
      const app = getApp();
      const items = cartData.map((cartItem) => ({
        dishId: cartItem.dishId,
        quantity: cartItem.quantity,
      }));

      return await this._buildPurchaseListFromItems(items);
    } catch (err) {
      console.error('[PurchaseService] generatePurchaseListFromCart失败:', err);
      return [];
    }
  }

  /**
   * 切换采购清单项目的勾选状态
   * @param {string} ingredientId
   * @param {boolean} isChecked
   * @returns {Object} 更新后的清单项
   */
  togglePurchaseItem(ingredientId, isChecked) {
    // 采购清单是临时数据，不需要云端持久化
    // 在页面 data 中管理勾选状态
    return { ingredientId, isChecked };
  }

  /**
   * 导出采购清单（格式化为文本）
   * @param {Array} purchaseList
   * @returns {string}
   */
  exportPurchaseList(purchaseList) {
    if (!purchaseList || purchaseList.length === 0) return '';

    const lines = purchaseList.map((item) => {
      const qtyStr = formatQuantityUnit(item.totalQuantity, item.unit);
      const costStr = item.estimatedCost ? formatMoney(item.estimatedCost) : '';
      const checkMark = item.isChecked ? '✓' : '○';
      return `${checkMark} ${item.name} ${qtyStr}${costStr ? ` ~${costStr}` : ''}`;
    });

    return `采购清单\n${lines.join('\n')}`;
  }

  /**
   * 复制采购文本到剪贴板
   * @param {string} text
   */
  copyPurchaseText(text) {
    wx.setClipboardData({
      data: text,
      success: () => {
        showToast('已复制到剪贴板', 'success');
      },
    });
  }

  /**
   * 分享采购清单
   * @param {Array} purchaseList
   * @returns {Object} 分享配置
   */
  sharePurchaseList(purchaseList) {
    const text = this.exportPurchaseList(purchaseList);
    return {
      title: '家庭采购清单',
      path: '/pages/purchase/purchase',
      summary: text.substring(0, 50),
    };
  }

  /**
   * 内部方法：根据订单 items 构建采购清单
   * @param {Array} items - [{ dishId, quantity }]
   * @returns {Promise<Array>}
   */
  async _buildPurchaseListFromItems(items) {
    const ingredientService = new IngredientService();
    const allIngredients = await ingredientService.getIngredientList();

    // 汇总各菜品所需食材
    const ingredientDemandMap = {};

    for (const item of items) {
      const dish = await this.adapter.getOne(DB_COLLECTIONS.DISH, item.dishId);
      if (!dish) continue;

      const dishIngredients = dish.ingredients || [];
      for (const ing of dishIngredients) {
        const key = ing.ingredientId || ing.name;
        const demandQuantity = (ing.quantity || 0) * (item.quantity || 1);

        if (!ingredientDemandMap[key]) {
          ingredientDemandMap[key] = {
            ingredientId: ing.ingredientId || '',
            name: ing.name,
            totalQuantity: 0,
            unit: ing.unit || 'g',
            pricePerUnit: 0,
            stockQuantity: 0,
          };
        }

        ingredientDemandMap[key].totalQuantity += demandQuantity;
      }
    }

    // 对照库存，计算需采购量
    const purchaseList = Object.values(ingredientDemandMap).map((demand) => {
      // 查找库存中的食材
      const stockItem = allIngredients.find((ing) =>
        ing._id === demand.ingredientId || ing.name === demand.name
      );

      const stockQty = stockItem ? (stockItem.stockQuantity || 0) : 0;
      const purchaseQuantity = Math.max(0, demand.totalQuantity - stockQty);
      const pricePerUnitFen = stockItem ? (stockItem.pricePerUnit || 0) : 0;
      const estimatedCostFen = purchaseQuantity * pricePerUnitFen;

      return {
        ingredientId: demand.ingredientId || (stockItem ? stockItem._id : ''),
        name: demand.name,
        totalQuantity: demand.totalQuantity,
        purchaseQuantity: purchaseQuantity,
        unit: demand.unit,
        stockQuantity: stockQty,
        pricePerUnit: pricePerUnitFen,
        estimatedCost: estimatedCostFen,
        isChecked: false,
        category: stockItem ? stockItem.category : 'other',
      };
    });

    // 过滤掉不需要采购的（库存充足）
    return purchaseList.filter((item) => item.purchaseQuantity > 0);
  }
}

/**
 * PurchaseRecordService — 采购记录服务
 */
class PurchaseRecordService {
  constructor() {
    this.adapter = new CloudAdapter();
  }

  /**
   * 添加采购记录
   */
  async addRecord(data) {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;
      const memberId = app.globalData.memberId;
      const { yuanToFen } = require('../utils/money');

      const qty = parseFloat(data.quantity) || 0;
      const price = parseFloat(data.unitPrice) || 0;

      const record = {
        familyId,
        date: data.date,
        name: data.name.trim(),
        quantity: qty,
        unit: data.unit || 'piece',
        unitPrice: yuanToFen(price),
        totalCost: yuanToFen(qty * price),
        category: data.category || 'other',
        remark: data.remark || '',
        createdBy: memberId || '',
        createdAt: new Date(),
      };

      const id = await this.adapter.add(DB_COLLECTIONS.PURCHASE_RECORD, record);
      return id;
    } catch (err) {
      console.error('[PurchaseRecordService] addRecord失败:', err);
      throw err;
    }
  }

  /**
   * 获取指定月份的采购记录
   * @param {string} month - YYYY-MM
   * @returns {Promise<Array>}
   */
  async getRecordsByMonth(month) {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;
      if (!familyId) return [];

      const monthStart = `${month}-01`;
      const monthEnd = `${month}-31`;

      const cmd = this.adapter.getCmd();
      const records = await this.adapter.query(DB_COLLECTIONS.PURCHASE_RECORD, {
        familyId,
        date: cmd.gte(monthStart).and(cmd.lte(monthEnd)),
      }, {
        orderBy: [{ field: 'date', direction: 'desc' }, { field: 'createdAt', direction: 'desc' }],
      });

      const { fenToYuan } = require('../utils/money');
      return records.map((r) => ({
        ...r,
        totalCostYuan: fenToYuan(r.totalCost || 0),
        unitPriceYuan: fenToYuan(r.unitPrice || 0),
      }));
    } catch (err) {
      console.error('[PurchaseRecordService] getRecordsByMonth失败:', err);
      return [];
    }
  }

  /**
   * 获取月度统计汇总
   */
  async getMonthSummary(records) {
    if (!records || records.length === 0) {
      return { monthlyTotal: '0.00', weeklyTotal: '0.00', recordCount: 0 };
    }

    const totalFen = records.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const { fenToYuan } = require('../utils/money');

    // 本周范围
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const weekStartStr = weekStart.toISOString().substring(0, 10);

    let weeklyFen = 0;
    records.forEach((r) => {
      if (r.date >= weekStartStr) {
        weeklyFen += (r.totalCost || 0);
      }
    });

    return {
      monthlyTotal: fenToYuan(totalFen),
      weeklyTotal: fenToYuan(weeklyFen),
      recordCount: records.length,
    };
  }
}

module.exports = { PurchaseService, PurchaseRecordService };
