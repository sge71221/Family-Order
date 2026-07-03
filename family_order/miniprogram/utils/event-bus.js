/**
 * event-bus.js — 事件总线
 * 用于跨组件/跨页面的事件通信
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Array<{handler: Function, once: boolean}>>} */
    this._listeners = new Map();
  }

  /**
   * 注册事件监听
   * @param {string} event - 事件名
   * @param {Function} handler - 处理函数
   * @returns {EventBus} this（支持链式调用）
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push({ handler, once: false });
    return this;
  }

  /**
   * 注册一次性监听（触发后自动移除）
   * @param {string} event
   * @param {Function} handler
   * @returns {EventBus}
   */
  once(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push({ handler, once: true });
    return this;
  }

  /**
   * 移除事件监听
   * @param {string} event
   * @param {Function} [handler] - 指定处理函数则只移除该函数；不指定则移除所有
   * @returns {EventBus}
   */
  off(event, handler) {
    if (!handler) {
      this._listeners.delete(event);
      return this;
    }
    const listeners = this._listeners.get(event);
    if (!listeners) return this;
    const index = listeners.findIndex((l) => l.handler === handler);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    if (listeners.length === 0) {
      this._listeners.delete(event);
    }
    return this;
  }

  /**
   * 触发事件
   * @param {string} event
   * @param {*} data - 事件数据
   * @returns {EventBus}
   */
  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (!listeners || listeners.length === 0) return this;

    // 复制一份避免遍历中修改
    const toCall = [...listeners];
    toCall.forEach((listener) => {
      try {
        listener.handler(data);
      } catch (err) {
        console.error(`[EventBus] 事件 "${event}" 处理异常:`, err);
      }
    });

    // 移除一次性监听
    const remaining = listeners.filter((l) => !l.once);
    if (remaining.length === 0) {
      this._listeners.delete(event);
    } else {
      this._listeners.set(event, remaining);
    }

    return this;
  }

  /**
   * 清除所有监听
   */
  clear() {
    this._listeners.clear();
  }

  /**
   * 检查某事件是否有监听者
   * @param {string} event
   * @returns {boolean}
   */
  hasListeners(event) {
    const listeners = this._listeners.get(event);
    return listeners && listeners.length > 0;
  }
}

module.exports = { EventBus };
