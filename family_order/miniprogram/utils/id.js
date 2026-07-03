/**
 * id.js — ID 生成工具
 * 用于生成唯一标识符（家庭码、文档ID等）
 */
const { FAMILY_CODE_LENGTH } = require('./constants');

/**
 * 生成6位数字家庭码（确保随机性）
 * @returns {string} 6位纯数字字符串
 */
function generateFamilyCode() {
  const min = Math.pow(10, FAMILY_CODE_LENGTH - 1);
  const max = Math.pow(10, FAMILY_CODE_LENGTH) - 1;
  const code = Math.floor(Math.random() * (max - min + 1)) + min;
  return String(code);
}

/**
 * 生成基于时间戳的短ID（用于离线临时ID）
 * 格式: T{timestamp后6位}R{随机3位}
 * @returns {string}
 */
function generateTempId() {
  const tsPart = String(Date.now()).slice(-6);
  const randPart = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `T${tsPart}R${randPart}`;
}

/**
 * 生成云存储文件路径
 * @param {string} familyId
 * @param {string} category - 文件类别（如 'dish', 'avatar'）
 * @param {string} ext - 文件扩展名（如 '.jpg', '.png'）
 * @returns {string} 云存储路径
 */
function generateCloudPath(familyId, category, ext) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `/${familyId}/${category}/${timestamp}_${random}${ext}`;
}

/**
 * 生成标签ID
 * @param {string} familyId
 * @param {string} tagName
 * @returns {string}
 */
function generateTagId(familyId, tagName) {
  return `tag_${familyId}_${tagName}_${Date.now()}`;
}

/**
 * 安全生成唯一 ID（用于本地缓存等场景）
 * @returns {string}
 */
function generateUniqueId() {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

module.exports = {
  generateFamilyCode,
  generateTempId,
  generateCloudPath,
  generateTagId,
  generateUniqueId,
};
