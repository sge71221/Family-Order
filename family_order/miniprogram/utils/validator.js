/**
 * validator.js — 表单验证工具函数
 * 用于页面表单输入校验
 */
const { NAME_LENGTH_LIMIT, FAMILY_CODE_LENGTH } = require('./constants');

/**
 * 验证结果对象结构
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - 是否通过
 * @property {string} message - 错误消息
 */

/**
 * 创建验证结果
 * @param {boolean} valid
 * @param {string} message
 * @returns {ValidationResult}
 */
function result(valid, message = '') {
  return { valid, message };
}

/**
 * 验证非空
 * @param {string} value
 * @param {string} fieldName - 字段名（用于错误提示）
 * @returns {ValidationResult}
 */
function required(value, fieldName = '此字段') {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return result(false, `${fieldName}不能为空`);
  }
  return result(true);
}

/**
 * 验证字符串长度范围
 * @param {string} value
 * @param {number} minLen - 最小长度
 * @param {number} maxLen - 最大长度
 * @param {string} fieldName
 * @returns {ValidationResult}
 */
function lengthRange(value, minLen, maxLen, fieldName = '此字段') {
  const len = (value || '').length;
  if (len < minLen) {
    return result(false, `${fieldName}最少${minLen}个字符`);
  }
  if (len > maxLen) {
    return result(false, `${fieldName}最多${maxLen}个字符`);
  }
  return result(true);
}

/**
 * 验证家庭名
 * @param {string} name
 * @returns {ValidationResult}
 */
function validateFamilyName(name) {
  const req = required(name, '家庭名');
  if (!req.valid) return req;
  return lengthRange(name, 1, NAME_LENGTH_LIMIT.FAMILY_NAME, '家庭名');
}

/**
 * 验证昵称
 * @param {string} nickname
 * @returns {ValidationResult}
 */
function validateNickname(nickname) {
  const req = required(nickname, '昵称');
  if (!req.valid) return req;
  return lengthRange(nickname, 1, NAME_LENGTH_LIMIT.NICKNAME, '昵称');
}

/**
 * 验证菜品名
 * @param {string} dishName
 * @returns {ValidationResult}
 */
function validateDishName(dishName) {
  const req = required(dishName, '菜品名');
  if (!req.valid) return req;
  return lengthRange(dishName, 1, NAME_LENGTH_LIMIT.DISH_NAME, '菜品名');
}

/**
 * 验证标签名
 * @param {string} tagName
 * @returns {ValidationResult}
 */
function validateTagName(tagName) {
  const req = required(tagName, '标签名');
  if (!req.valid) return req;
  return lengthRange(tagName, 1, NAME_LENGTH_LIMIT.TAG_NAME, '标签名');
}

/**
 * 验证备注长度
 * @param {string} notes
 * @returns {ValidationResult}
 */
function validateNotes(notes) {
  if (!notes) return result(true);
  return lengthRange(notes, 0, NAME_LENGTH_LIMIT.NOTES, '备注');
}

/**
 * 验证家庭码
 * @param {string} code
 * @returns {ValidationResult}
 */
function validateFamilyCode(code) {
  const req = required(code, '家庭码');
  if (!req.valid) return req;
  if (code.length !== FAMILY_CODE_LENGTH) {
    return result(false, `家庭码必须为${FAMILY_CODE_LENGTH}位数字`);
  }
  if (!/^\d+$/.test(code)) {
    return result(false, '家庭码必须为纯数字');
  }
  return result(true);
}

/**
 * 验证数量（正整数）
 * @param {number} quantity
 * @param {string} fieldName
 * @returns {ValidationResult}
 */
function validateQuantity(quantity, fieldName = '数量') {
  if (quantity === undefined || quantity === null) {
    return result(false, `${fieldName}不能为空`);
  }
  if (typeof quantity !== 'number' || quantity <= 0) {
    return result(false, `${fieldName}必须为正数`);
  }
  if (!Number.isInteger(quantity)) {
    return result(false, `${fieldName}必须为整数`);
  }
  if (quantity > 99) {
    return result(false, `${fieldName}最大为99`);
  }
  return result(true);
}

/**
 * 验证价格（正数，允许小数）
 * @param {number|string} price - 元金额
 * @returns {ValidationResult}
 */
function validatePrice(price) {
  if (!price && price !== 0) {
    return result(false, '价格不能为空');
  }
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) {
    return result(false, '价格必须为数字');
  }
  if (num < 0) {
    return result(false, '价格不能为负数');
  }
  if (num > 99999.99) {
    return result(false, '价格不能超过99999.99元');
  }
  return result(true);
}

/**
 * 验证手机号（可选，用于未来拓展）
 * @param {string} phone
 * @returns {ValidationResult}
 */
function validatePhone(phone) {
  if (!phone) return result(true); // 非必填
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return result(false, '请输入正确的手机号');
  }
  return result(true);
}

/**
 * 组合验证 — 依次执行多个验证函数
 * @param {Array<ValidationResult>} results
 * @returns {ValidationResult} 第一个失败的结果，或全部通过的最后一个
 */
function combine(...results) {
  for (const r of results) {
    if (!r.valid) return r;
  }
  return result(true);
}

module.exports = {
  result,
  required,
  lengthRange,
  validateFamilyName,
  validateNickname,
  validateDishName,
  validateTagName,
  validateNotes,
  validateFamilyCode,
  validateQuantity,
  validatePrice,
  validatePhone,
  combine,
};
