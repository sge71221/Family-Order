/**
 * dietary-check.js — 饮食适配检测工具
 * 检测菜品是否含有某成员的过敏源或不喜欢食材
 */
const { ALLERGEN_SEVERITY, DISLIKE_LEVEL } = require('../data/dietary-preferences');

/**
 * 检测菜品与成员忌口的冲突
 * @param {Object} dish - 菜品对象，含 ingredients[]
 * @param {Object} memberDietary - 成员忌口设置
 *   { allergens: [{ingredientId, name, severity}],
 *     dislikes: [{ingredientId, name, level}],
 *     preferences: [] }
 * @returns {Object} { hasConflict, allergenWarnings, dislikeWarnings, severity }
 */
function checkDishConflicts(dish, memberDietary) {
  if (!memberDietary) {
    return { hasConflict: false, allergenWarnings: [], dislikeWarnings: [], severity: 'none' };
  }

  const dishIngredients = dish.ingredients || [];
  const allergens = memberDietary.allergens || [];
  const dislikes = memberDietary.dislikes || [];

  const allergenWarnings = [];
  const dislikeWarnings = [];

  // 检测过敏源冲突
  allergens.forEach((allergen) => {
    const matched = dishIngredients.find((ing) =>
      ing.ingredientId === allergen.ingredientId
      || ing.name === allergen.name
    );
    if (matched) {
      allergenWarnings.push({
        ingredientName: matched.name,
        severity: allergen.severity,
        allergenName: allergen.name,
      });
    }
  });

  // 检测不喜欢食材冲突
  dislikes.forEach((dislike) => {
    const matched = dishIngredients.find((ing) =>
      ing.ingredientId === dislike.ingredientId
      || ing.name === dislike.name
    );
    if (matched) {
      dislikeWarnings.push({
        ingredientName: matched.name,
        level: dislike.level,
        dislikeName: dislike.name,
      });
    }
  });

  // 计算总体严重程度
  let severity = 'none';
  if (allergenWarnings.length > 0) {
    const hasSevere = allergenWarnings.some((w) => w.severity === ALLERGEN_SEVERITY.SEVERE);
    severity = hasSevere ? 'severe' : 'mild';
  } else if (dislikeWarnings.length > 0) {
    const hasStrong = dislikeWarnings.some((w) => w.level === DISLIKE_LEVEL.STRONG);
    severity = hasStrong ? 'caution' : 'mild';
  }

  const hasConflict = allergenWarnings.length > 0 || dislikeWarnings.length > 0;

  return { hasConflict, allergenWarnings, dislikeWarnings, severity };
}

/**
 * 获取冲突的展示标签
 * @param {Object} conflictResult - checkDishConflicts 返回值
 * @returns {Array<{text, type, color}>}
 */
function getConflictLabels(conflictResult) {
  const labels = [];

  conflictResult.allergenWarnings.forEach((w) => {
    const type = w.severity === ALLERGEN_SEVERITY.SEVERE ? 'danger' : 'warning';
    labels.push({
      text: `含${w.allergenName}`,
      type: type,
      color: w.severity === ALLERGEN_SEVERITY.SEVERE ? 'var(--color-allergen-severe)' : 'var(--color-allergen-mild)',
    });
  });

  conflictResult.dislikeWarnings.forEach((w) => {
    labels.push({
      text: `含${w.dislikeName}`,
      type: 'dislike',
      color: 'var(--color-on-surface-muted)',
    });
  });

  return labels;
}

/**
 * 根据成员偏好筛选菜品列表
 * @param {Array<Object>} dishes - 菜品列表
 * @param {Array<string>} preferences - 偏好标签ID列表
 * @returns {Array<Object>} 排序后的菜品列表，匹配偏好靠前
 */
function sortByPreference(dishes, preferences) {
  if (!preferences || preferences.length === 0) return dishes;

  const scored = dishes.map((dish) => {
    const tags = dish.tags || [];
    let score = 0;
    preferences.forEach((pref) => {
      if (tags.includes(pref)) score += 10;
    });
    return { dish, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.dish);
}

/**
 * 过滤掉严重冲突的菜品
 * @param {Array<Object>} dishes - 菜品列表
 * @param {Object} memberDietary - 成员忌口
 * @returns {Array<Object>} 过滤后的菜品列表
 */
function filterSafeDishes(dishes, memberDietary) {
  if (!memberDietary) return dishes;

  return dishes.filter((dish) => {
    const result = checkDishConflicts(dish, memberDietary);
    // 只过滤掉严重过敏的菜品
    return result.severity !== 'severe';
  });
}

module.exports = {
  checkDishConflicts,
  getConflictLabels,
  sortByPreference,
  filterSafeDishes,
};
