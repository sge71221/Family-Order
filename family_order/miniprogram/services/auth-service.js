/**
 * auth-service.js — 认证服务
 * 处理微信登录、家庭加入、登录态管理
 */
const { CloudAdapter } = require('./cloud-adapter');
const { CLOUD_FUNCTIONS, DB_COLLECTIONS, CACHE_KEYS, CACHE_EXPIRY, MEMBER_ROLE } = require('../utils/constants');
const { CacheManager } = require('../utils/cache');

class AuthService {
  constructor() {
    this.adapter = new CloudAdapter();
    this.cache = (getApp() || {}).cache || new CacheManager();
  }

  /**
   * 微信登录
   * 调用云函数 login 获取 openid 和 memberId
   * @param {string} nickName - 昵称（可选）
   * @returns {Promise<Object>} { openid, memberId, nickname, ... }
   */
  async wxLogin(nickName = '') {
    try {
      const result = await this.adapter.callFunction(CLOUD_FUNCTIONS.LOGIN, { nickName });

      if (result.code !== 0) {
        throw new Error(result.message || '登录失败');
      }

      const memberData = result.data;

      // 更新全局状态
      const app = getApp();
      app.updateMemberInfo({
        memberId: memberData.memberId,
        nickname: memberData.nickname,
        identity: memberData.identity,
        avatarUrl: memberData.avatarUrl,
        role: memberData.role,
        familyId: memberData.familyId,
      });

      // 缓存登录态
      this.cache.set(CACHE_KEYS.AUTH_TOKEN, memberData, CACHE_EXPIRY.AUTH_TOKEN);

      return memberData;
    } catch (err) {
      console.error('[AuthService] wxLogin失败:', err);
      throw err;
    }
  }

  /**
   * 加入家庭（通过家庭码）
   * @param {string} familyCode - 6位家庭码
   * @param {string} nickname - 昵称
   * @param {string} identity - 身份
   * @param {string} avatarUrl - 头像URL
   * @returns {Promise<Object>} { familyId, familyName, role }
   */
  async joinFamily(familyCode, nickname, identity, avatarUrl) {
    try {
      const result = await this.adapter.callFunction(CLOUD_FUNCTIONS.JOIN_FAMILY, {
        familyCode,
        nickname,
        identity,
        avatarUrl,
      });

      if (result.code !== 0) {
        throw new Error(result.message || '加入家庭失败');
      }

      const joinData = result.data;

      // 更新全局状态
      const app = getApp();
      app.updateMemberInfo({
        familyId: joinData.familyId,
        familyCode: joinData.familyCode,
        role: joinData.role,
      });

      // 缓存家庭信息
      this.cache.set(CACHE_KEYS.FAMILY_INFO, {
        familyId: joinData.familyId,
        familyName: joinData.familyName,
        familyCode: joinData.familyCode,
      }, CACHE_EXPIRY.FAMILY_INFO);

      return joinData;
    } catch (err) {
      console.error('[AuthService] joinFamily失败:', err);
      throw err;
    }
  }

  /**
   * 获取当前成员信息
   * @returns {Object} 全局 globalData 中的成员字段
   */
  getCurrentMember() {
    const app = getApp();
    return {
      memberId: app.globalData.memberId,
      nickname: app.globalData.nickname,
      identity: app.globalData.identity,
      avatarUrl: app.globalData.avatarUrl,
      role: app.globalData.role,
      familyId: app.globalData.familyId,
      familyCode: app.globalData.familyCode,
    };
  }

  /**
   * 是否为管理员
   * @returns {boolean}
   */
  isAdmin() {
    const app = getApp();
    return app.globalData.role === MEMBER_ROLE.ADMIN;
  }

  /**
   * 切换账户（多家庭成员切换）
   * @param {string} memberId - 目标成员ID
   * @returns {Promise<Object>}
   */
  async switchAccount(memberId) {
    try {
      const member = await this.adapter.getOne(DB_COLLECTIONS.MEMBER, memberId);
      if (!member) {
        throw new Error('成员不存在');
      }

      const app = getApp();
      app.updateMemberInfo({
        memberId: member._id,
        nickname: member.nickname,
        identity: member.identity,
        avatarUrl: member.avatarUrl,
        role: member.role,
        familyId: member.familyId,
      });

      return member;
    } catch (err) {
      console.error('[AuthService] switchAccount失败:', err);
      throw err;
    }
  }

  /**
   * 检查登录态
   * @returns {boolean}
   */
  isLoggedIn() {
    const app = getApp();
    return app.globalData.isLoggedIn;
  }

  /**
   * 检查是否已加入家庭
   * @returns {boolean}
   */
  isFamilyJoined() {
    const app = getApp();
    return app.globalData.isFamilyJoined;
  }

  /**
   * 退出登录（清除缓存和全局状态）
   */
  logout() {
    const app = getApp();
    app.globalData.memberId = '';
    app.globalData.familyId = '';
    app.globalData.familyCode = '';
    app.globalData.nickname = '';
    app.globalData.identity = '';
    app.globalData.avatarUrl = '';
    app.globalData.role = '';
    app.globalData.isLoggedIn = false;
    app.globalData.isFamilyJoined = false;

    this.cache.remove(CACHE_KEYS.AUTH_TOKEN);
    this.cache.remove(CACHE_KEYS.FAMILY_INFO);
    this.cache.remove(CACHE_KEYS.TODAY_ORDER);
  }
}

module.exports = { AuthService };
