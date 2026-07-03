/**
 * money.js — 金额处理工具函数
 * 核心原则：存储用分（整数），展示用元（字符串）
 * 避免浮点数运算误差
 */

/**
 * 元 → 分（存储时使用）
 * @param {number|string} yuan - 元金额（如 12.50）
 * @returns {number} 分金额（如 1250）
 */
function yuanToFen(yuan) {
  if (yuan === undefined || yuan === null || yuan === '') return 0;
  const num = typeof yuan === 'string' ? parseFloat(yuan) : yuan;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * 分 → 元（展示时使用）
 * @param {number} fen - 分金额（如 1250）
 * @param {number} decimalPlaces - 小数位数，默认2
 * @returns {string} 元金额字符串（如 "12.50"）
 */
function fenToYuan(fen, decimalPlaces = 2) {
  if (fen === undefined || fen === null) return '0.00';
  const num = typeof fen === 'string' ? parseInt(fen, 10) : fen;
  if (isNaN(num)) return '0.00';
  const yuan = num / 100;
  return yuan.toFixed(decimalPlaces);
}

/**
 * 分 → 元（简化展示，去掉尾部零）
 * 如 1250 → "12.5"，1200 → "12"
 * @param {number} fen - 分金额
 * @returns {string} 简化展示字符串
 */
function fenToYuanSimple(fen) {
  if (fen === undefined || fen === null || fen === 0) return '0';
  const num = typeof fen === 'string' ? parseInt(fen, 10) : fen;
  if (isNaN(num)) return '0';
  const yuan = num / 100;
  // 去掉不必要的零
  const fixed2 = yuan.toFixed(2);
  if (fixed2.endsWith('.00')) return fixed2.substring(0, fixed2.length - 3);
  if (fixed2.endsWith('0')) return fixed2.substring(0, fixed2.length - 1);
  return fixed2;
}

/**
 * 金额加法（分单位，整数运算无误差）
 * @param {number} fen1 - 分金额1
 * @param {number} fen2 - 分金额2
 * @returns {number} 分金额结果
 */
function addFen(fen1, fen2) {
  return (fen1 || 0) + (fen2 || 0);
}

/**
 * 金额减法（分单位）
 * @param {number} fen1 - 分金额1
 * @param {number} fen2 - 分金额2
 * @returns {number} 分金额结果
 */
function subtractFen(fen1, fen2) {
  return (fen1 || 0) - (fen2 || 0);
}

/**
 * 金额乘法（分 × 数量）
 * @param {number} fenPerUnit - 单价（分）
 * @param {number} quantity - 数量
 * @returns {number} 总金额（分）
 */
function multiplyFen(fenPerUnit, quantity) {
  return Math.round((fenPerUnit || 0) * (quantity || 0));
}

/**
 * 金额求和（分单位数组）
 * @param {Array<number>} fenList - 分金额列表
 * @returns {number} 总金额（分）
 */
function sumFen(fenList) {
  if (!fenList || !Array.isArray(fenList)) return 0;
  return fenList.reduce((total, fen) => addFen(total, fen), 0);
}

/**
 * 格式化金额为人民币展示格式
 * 如 1250 → "¥12.50"
 * @param {number} fen - 分金额
 * @param {boolean} showSymbol - 是否显示¥符号，默认true
 * @returns {string}
 */
function formatMoney(fen, showSymbol = true) {
  const yuanStr = fenToYuan(fen);
  return showSymbol ? `¥${yuanStr}` : yuanStr;
}

/**
 * 格式化金额为简化人民币展示
 * 如 1250 → "¥12.5"，1200 → "¥12"
 * @param {number} fen - 分金额
 * @returns {string}
 */
function formatMoneySimple(fen) {
  const yuanStr = fenToYuanSimple(fen);
  return `¥${yuanStr}`;
}

/**
 * 安全解析用户输入的元金额
 * @param {string} input - 用户输入字符串
 * @returns {number} 分金额，无效输入返回0
 */
function parseInputToFen(input) {
  if (!input || typeof input !== 'string') return 0;
  // 移除可能的¥符号和空格
  const cleaned = input.replace(/[¥￥\s]/g, '').trim();
  if (cleaned === '') return 0;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  // 限制最大金额为 99999.99 元
  if (num > 99999.99) return yuanToFen(99999.99);
  if (num < 0) return 0;
  return yuanToFen(num);
}

module.exports = {
  yuanToFen,
  fenToYuan,
  fenToYuanSimple,
  addFen,
  subtractFen,
  multiplyFen,
  sumFen,
  formatMoney,
  formatMoneySimple,
  parseInputToFen,
};
