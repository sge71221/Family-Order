/**
 * 云函数: calc-cost — 成本计算
 * 计算订单总成本、菜品成本明细
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 计算菜品成本（分）
 * @param {string} dishId
 * @param {number} quantity
 * @returns {Promise<{costPerDish: number, totalCost: number, breakdown: Array}>}
 */
async function calcDishCostDetail(dishId, quantity) {
  const dishRes = await db.collection('Dish').doc(dishId).get();
  if (!dishRes.data) {
    return { costPerDish: 0, totalCost: 0, breakdown: [] };
  }

  const dish = dishRes.data;
  const ingredients = dish.ingredients || [];
  let costPerDishFen = 0;
  const breakdown = [];

  for (const ing of ingredients) {
    let pricePerUnit = 0;
    if (ing.ingredientId) {
      const ingRes = await db.collection('Ingredient').doc(ing.ingredientId).get();
      if (ingRes.data) {
        pricePerUnit = ingRes.data.pricePerUnit || 0;
      }
    }

    const ingCost = Math.round(pricePerUnit * (ing.quantity || 0));
    costPerDishFen += ingCost;

    breakdown.push({
      ingredientId: ing.ingredientId || '',
      name: ing.name,
      quantity: ing.quantity || 0,
      unit: ing.unit || 'g',
      pricePerUnit,
      cost: ingCost,
    });
  }

  const totalCostFen = Math.round(costPerDishFen * (quantity || 1));

  return { costPerDish: costPerDishFen, totalCost: totalCostFen, breakdown };
}

/**
 * 成本计算云函数入口
 * @param {Object} event
 * @param {string} event.orderId - 订单ID（可选，计算订单总成本）
 * @param {string} event.dishId - 菜品ID（可选，计算单品成本）
 * @param {number} event.quantity - 数量（dishId 模式时使用）
 * @returns {Object} { code, data, message }
 */
exports.main = async (event) => {
  try {
    if (event.orderId) {
      // 计算订单总成本
      const orderRes = await db.collection('Order').doc(event.orderId).get();
      if (!orderRes.data) {
        return { code: 1, data: null, message: '订单不存在' };
      }

      const order = orderRes.data;
      const items = order.items || [];
      const totalCost = order.totalCost || 0;

      // 逐菜品成本明细
      const dishCostDetails = [];
      for (const item of items) {
        const detail = await calcDishCostDetail(item.dishId, item.quantity);
        dishCostDetails.push({
          dishId: item.dishId,
          dishName: item.dishName,
          quantity: item.quantity,
          costPerDish: detail.costPerDish,
          totalCost: detail.totalCost,
          ingredientBreakdown: detail.breakdown,
        });
      }

      return {
        code: 0,
        data: {
          orderId: event.orderId,
          totalCost,
          dishCostDetails,
        },
        message: '成本计算完成',
      };
    }

    if (event.dishId) {
      // 计算单品成本
      const detail = await calcDishCostDetail(event.dishId, event.quantity || 1);
      return {
        code: 0,
        data: {
          dishId: event.dishId,
          costPerDish: detail.costPerDish,
          totalCost: detail.totalCost,
          ingredientBreakdown: detail.breakdown,
        },
        message: '成本计算完成',
      };
    }

    return { code: 1, data: null, message: '请提供 orderId 或 dishId' };
  } catch (err) {
    console.error('[calc-cost] 错误:', err);
    return {
      code: -1,
      data: null,
      message: err.message || '成本计算失败',
    };
  }
};
