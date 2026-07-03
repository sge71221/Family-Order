/**
 * cloud.init.js — 云开发环境初始化配置
 * 在 app.js onLaunch 中调用 initCloud()
 */
const CLOUD_ENV_ID = 'cloud1-d1g6p5n175599282e'; // 替换为实际云环境ID

function initCloud() {
  if (!wx.cloud) {
    console.error('[CloudInit] 请使用 2.25.3 或更高版本微信开发者工具');
    return;
  }

  try {
    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true,
    });
    console.info('[CloudInit] 云开发初始化成功, env:', CLOUD_ENV_ID);
  } catch (err) {
    console.error('[CloudInit] 云开发初始化失败:', err);
  }
}

module.exports = { initCloud, CLOUD_ENV_ID };
