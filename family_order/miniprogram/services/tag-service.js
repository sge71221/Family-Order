/**
 * tag-service.js — 标签服务
 * 标签 CRUD、预设标签合并、自定义标签管理
 */
const { CloudAdapter } = require('./cloud-adapter');
const { DB_COLLECTIONS, CACHE_KEYS } = require('../utils/constants');
const { PRESET_TAGS, ALL_PRESET_TAGS } = require('../data/preset-tags');
const { validateTagName } = require('../utils/validator');

class TagService {
  constructor() {
    this.adapter = new CloudAdapter();
  }

  /**
   * 获取家庭标签列表（预设 + 自定义）
   * @returns {Promise<Array>}
   */
  async getTagList() {
    try {
      const app = getApp();
      const familyId = app.globalData.familyId;
      if (!familyId) return ALL_PRESET_TAGS;

      // 获取自定义标签
      const customTags = await this.adapter.query(DB_COLLECTIONS.TAG, {
        familyId,
      }, {
        orderBy: [{ field: 'createdAt', direction: 'asc' }],
      });

      // 合并预设和自定义
      const allTags = [...ALL_PRESET_TAGS];
      customTags.forEach((tag) => {
        allTags.push({
          id: tag._id,
          name: tag.name,
          group: 'custom',
          isCustom: true,
        });
      });

      return allTags;
    } catch (err) {
      console.error('[TagService] getTagList失败:', err);
      return ALL_PRESET_TAGS;
    }
  }

  /**
   * 创建自定义标签
   * @param {string} name - 标签名（≤6字）
   * @returns {Promise<string>} 新标签ID
   */
  async createTag(name) {
    try {
      const validResult = validateTagName(name);
      if (!validResult.valid) {
        throw new Error(validResult.message);
      }

      const app = getApp();
      const familyId = app.globalData.familyId;

      // 检查是否重名
      const existing = await this.adapter.query(DB_COLLECTIONS.TAG, {
        familyId,
        name: name.trim(),
      });
      if (existing.length > 0) {
        throw new Error('标签已存在');
      }

      // 检查是否与预设标签重名
      const presetMatch = ALL_PRESET_TAGS.find((t) => t.name === name.trim());
      if (presetMatch) {
        throw new Error('该标签为预设标签，无需创建');
      }

      const tagData = {
        familyId,
        name: name.trim(),
        isCustom: true,
        createdAt: new Date(),
      };

      return await this.adapter.add(DB_COLLECTIONS.TAG, tagData);
    } catch (err) {
      console.error('[TagService] createTag失败:', err);
      throw err;
    }
  }

  /**
   * 删除自定义标签
   * @param {string} tagId
   * @returns {Promise<boolean>}
   */
  async deleteTag(tagId) {
    try {
      return await this.adapter.remove(DB_COLLECTIONS.TAG, tagId);
    } catch (err) {
      console.error('[TagService] deleteTag失败:', err);
      throw err;
    }
  }

  /**
   * 按分组获取标签
   * @returns {Promise<Object>} 分组标签对象
   */
  async getTagsByGroup() {
    try {
      const allTags = await this.getTagList();
      const grouped = {};

      // 初始化预设分组
      Object.keys(PRESET_TAGS).forEach((group) => {
        grouped[group] = PRESET_TAGS[group].map((t) => ({ ...t, isCustom: false }));
      });

      // 添加自定义标签到 custom 分组
      grouped.custom = allTags.filter((t) => t.isCustom);

      return grouped;
    } catch (err) {
      console.error('[TagService] getTagsByGroup失败:', err);
      return PRESET_TAGS;
    }
  }
}

module.exports = { TagService };
