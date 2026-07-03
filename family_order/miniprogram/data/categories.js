/**
 * categories.js — 菜品分类常量定义
 * 每个分类包含 id、名称、图标标识、排序权重
 */
const CATEGORIES = [
  { id: 'hot', name: '热菜', icon: 'hot', order: 1 },
  { id: 'cold', name: '凉菜', icon: 'cold', order: 2 },
  { id: 'soup', name: '汤粥', icon: 'soup', order: 3 },
  { id: 'staple', name: '主食', icon: 'staple', order: 4 },
  { id: 'snack', name: '小食', icon: 'snack', order: 5 },
  { id: 'dessert', name: '甜品', icon: 'dessert', order: 6 },
  { id: 'drink', name: '饮品', icon: 'drink', order: 7 },
  { id: 'other', name: '其他', icon: 'other', order: 8 },
];

/** 分类ID → 名称映射 */
const CATEGORY_MAP = {};
CATEGORIES.forEach((cat) => {
  CATEGORY_MAP[cat.id] = cat.name;
});

/** 分类ID枚举 */
const CATEGORY_ENUM = {};
CATEGORIES.forEach((cat) => {
  CATEGORY_ENUM[cat.id.toUpperCase()] = cat.id;
});

module.exports = { CATEGORIES, CATEGORY_MAP, CATEGORY_ENUM };
