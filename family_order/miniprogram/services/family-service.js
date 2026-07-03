/**
 * family-service.js — 家庭服务
 * 家庭创建、信息查询、成员管理、权限检查
 */
const { CloudAdapter } = require('./cloud-adapter');
const { DB_COLLECTIONS, CLOUD_FUNCTIONS, CACHE_KEYS, CACHE_EXPIRY, MEMBER_ROLE, PERMISSION_OPERATIONS } = require('../utils/constants');
const { CacheManager } = require('../utils/cache');

class FamilyService {
  constructor() {
    this.adapter = new CloudAdapter();
    this.cache = (getApp() || {}).cache || new CacheManager();
  }

  /**
   * 创建家庭
   * @param {string} name - 家庭名（≤10字）
   * @returns {Promise<Object>} { familyId, familyCode }
   */
  async createFamily(name) {
    try {
      const app = getApp();
      const memberId = app.globalData.memberId;
      const nickname = app.globalData.nickname;
      const identity = app.globalData.identity;
      const avatarUrl = app.globalData.avatarUrl;

      const result = await this.adapter.callFunction(CLOUD_FUNCTIONS.CREATE_FAMILY, {
        name,
        memberId,
        nickname,
        identity,
        avatarUrl,
      });

      if (result.code !== 0) {
        throw new Error(result.message || '创建家庭失败');
      }

      // 更新全局状态
      app.updateMemberInfo({
        familyId: result.data.familyId,
        familyCode: result.data.familyCode,
        role: MEMBER_ROLE.ADMIN,
      });

      // 缓存家庭信息
      this.cache.set(CACHE_KEYS.FAMILY_INFO, {
        familyId: result.data.familyId,
        familyName: result.data.name,
        familyCode: result.data.familyCode,
      }, CACHE_EXPIRY.FAMILY_INFO);

      return result.data;
    } catch (err) {
      console.error('[FamilyService] createFamily失败:', err);
      throw err;
    }
  }

  /**
   * 获取家庭信息
   * 优先缓存，缓存不存在则云端查询
   * @returns {Promise<Object>} 家庭信息
   */
  async getFamilyInfo() {
    try {
      // 缓存优先
      const cached = this.cache.get(CACHE_KEYS.FAMILY_INFO);
      if (cached) return cached;

      const app = getApp();
      const familyId = app.globalData.familyId;
      if (!familyId) return null;

      const family = await this.adapter.getOne(DB_COLLECTIONS.FAMILY, familyId);
      if (!family) return null;

      const familyInfo = {
        familyId: family._id,
        familyName: family.name,
        familyCode: family.familyCode,
        adminId: family.adminId,
        createdAt: family.createdAt,
      };

      this.cache.set(CACHE_KEYS.FAMILY_INFO, familyInfo, CACHE_EXPIRY.FAMILY_INFO);
      return familyInfo;
    } catch (err) {
      console.error('[FamilyService] getFamilyInfo失败:', err);
      return null;
    }
  }

  /**
   * 获取成员列表
   * @returns {Promise<Array>} 成员数组
   */
  async getMemberList() {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;
      if (!familyId) return [];

      const cmd = this.adapter.getCmd();
      const members = await this.adapter.query(DB_COLLECTIONS.MEMBER, {
        familyId: familyId,
      }, {
        orderBy: [{ field: 'createdAt', direction: 'asc' }],
      });

      return members.map((m) => ({
        memberId: m._id,
        nickname: m.nickname,
        identity: m.identity,
        avatarUrl: m.avatarUrl,
        role: m.role,
        openid: m.openid,
        bigFontMode: m.bigFontMode || false,
        darkMode: m.darkMode || false,
        createdAt: m.createdAt,
      }));
    } catch (err) {
      console.error('[FamilyService] getMemberList失败:', err);
      return [];
    }
  }

  /**
   * 移除成员（仅管理员可操作）
   * @param {string} memberId - 要移除的成员ID
   * @returns {Promise<boolean>}
   */
  async removeMember(memberId) {
    try {
      // 权限检查
      if (!this.checkPermission(PERMISSION_OPERATIONS.REMOVE_MEMBER)) {
        throw new Error('仅管理员可移除成员');
      }

      // 不能移除自己（管理员）
      const app = getApp();
      if (memberId === app.globalData.memberId) {
        throw new Error('不能移除自己');
      }

      // 更新成员的 familyId 为空
      const success = await this.adapter.update(DB_COLLECTIONS.MEMBER, memberId, {
        familyId: '',
        role: 'member',
      });

      return success;
    } catch (err) {
      console.error('[FamilyService] removeMember失败:', err);
      throw err;
    }
  }

  /**
   * 重置家庭码（仅管理员可操作）
   * @returns {Promise<string>} 新家庭码
   */
  async resetFamilyCode() {
    try {
      if (!this.checkPermission(PERMISSION_OPERATIONS.RESET_FAMILY_CODE)) {
        throw new Error('仅管理员可重置家庭码');
      }

      const app = getApp();
      const familyId = app.globalData.familyId;

      // 生成新6位码
      const newCode = String(Math.floor(100000 + Math.random() * 900000));

      // 检查唯一性
      const existing = await this.adapter.query(DB_COLLECTIONS.FAMILY, { familyCode: newCode });
      if (existing.length > 0) {
        // 重试一次
        const altCode = String(Math.floor(100000 + Math.random() * 900000));
        await this.adapter.update(DB_COLLECTIONS.FAMILY, familyId, {
          familyCode: altCode,
          updatedAt: new Date(),
        });
        app.globalData.familyCode = altCode;
        this.cache.remove(CACHE_KEYS.FAMILY_INFO);
        return altCode;
      }

      await this.adapter.update(DB_COLLECTIONS.FAMILY, familyId, {
        familyCode: newCode,
        updatedAt: new Date(),
      });

      app.globalData.familyCode = newCode;
      this.cache.remove(CACHE_KEYS.FAMILY_INFO);
      return newCode;
    } catch (err) {
      console.error('[FamilyService] resetFamilyCode失败:', err);
      throw err;
    }
  }

  /**
   * 检查权限
   * @param {string} operation - 权限操作枚举值
   * @returns {boolean}
   */
  checkPermission(operation) {
    const app = getApp();
    const role = app.globalData.role;

    // 管理员拥有所有权限
    if (role === MEMBER_ROLE.ADMIN) return true;

    // 非管理员的权限列表
    const memberPermissions = [
      PERMISSION_OPERATIONS.VIEW_STATS,
    ];

    return memberPermissions.includes(operation);
  }

  /**
   * 更新家庭名
   * @param {string} name - 新家庭名
   * @returns {Promise<boolean>}
   */
  async updateFamilyName(name) {
    try {
      if (!this.checkPermission(PERMISSION_OPERATIONS.MANAGE_FAMILY)) {
        throw new Error('仅管理员可修改家庭设置');
      }

      const app = getApp();
      const familyId = app.globalData.familyId;

      const success = await this.adapter.update(DB_COLLECTIONS.FAMILY, familyId, {
        name: name,
        updatedAt: new Date(),
      });

      if (success) {
        this.cache.remove(CACHE_KEYS.FAMILY_INFO);
      }

      return success;
    } catch (err) {
      console.error('[FamilyService] updateFamilyName失败:', err);
      throw err;
    }
  }
}

module.exports = { FamilyService };
