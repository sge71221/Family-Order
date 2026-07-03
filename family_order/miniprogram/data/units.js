/**
 * units.js — 食材计量单位定义
 * 用于食材管理中的单位选择和换算
 */
const INGREDIENT_UNITS = [
  { id: 'g', name: '克', type: 'weight', baseFactor: 1 },
  { id: 'kg', name: '千克', type: 'weight', baseFactor: 1000 },
  { id: 'lb', name: '磅', type: 'weight', baseFactor: 453.6 },
  { id: 'ml', name: '毫升', type: 'volume', baseFactor: 1 },
  { id: 'l', name: '升', type: 'volume', baseFactor: 1000 },
  { id: 'piece', name: '个', type: 'count', baseFactor: 1 },
  { id: 'pair', name: '对', type: 'count', baseFactor: 2 },
  { id: 'bunch', name: '把', type: 'count', baseFactor: 1 },
  { id: 'slice', name: '片', type: 'count', baseFactor: 1 },
  { id: 'strip', name: '条', type: 'count', baseFactor: 1 },
  { id: 'head', name: '头', type: 'count', baseFactor: 1 },
  { id: 'bag', name: '袋', type: 'count', baseFactor: 1 },
  { id: 'box', name: '盒', type: 'count', baseFactor: 1 },
  { id: 'bottle', name: '瓶', type: 'count', baseFactor: 1 },
  { id: 'can', name: '罐', type: 'count', baseFactor: 1 },
  { id: 'spoon', name: '勺', type: 'count', baseFactor: 1 },
  { id: 'pinch', name: '撮', type: 'count', baseFactor: 1 },
  { id: 'hand', name: '手', type: 'count', baseFactor: 1 },
];

/** 单位ID → 名称映射 */
const UNIT_MAP = {};
INGREDIENT_UNITS.forEach((unit) => {
  UNIT_MAP[unit.id] = unit.name;
});

/** 食材分类 */
const INGREDIENT_CATEGORIES = [
  { id: 'meat', name: '肉类', icon: 'meat' },
  { id: 'vegetable', name: '蔬菜', icon: 'vegetable' },
  { id: 'fruit', name: '水果', icon: 'fruit' },
  { id: 'grain', name: '粮食', icon: 'grain' },
  { id: 'seafood', name: '海鲜', icon: 'seafood' },
  { id: 'dairy', name: '乳制品', icon: 'dairy' },
  { id: 'spice', name: '调料', icon: 'spice' },
  { id: 'oil', name: '油脂', icon: 'oil' },
  { id: 'drink', name: '饮品', icon: 'drink' },
  { id: 'other', name: '其他', icon: 'other' },
];

const INGREDIENT_CATEGORY_MAP = {};
INGREDIENT_CATEGORIES.forEach((cat) => {
  INGREDIENT_CATEGORY_MAP[cat.id] = cat.name;
});

/** 食材类型枚举 */
const INGREDIENT_TYPE_ENUM = {
  PERMANENT: 'permanent',  // 常备食材
  TEMPORARY: 'temporary',  // 临时食材
};

module.exports = {
  INGREDIENT_UNITS,
  UNIT_MAP,
  INGREDIENT_CATEGORIES,
  INGREDIENT_CATEGORY_MAP,
  INGREDIENT_TYPE_ENUM,
};
