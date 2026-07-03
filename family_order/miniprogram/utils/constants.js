/**
 * constants.js — 全局常量与枚举定义
 * 包含订单状态、权限、缓存过期策略等
 */

/** 订单状态枚举 */
const ORDER_STATUS = {
  ORDERING: 'ordering',  // 正在点餐
  COOKING: 'cooking',    // 正在烹饪
  DONE: 'done',          // 已完成
};

const ORDER_STATUS_CONFIG = {
  ordering: { label: '点餐中', color: '--color-primary', icon: 'ordering' },
  cooking: { label: '烹饪中', color: '--color-warning', icon: 'cooking' },
  done: { label: '已完成', color: '--color-success', icon: 'done' },
};

/** 家庭成员角色 */
const MEMBER_ROLE = {
  ADMIN: 'admin',
  MEMBER: 'member',
};

/** 权限操作枚举 */
const PERMISSION_OPERATIONS = {
  MANAGE_DISHES: 'manage_dishes',         // 管理菜品
  MANAGE_MEMBERS: 'manage_members',       // 管理成员
  MANAGE_FAMILY: 'manage_family',         // 管理家庭设置
  RESET_FAMILY_CODE: 'reset_family_code', // 重置家庭码
  REMOVE_MEMBER: 'remove_member',         // 移除成员
  MANAGE_INGREDIENTS: 'manage_ingredients', // 管理食材库
  VIEW_STATS: 'view_stats',               // 查看统计
};

/** 菜品难度枚举 */
const DISH_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

const DISH_DIFFICULTY_CONFIG = {
  easy: { label: '简单', color: '--color-success' },
  medium: { label: '中等', color: '--color-primary' },
  hard: { label: '复杂', color: '--color-error' },
};

/** 缓存过期时间常量（毫秒） */
const CACHE_EXPIRY = {
  DISHES: 24 * 3600 * 1000,          // 24小时
  INGREDIENTS: 24 * 3600 * 1000,     // 24小时
  CART: -1,                           // 不过期
  PENDING_ORDERS: -1,                 // 不过期
  TODAY_ORDER: 'daily',               // 当日有效（特殊处理）
  FAMILY_INFO: 7 * 24 * 3600 * 1000,  // 7天
  SEARCH_HISTORY: -1,                 // 不过期
  AUTH_TOKEN: 30 * 24 * 3600 * 1000,  // 30天
  MEMBER_DIETARY: 24 * 3600 * 1000,   // 24小时
};

/** 缓存 Key 前缀 */
const CACHE_KEYS = {
  DISHES: 'cache_dishes',
  DISHES_EXPIRE: 'cache_dishes_expire',
  INGREDIENTS: 'cache_ingredients',
  CART: 'cache_cart_',
  PENDING_ORDERS: 'cache_pending_orders',
  TODAY_ORDER: 'cache_today_order',
  FAMILY_INFO: 'cache_family_info',
  SEARCH_HISTORY: 'cache_search_history',
  AUTH_TOKEN: 'cache_auth_token',
  MEMBER_DIETARY: 'cache_member_dietary_',
};

/** 云数据库集合名称 */
const DB_COLLECTIONS = {
  FAMILY: 'Family',
  MEMBER: 'Member',
  MEMBER_DIETARY: 'MemberDietary',
  DISH: 'Dish',
  TAG: 'Tag',
  INGREDIENT: 'Ingredient',
  ORDER: 'Order',
  RATING: 'Rating',
  WEEKLY_MENU: 'WeeklyMenu',
};

/** 云函数名称 */
const CLOUD_FUNCTIONS = {
  LOGIN: 'login',
  CREATE_FAMILY: 'create-family',
  JOIN_FAMILY: 'join-family',
  SUBMIT_ORDER: 'submit-order',
  GENERATE_PURCHASE_LIST: 'generate-purchase-list',
  CALC_COST: 'calc-cost',
};

/** 评分范围 */
const RATING_RANGE = { MIN: 1, MAX: 5 };

/** 名称长度限制 */
const NAME_LENGTH_LIMIT = {
  FAMILY_NAME: 10,
  NICKNAME: 10,
  DISH_NAME: 20,
  TAG_NAME: 6,
  NOTES: 200,
  COMMENT: 30,
};

/** 家庭码长度 */
const FAMILY_CODE_LENGTH = 6;

/** 金额单位：分 */
const MONEY_UNIT_FEN = 'fen';
const MONEY_UNIT_YUAN = 'yuan';

/** 默认分页大小 */
const PAGE_SIZE = 20;

/** 搜索历史最大条数 */
const SEARCH_HISTORY_MAX = 10;

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_CONFIG,
  MEMBER_ROLE,
  PERMISSION_OPERATIONS,
  DISH_DIFFICULTY,
  DISH_DIFFICULTY_CONFIG,
  CACHE_EXPIRY,
  CACHE_KEYS,
  DB_COLLECTIONS,
  CLOUD_FUNCTIONS,
  RATING_RANGE,
  NAME_LENGTH_LIMIT,
  FAMILY_CODE_LENGTH,
  MONEY_UNIT_FEN,
  MONEY_UNIT_YUAN,
  PAGE_SIZE,
  SEARCH_HISTORY_MAX,
};
