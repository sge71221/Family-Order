/**
 * 云函数: submit-order — 提交订单
 * 合并同日订单、计算成本、扣减库存
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 计算菜品成本（分）
 * @param {Array} dishIngredients - [{ingredientId, name, quantity, unit}]
 * @returns {Promise<number>}
 */
async function calcDishCostFen(dishIngredients) {
  let totalCost = 0;

  for (const ing of dishIngredients || []) {
    try {
      const res = await db.collection('Ingredient').where({
        _id: ing.ingredientId,
      }).limit(1).get();

      if (res.data && res.data.length > 0) {
        const ingredient = res.data[0];
        const pricePerUnit = ingredient.pricePerUnit || 0;
        totalCost += Math.round(pricePerUnit * (ing.quantity || 0));
      }
    } catch (e) {
      // 食材未找到，成本估算为0
    }
  }

  return totalCost;
}

/**
 * 提交订单云函数入口
 * @param {Object} event
 * @param {string} event.familyId - 家庭ID
 * @param {string} event.memberId - 成员ID
 * @param {string} event.memberName - 成员昵称
 * @param {Array} event.items - [{dishId, quantity, notes}]
 * @returns {Object} { code, data: { orderId, totalCost }, message }
 */
exports.main = async (event) => {
  try {
    if (!event.items || event.items.length === 0) {
      return { code: 1, data: null, message: '订单菜品为空' };
    }

    const today = new Date();
    const dateStr = today.getFullYear() + '-'
      + String(today.getMonth() + 1).padStart(2, '0') + '-'
      + String(today.getDate()).padStart(2, '0');

    // 构建详细 items 和成本
    const detailedItems = [];
    const costBreakdown = [];
    let totalCostFen = 0;

    for (const item of event.items) {
      const dishRes = await db.collection('Dish').doc(item.dishId).get();
      if (!dishRes.data) continue;

      const dish = dishRes.data;
      const costPerDishFen = await calcDishCostFen(dish.ingredients);
      const itemTotalCostFen = Math.round(costPerDishFen * (item.quantity || 1));

      detailedItems.push({
        memberId: event.memberId,
        memberName: event.memberName || '',
        dishId: item.dishId,
        dishName: dish.name,
        quantity: item.quantity || 1,
        notes: item.notes || '',
      });

      costBreakdown.push({
        dishId: item.dishId,
        dishName: dish.name,
        quantity: item.quantity || 1,
        costPerDish: costPerDishFen,
        totalCost: itemTotalCostFen,
      });

      totalCostFen += itemTotalCostFen;
    }

    // 检查当日是否已有 ordering 状态的订单
    const existingRes = await db.collection('Order').where({
      familyId: event.familyId,
      date: dateStr,
      status: 'ordering',
    }).limit(1).get();

    if (existingRes.data && existingRes.data.length > 0) {
      // 合并到已有订单
      const existingOrder = existingRes.data[0];
      const mergedItems = [...(existingOrder.items || []), ...detailedItems];
      const mergedBreakdown = [...(existingOrder.costBreakdown || []), ...costBreakdown];
      const mergedTotalCost = mergedBreakdown.reduce((sum, b) => sum + (b.totalCost || 0), 0);

      await db.collection('Order').doc(existingOrder._id).update({
        data: {
          items: mergedItems,
          totalCost: mergedTotalCost,
          costBreakdown: mergedBreakdown,
          updatedAt: today,
        },
      });

      return {
        code: 0,
        data: { orderId: existingOrder._id, totalCost: mergedTotalCost },
        message: '订单追加成功',
      };
    }

    // 创建新订单
    const orderData = {
      familyId: event.familyId,
      date: dateStr,
      status: 'ordering',
      items: detailedItems,
      totalCost: totalCostFen,
      costBreakdown,
      createdBy: event.memberId,
      createdAt: today,
      updatedAt: today,
    };

    const addRes = await db.collection('Order').add({ data: orderData });

    return {
      code: 0,
      data: { orderId: addRes._id, totalCost: totalCostFen },
      message: '订单提交成功',
    };
  } catch (err) {
    console.error('[submit-order] 错误:', err);
    return {
      code: -1,
      data: null,
      message: err.message || '订单提交失败',
    };
  }
};
