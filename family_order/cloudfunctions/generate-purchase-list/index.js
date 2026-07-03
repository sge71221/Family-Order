/**
 * 云函数: generate-purchase-list — 生成采购清单
 * 根据订单/购物车中的菜品，汇总食材需求，对照库存
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 生成采购清单云函数入口
 * @param {Object} event
 * @param {string} event.orderId - 订单ID（可选）
 * @param {Array} event.cartItems - 购物车数据 [{dishId, quantity}]（可选）
 * @param {string} event.familyId - 家庭ID
 * @returns {Object} { code, data: { purchaseList }, message }
 */
exports.main = async (event) => {
  try {
    let items = [];

    // 从订单获取
    if (event.orderId) {
      const orderRes = await db.collection('Order').doc(event.orderId).get();
      if (!orderRes.data) {
        return { code: 1, data: null, message: '订单不存在' };
      }
      items = (orderRes.data.items || []).map((i) => ({
        dishId: i.dishId,
        quantity: i.quantity,
      }));
    } else if (event.cartItems && event.cartItems.length > 0) {
      items = event.cartItems;
    } else {
      return { code: 1, data: null, message: '未提供订单或购物车数据' };
    }

    // 获取库存食材列表
    const ingredientsRes = await db.collection('Ingredient').where({
      familyId: event.familyId,
    }).get();
    const stockMap = {};
    (ingredientsRes.data || []).forEach((ing) => {
      stockMap[ing._id] = ing;
    });

    // 汇总食材需求
    const demandMap = {};

    for (const item of items) {
      const dishRes = await db.collection('Dish').doc(item.dishId).get();
      if (!dishRes.data) continue;

      const dishIngredients = dishRes.data.ingredients || [];
      for (const ing of dishIngredients) {
        const key = ing.ingredientId || ing.name;
        const demandQty = (ing.quantity || 0) * (item.quantity || 1);

        if (!demandMap[key]) {
          demandMap[key] = {
            ingredientId: ing.ingredientId || '',
            name: ing.name,
            totalDemand: 0,
            unit: ing.unit || 'g',
            pricePerUnit: 0,
          };
        }

        demandMap[key].totalDemand += demandQty;

        // 更新单价
        if (ing.ingredientId && stockMap[ing.ingredientId]) {
          demandMap[key].pricePerUnit = stockMap[ing.ingredientId].pricePerUnit || 0;
        }
      }
    }

    // 构建采购清单（对照库存）
    const purchaseList = Object.values(demandMap).map((demand) => {
      const stockItem = demand.ingredientId ? stockMap[demand.ingredientId] : null;
      const stockQty = stockItem ? (stockItem.stockQuantity || 0) : 0;
      const purchaseQty = Math.max(0, demand.totalDemand - stockQty);
      const estimatedCost = Math.round((demand.pricePerUnit || 0) * purchaseQty);

      return {
        ingredientId: demand.ingredientId || (stockItem ? stockItem._id : ''),
        name: demand.name,
        totalDemand: demand.totalDemand,
        purchaseQuantity: purchaseQty,
        unit: demand.unit,
        stockQuantity: stockQty,
        pricePerUnit: demand.pricePerUnit,
        estimatedCost: estimatedCost,
        isChecked: false,
        category: stockItem ? stockItem.category : 'other',
      };
    }).filter((item) => item.purchaseQuantity > 0);

    return {
      code: 0,
      data: { purchaseList },
      message: '采购清单生成成功',
    };
  } catch (err) {
    console.error('[generate-purchase-list] 错误:', err);
    return {
      code: -1,
      data: null,
      message: err.message || '采购清单生成失败',
    };
  }
};
