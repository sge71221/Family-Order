/**
 * purchase-service.js — 采购服务
 * 采购清单生成、勾选、导出、分享
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

module.exports = { PurchaseService };
