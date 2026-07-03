/**
 * date.js — 日期处理工具函数
 * 统一 YYYY-MM-DD 格式，所有日期操作集中管理
 */

/**
 * 获取当前日期字符串 YYYY-MM-DD
 * @returns {string}
 */
function getToday() {
  return formatDate(new Date());
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date|string|number} date - 日期对象、时间戳或日期字符串
 * @returns {string} YYYY-MM-DD 格式字符串
 */
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期为友好展示文本
 * @param {string} dateStr - YYYY-MM-DD 格式日期
 * @returns {string} 如"今天"、"明天"、"1月5日"
 */
function formatFriendlyDate(dateStr) {
  const today = getToday();
  const tomorrow = getOffsetDate(today, 1);
  const yesterday = getOffsetDate(today, -1);

  if (dateStr === today) return '今天';
  if (dateStr === tomorrow) return '明天';
  if (dateStr === yesterday) return '昨天';

  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
}

/**
 * 获取偏移日期
 * @param {string} baseDate - YYYY-MM-DD 基准日期
 * @param {number} offsetDays - 偏移天数（正为未来，负为过去）
 * @returns {string} YYYY-MM-DD
 */
function getOffsetDate(baseDate, offsetDays) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return formatDate(d);
}

/**
 * 计算两个日期之间的天数差
 * @param {string} date1 - YYYY-MM-DD
 * @param {string} date2 - YYYY-MM-DD
 * @returns {number} 天数差（date2 - date1）
 */
function diffDays(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.round(diffMs / (24 * 3600 * 1000));
}

/**
 * 获取本周起始日期（周一）
 * @param {string} baseDate - YYYY-MM-DD，默认今天
 * @returns {string} YYYY-MM-DD 本周一日期
 */
function getWeekStart(baseDate = '') {
  const d = baseDate ? new Date(baseDate) : new Date();
  const dayOfWeek = d.getDay();
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + offset);
  return formatDate(d);
}

/**
 * 获取本周结束日期（周日）
 * @param {string} baseDate - YYYY-MM-DD，默认今天
 * @returns {string} YYYY-MM-DD 本周日日期
 */
function getWeekEnd(baseDate = '') {
  const weekStart = getWeekStart(baseDate);
  return getOffsetDate(weekStart, 6);
}

/**
 * 获取本月起始日期
 * @param {string} baseDate - YYYY-MM-DD，默认今天
 * @returns {string} YYYY-MM-DD
 */
function getMonthStart(baseDate = '') {
  const d = baseDate ? new Date(baseDate) : new Date();
  return formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/**
 * 获取本月结束日期
 * @param {string} baseDate - YYYY-MM-DD，默认今天
 * @returns {string} YYYY-MM-DD
 */
function getMonthEnd(baseDate = '') {
  const d = baseDate ? new Date(baseDate) : new Date();
  return formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/**
 * 获取月份标签（如 "2026-07"）
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string} YYYY-MM
 */
function getMonthLabel(dateStr) {
  return dateStr.substring(0, 7);
}

/**
 * 判断日期是否是当天
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {boolean}
 */
function isToday(dateStr) {
  return dateStr === getToday();
}

/**
 * 判断日期是否过期
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {boolean}
 */
function isExpired(dateStr) {
  return dateStr < getToday();
}

/**
 * 获取时间戳
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {number} 毫秒时间戳
 */
function toTimestamp(dateStr) {
  return new Date(dateStr).getTime();
}

/**
 * 从时间戳获取日期字符串
 * @param {number} timestamp - 毫秒时间戳
 * @returns {string} YYYY-MM-DD
 */
function fromTimestamp(timestamp) {
  return formatDate(new Date(timestamp));
}

/**
 * 格式化时间为 HH:mm
 * @param {number} timestamp - 毫秒时间戳
 * @returns {string}
 */
function formatTime(timestamp) {
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

module.exports = {
  getToday,
  formatDate,
  formatFriendlyDate,
  getOffsetDate,
  diffDays,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  getMonthLabel,
  isToday,
  isExpired,
  toTimestamp,
  fromTimestamp,
  formatTime,
};
