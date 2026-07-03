/**
 * cloud-adapter.js — 云开发适配层
 * 统一封装 wx.cloud 数据库操作，提供标准 CRUD 接口
 * 所有服务层通过此适配器操作云数据库，不直接使用 wx.cloud API
 */
const { DB_COLLECTIONS } = require('../utils/constants');

class CloudAdapter {
  /**
   * 获取云数据库实例
   * @returns {Object} wx.cloud.database()
   */
  _db() {
    return wx.cloud.database();
  }

  /**
   * 查询集合 — 支持条件筛选、排序、分页
   * @param {string} collection - 集合名称
   * @param {Object} conditions - 查询条件 { field: value } 或 { field: _.cmd }
   * @param {Object} options - { orderBy, limit, skip, field }
   * @returns {Promise<Array>} 查询结果数组
   */
  async query(collection, conditions = {}, options = {}) {
    try {
      let queryRef = this._db().collection(collection);

      // 应用条件
      const condKeys = Object.keys(conditions);
      if (condKeys.length > 0) {
        queryRef = queryRef.where(conditions);
      }

      // 排序
      if (options.orderBy) {
        const orderFields = Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy];
        orderFields.forEach((order) => {
          queryRef = queryRef.orderBy(order.field, order.direction || 'asc');
        });
      }

      // 字段筛选
      if (options.field) {
        queryRef = queryRef.field(options.field);
      }

      // 分页
      if (options.skip) {
        queryRef = queryRef.skip(options.skip);
      }
      if (options.limit) {
        queryRef = queryRef.limit(options.limit);
      }

      const res = await queryRef.get();
      return res.data || [];
    } catch (err) {
      console.error('[CloudAdapter] query失败:', collection, err);
      throw err;
    }
  }

  /**
   * 获取单条记录
   * @param {string} collection
   * @param {string} id - 记录 _id
   * @returns {Promise<Object|null>}
   */
  async getOne(collection, id) {
    try {
      const res = await this._db().collection(collection).doc(id).get();
      return res.data || null;
    } catch (err) {
      console.error('[CloudAdapter] getOne失败:', collection, id, err);
      return null;
    }
  }

  /**
   * 新增记录
   * @param {string} collection
   * @param {Object} data - 记录数据（不含 _id）
   * @returns {Promise<string>} 新记录 _id
   */
  async add(collection, data) {
    try {
      // 确保数组字段默认为 []
      const sanitized = this._sanitizeArrays(data);
      const res = await this._db().collection(collection).add({
        data: sanitized,
      });
      return res._id || '';
    } catch (err) {
      console.error('[CloudAdapter] add失败:', collection, err);
      throw err;
    }
  }

  /**
   * 更新记录
   * @param {string} collection
   * @param {string} id
   * @param {Object} data - 更新数据（局部更新，使用 _.cmd 可做原子操作）
   * @returns {Promise<boolean>} 是否更新成功
   */
  async update(collection, id, data) {
    try {
      const res = await this._db().collection(collection).doc(id).update({
        data: data,
      });
      return res.stats && res.stats.updated > 0;
    } catch (err) {
      console.error('[CloudAdapter] update失败:', collection, id, err);
      throw err;
    }
  }

  /**
   * 删除记录
   * @param {string} collection
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async remove(collection, id) {
    try {
      const res = await this._db().collection(collection).doc(id).remove();
      return res.stats && res.stats.removed > 0;
    } catch (err) {
      console.error('[CloudAdapter] remove失败:', collection, id, err);
      throw err;
    }
  }

  /**
   * 统计记录数
   * @param {string} collection
   * @param {Object} conditions
   * @returns {Promise<number>}
   */
  async count(collection, conditions = {}) {
    try {
      let queryRef = this._db().collection(collection);
      if (Object.keys(conditions).length > 0) {
        queryRef = queryRef.where(conditions);
      }
      const res = await queryRef.count();
      return res.total || 0;
    } catch (err) {
      console.error('[CloudAdapter] count失败:', collection, err);
      return 0;
    }
  }

  /**
   * 监听数据变化（实时监听）
   * @param {string} collection
   * @param {Object} conditions
   * @param {Function} onChange - 变化回调
   * @param {Function} onError - 错误回调
   * @returns {Object} watcher 对象（可调用 .close() 关闭）
   */
  watch(collection, conditions, onChange, onError) {
    try {
      let queryRef = this._db().collection(collection);
      if (Object.keys(conditions).length > 0) {
        queryRef = queryRef.where(conditions);
      }
      const watcher = queryRef.watch({
        onChange: (snapshot) => {
          if (onChange) onChange(snapshot);
        },
        onError: (err) => {
          console.error('[CloudAdapter] watch错误:', collection, err);
          if (onError) onError(err);
        },
      });
      return watcher;
    } catch (err) {
      console.error('[CloudAdapter] watch初始化失败:', collection, err);
      if (onError) onError(err);
      return null;
    }
  }

  /**
   * 上传文件到云存储
   * @param {string} filePath - 本地临时文件路径
   * @param {string} cloudPath - 云存储路径
   * @returns {Promise<string>} 文件ID（fileID）
   */
  async uploadFile(filePath, cloudPath) {
    try {
      const res = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath,
      });
      return res.fileID || '';
    } catch (err) {
      console.error('[CloudAdapter] uploadFile失败:', cloudPath, err);
      throw err;
    }
  }

  /**
   * 删除云存储文件
   * @param {Array<string>} fileIDs - 文件ID列表
   * @returns {Promise<Array<string>} 成功删除的文件ID列表
   */
  async deleteFile(fileIDs) {
    try {
      if (!fileIDs || fileIDs.length === 0) return [];
      const res = await wx.cloud.deleteFile({
        fileList: fileIDs,
      });
      return res.fileList.map((f) => f.fileID);
    } catch (err) {
      console.error('[CloudAdapter] deleteFile失败:', err);
      throw err;
    }
  }

  /**
   * 调用云函数
   * @param {string} name - 云函数名
   * @param {Object} data - 传入数据
   * @returns {Promise<Object>} 云函数返回值 { code, data, message }
   */
  async callFunction(name, data = {}) {
    try {
      const res = await wx.cloud.callFunction({
        name: name,
        data: data,
      });
      return res.result || { code: -1, data: null, message: '云函数返回异常' };
    } catch (err) {
      console.error('[CloudAdapter] callFunction失败:', name, err);
      return { code: -1, data: null, message: err.message || '云函数调用失败' };
    }
  }

  /**
   * 获取云数据库查询指令（用于 where 条件的高级操作）
   * @returns {Object} db.command 实例
   */
  getCmd() {
    return this._db().command;
  }

  /**
   * 清洗数据：确保数组字段默认为 []，不用 null
   * 仅对已知数组字段白名单做 null → [] 转换，其他 null 字段直接删除
   * @param {Object} data
   * @returns {Object}
   */
  _sanitizeArrays(data) {
    /** 已知数组字段白名单 — 只有这些字段在为 null 时转换为 [] */
    const ARRAY_FIELDS = [
      'images', 'tags', 'ingredients', 'items', 'allergens',
      'dislikes', 'preferences', 'steps', 'costBreakdown',
    ];
    const result = {};
    Object.keys(data).forEach((key) => {
      const value = data[key];
      if (value === null) {
        if (ARRAY_FIELDS.includes(key)) {
          // 白名单内的数组字段：null → []
          result[key] = [];
        }
        // 非白名单的 null 字段：不写入 result，即删除
      } else {
        result[key] = value;
      }
    });
    return result;
  }
}

module.exports = { CloudAdapter };
