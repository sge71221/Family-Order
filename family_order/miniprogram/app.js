// app.js — 微信小程序入口，云开发初始化
const { initCloud } = require('./cloud.init');
const { CacheManager } = require('./utils/cache');
const { EventBus } = require('./utils/event-bus');
const { AuthService } = require('./services/auth-service');
const { FamilyService } = require('./services/family-service');

App({
  /** 全局共享状态 */
  globalData: {
    memberId: '',
    familyId: '',
    familyCode: '',
    nickname: '',
    identity: '',
    avatarUrl: '',
    role: '',
    bigFontMode: false,
    darkMode: false,
    isLoggedIn: false,
    isFamilyJoined: false,
    networkType: 'wifi',
    offlineQueue: [],
  },

  /** 缓存管理器（全局单例） */
  cache: null,

  /** 事件总线（全局单例） */
  eventBus: null,

  /** 认证服务（全局单例） */
  authService: null,

  /** 家庭服务（全局单例） */
  familyService: null,

  /**
   * 小程序启动生命周期
   * 1. 初始化云开发
   * 2. 初始化缓存 & 事件总线
   * 3. 检测网络状态
   * 4. 尝试恢复登录态
   */
  onLaunch() {
    // 1. 云开发初始化
    initCloud();

    // 2. 初始化全局单例
    this.cache = new CacheManager();
    this.eventBus = new EventBus();
    this.authService = new AuthService();
    this.familyService = new FamilyService();

    // 3. 网络状态监听
    this._initNetworkMonitor();

    // 4. 恢复登录态
    this._restoreAuth();

    // 5. 主题初始化
    this._initTheme();
  },

  /** 小程序切到前台 */
  onShow() {
    this._checkNetwork();
  },

  /** 小程序切到后台 */
  onHide() {
    // 保存离线队列到缓存
    if (this.globalData.offlineQueue && this.globalData.offlineQueue.length > 0) {
      this.cache.set('cache_pending_orders', this.globalData.offlineQueue);
    }
  },

  /**
   * 恢复登录态
   * 从缓存读取 token 和成员信息
   */
  async _restoreAuth() {
    try {
      const cachedMember = this.cache.get('cache_auth_token');
      if (cachedMember && cachedMember.memberId) {
        this.globalData.memberId = cachedMember.memberId;
        this.globalData.familyId = cachedMember.familyId || '';
        this.globalData.familyCode = cachedMember.familyCode || '';
        this.globalData.nickname = cachedMember.nickname || '';
        this.globalData.identity = cachedMember.identity || '';
        this.globalData.avatarUrl = cachedMember.avatarUrl || '';
        this.globalData.role = cachedMember.role || '';
        this.globalData.isLoggedIn = true;
        this.globalData.isFamilyJoined = !!cachedMember.familyId;

        // 恢复家庭信息
        if (cachedMember.familyId) {
          const familyInfo = this.cache.get('cache_family_info');
          if (familyInfo) {
            this.globalData.familyCode = familyInfo.familyCode || '';
          }
        }
      }
    } catch (err) {
      console.error('[App] 恢复登录态失败:', err);
    }
  },

  /**
   * 初始化网络监听
   */
  _initNetworkMonitor() {
    wx.onNetworkStatusChange((res) => {
      this.globalData.networkType = res.networkType;
      this.eventBus.emit('networkChange', {
        isConnected: res.isConnected,
        networkType: res.networkType,
      });
      // 网络恢复时尝试提交离线队列
      if (res.isConnected && this.globalData.offlineQueue.length > 0) {
        this._submitOfflineQueue();
      }
    });
  },

  /** 检测当前网络状态 */
  _checkNetwork() {
    wx.getNetworkType({
      success: (res) => {
        this.globalData.networkType = res.networkType;
      },
    });
  },

  /**
   * 提交离线队列中的待提交订单
   */
  async _submitOfflineQueue() {
    const queue = this.globalData.offlineQueue;
    if (!queue || queue.length === 0) return;

    try {
      const { OrderService } = require('./services/order-service');
      const orderService = new OrderService();

      for (let i = 0; i < queue.length; i++) {
        const result = await orderService.submitOrder(queue[i]);
        if (result) {
          queue.splice(i, 1);
          i--;
        }
      }
      this.globalData.offlineQueue = queue;
      this.cache.set('cache_pending_orders', queue);
    } catch (err) {
      console.error('[App] 离线队列提交失败:', err);
    }
  },

  /**
   * 初始化主题（深色/浅色模式）
   */
  _initTheme() {
    const darkMode = this.globalData.darkMode;
    if (darkMode) {
      wx.setStorageSync('theme', 'dark');
    } else {
      wx.setStorageSync('theme', 'light');
    }
  },

  /**
   * 切换主题模式
   * @param {boolean} isDark - 是否深色模式
   */
  toggleTheme(isDark) {
    this.globalData.darkMode = isDark;
    wx.setStorageSync('theme', isDark ? 'dark' : 'light');
    this.eventBus.emit('themeChange', { isDark });
  },

  /**
   * 切换大字模式
   * @param {boolean} isBigFont - 是否大字模式
   */
  toggleBigFont(isBigFont) {
    this.globalData.bigFontMode = isBigFont;
    wx.setStorageSync('bigFontMode', isBigFont);
    this.eventBus.emit('bigFontChange', { isBigFont });
  },

  /**
   * 更新全局用户信息
   * @param {Object} memberData - 成员数据
   */
  updateMemberInfo(memberData) {
    const fields = [
      'memberId', 'familyId', 'familyCode', 'nickname',
      'identity', 'avatarUrl', 'role',
    ];
    fields.forEach((field) => {
      if (memberData[field] !== undefined) {
        this.globalData[field] = memberData[field];
      }
    });
    this.globalData.isLoggedIn = !!memberData.memberId;
    this.globalData.isFamilyJoined = !!memberData.familyId;

    // 同步到缓存
    this.cache.set('cache_auth_token', {
      memberId: this.globalData.memberId,
      familyId: this.globalData.familyId,
      familyCode: this.globalData.familyCode,
      nickname: this.globalData.nickname,
      identity: this.globalData.identity,
      avatarUrl: this.globalData.avatarUrl,
      role: this.globalData.role,
    }, 30 * 24 * 3600 * 1000); // 30天
  },
});
