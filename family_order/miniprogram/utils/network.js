/**
 * network.js — 网络状态检测与离线处理工具
 */
const app = getApp();

/**
 * 检测当前是否联网
 * @returns {Promise<boolean>}
 */
function isOnline() {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success: (res) => {
        resolve(res.networkType !== 'none');
      },
      fail: () => {
        resolve(false);
      },
    });
  });
}

/**
 * 显示离线提示 Toast
 */
function showOfflineToast() {
  wx.showToast({
    title: '当前网络不可用，数据可能不是最新',
    icon: 'none',
    duration: 3000,
  });
}

/**
 * 显示网络恢复提示
 */
function showOnlineToast() {
  wx.showToast({
    title: '网络已恢复',
    icon: 'success',
    duration: 1500,
  });
}

/**
 * 添加操作到离线队列
 * @param {string} type - 操作类型（如 'submitOrder'）
 * @param {Object} data - 操作数据
 */
function addToOfflineQueue(type, data) {
  const appInstance = getApp();
  if (!appInstance.globalData.offlineQueue) {
    appInstance.globalData.offlineQueue = [];
  }
  appInstance.globalData.offlineQueue.push({
    type: type,
    data: data,
    timestamp: Date.now(),
  });
  // 持久化到缓存
  const { CacheManager } = require('./cache');
  const cache = appInstance.cache || new CacheManager();
  cache.set('cache_pending_orders', appInstance.globalData.offlineQueue);
}

/**
 * 网络请求包装器 — 自动检测网络、失败降级
 * @param {Function} onlineFn - 联网时的操作函数（返回 Promise）
 * @param {*} offlineFallback - 离线时的降级数据（可选）
 * @returns {Promise<*>}
 */
async function withNetworkCheck(onlineFn, offlineFallback = null) {
  const online = await isOnline();
  if (online) {
    try {
      return await onlineFn();
    } catch (err) {
      console.error('[Network] 请求失败，降级:', err);
      if (offlineFallback !== null) return offlineFallback;
      throw err;
    }
  } else {
    if (offlineFallback !== null) return offlineFallback;
    showOfflineToast();
    throw new Error('NETWORK_OFFLINE');
  }
}

/**
 * 通用 Toast 提示
 * @param {string} title
 * @param {string} icon - 'success' | 'none' | 'loading' | 'error'
 * @param {number} duration
 */
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration });
}

/**
 * 通用 Loading 提示
 * @param {string} title
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

/**
 * 隐藏 Loading
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 通用确认对话框
 * @param {string} content
 * @param {string} title
 * @returns {Promise<boolean>}
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title: title,
      content: content,
      confirmColor: '#F4A261',
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      },
    });
  });
}

/**
 * 通用错误提示
 * @param {string|Error} err
 */
function showError(err) {
  const msg = err instanceof Error ? err.message : (err || '操作失败');
  showToast(msg, 'none', 2500);
}

module.exports = {
  isOnline,
  showOfflineToast,
  showOnlineToast,
  addToOfflineQueue,
  withNetworkCheck,
  showToast,
  showLoading,
  hideLoading,
  showConfirm,
  showError,
};
