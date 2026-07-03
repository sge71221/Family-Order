/**
 * unit.js — 单位换算工具函数
 * 用于食材计量单位的转换
 */
const { INGREDIENT_UNITS, UNIT_MAP } = require('../data/units');

/**
 * 获取单位名称
 * @param {string} unitId - 单位ID
 * @returns {string} 单位名称，未知ID返回原ID
 */
function getUnitName(unitId) {
  return UNIT_MAP[unitId] || unitId || '';
}

/**
 * 转换为基准单位（克/毫升/个）
 * @param {number} quantity - 数量
 * @param {string} fromUnitId - 原始单位ID
 * @returns {number} 基准单位数量
 */
function toBaseUnit(quantity, fromUnitId) {
  const unitDef = INGREDIENT_UNITS.find((u) => u.id === fromUnitId);
  if (!unitDef) return quantity || 0;
  return (quantity || 0) * unitDef.baseFactor;
}

/**
 * 从基准单位转换为目标单位
 * @param {number} baseQuantity - 基准单位数量
 * @param {string} toUnitId - 目标单位ID
 * @returns {number} 目标单位数量
 */
function fromBaseUnit(baseQuantity, toUnitId) {
  const unitDef = INGREDIENT_UNITS.find((u) => u.id === toUnitId);
  if (!unitDef) return baseQuantity || 0;
  if (unitDef.baseFactor === 0) return 0;
  return (baseQuantity || 0) / unitDef.baseFactor;
}

/**
 * 两个单位之间转换
 * @param {number} quantity - 数量
 * @param {string} fromUnitId - 原始单位ID
 * @param {string} toUnitId - 目标单位ID
 * @returns {number} 转换后数量
 */
function convertUnit(quantity, fromUnitId, toUnitId) {
  if (fromUnitId === toUnitId) return quantity || 0;
  const baseQty = toBaseUnit(quantity, fromUnitId);
  return fromBaseUnit(baseQty, toUnitId);
}

/**
 * 判断两个单位是否同类（重量/体积/计数）
 * @param {string} unitId1 - 单位1
 * @param {string} unitId2 - 单位2
 * @returns {boolean}
 */
function isSameType(unitId1, unitId2) {
  const u1 = INGREDIENT_UNITS.find((u) => u.id === unitId1);
  const u2 = INGREDIENT_UNITS.find((u) => u.id === unitId2);
  if (!u1 || !u2) return false;
  return u1.type === u2.type;
}

/**
 * 格式化数量+单位展示
 * @param {number} quantity - 数量
 * @param {string} unitId - 单位ID
 * @returns {string} 如 "500g"、"2个"
 */
function formatQuantityUnit(quantity, unitId) {
  const unitName = getUnitName(unitId);
  if (!quantity && quantity !== 0) return unitName;
  // 克以下用整数，其他保留合理精度
  if (unitId === 'g' || unitId === 'ml') {
    return `${quantity}${unitName}`;
  }
  if (quantity % 1 === 0) {
    return `${quantity}${unitName}`;
  }
  return `${quantity.toFixed(1)}${unitName}`;
}

/**
 * 获取某类型的所有单位列表
 * @param {string} type - 单位类型（weight/volume/count）
 * @returns {Array} 单位列表
 */
function getUnitsByType(type) {
  return INGREDIENT_UNITS.filter((u) => u.type === type);
}

/**
 * 获取食材单价的基准单位价格（每克/每毫升/每个）
 * @param {number} pricePerUnit - 单价（分）
 * @param {string} unitId - 当前单位
 * @returns {number} 基准单价（分/基准单位）
 */
function getBasePricePerUnit(pricePerUnit, unitId) {
  const unitDef = INGREDIENT_UNITS.find((u) => u.id === unitId);
  if (!unitDef) return pricePerUnit || 0;
  if (unitDef.baseFactor === 0) return 0;
  return Math.round((pricePerUnit || 0) / unitDef.baseFactor);
}

module.exports = {
  getUnitName,
  toBaseUnit,
  fromBaseUnit,
  convertUnit,
  isSameType,
  formatQuantityUnit,
  getUnitsByType,
  getBasePricePerUnit,
};
