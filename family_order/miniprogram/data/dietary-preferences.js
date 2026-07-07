/**
 * dietary-preferences.js — 饮食偏好 & 忌口类型定义
 * 用于忌口设置页面和过敏源检测
 */
const DIETARY_PREFERENCES = [
  { id: 'vegetarian', name: '素食偏好', description: '偏好素食菜品', icon: 'leaf' },
  { id: 'low_salt', name: '低盐', description: '偏好低盐菜品', icon: 'salt' },
  { id: 'low_sugar', name: '低糖', description: '偏好低糖菜品', icon: 'sugar' },
  { id: 'low_fat', name: '低脂', description: '偏好低脂菜品', icon: 'fat' },
  { id: 'high_protein', name: '高蛋白', description: '偏好高蛋白菜品', icon: 'protein' },
  { id: 'easy_chew', name: '易咀嚼', description: '适合咀嚼不便的长辈', icon: 'chew' },
  { id: 'no_spicy', name: '忌辣', description: '不吃辣味菜品', icon: 'spicy' },
  { id: 'kid_friendly', name: '儿童适宜', description: '适合儿童的口味', icon: 'kid' },
];

/** 过敏源严重程度枚举 */
const ALLERGEN_SEVERITY = {
  SEVERE: 'severe',    // 严重过敏
  MILD: 'mild',        // 轻度过敏
  CAUTION: 'caution',  // 需注意
};

/** 过敏源严重程度展示配置 */
const ALLERGEN_SEVERITY_CONFIG = {
  severe: { label: '严重', color: '--color-allergen-severe', bgColor: '--color-allergen-severe-bg', icon: 'warning' },
  mild: { label: '轻度', color: '--color-allergen-mild', bgColor: '--color-allergen-mild-bg', icon: 'info' },
  caution: { label: '注意', color: '--color-warning', bgColor: '--color-warning-bg', icon: 'tip' },
};

/** 常见过敏食材列表 */
const COMMON_ALLERGEN_INGREDIENTS = [
  { id: 'allergen_milk', name: '牛奶/乳制品', defaultSeverity: 'severe' },
  { id: 'allergen_egg', name: '鸡蛋', defaultSeverity: 'severe' },
  { id: 'allergen_peanut', name: '花生', defaultSeverity: 'severe' },
  { id: 'allergen_tree_nut', name: '坚果', defaultSeverity: 'severe' },
  { id: 'allergen_wheat', name: '小麦/麸质', defaultSeverity: 'mild' },
  { id: 'allergen_soy', name: '大豆', defaultSeverity: 'mild' },
  { id: 'allergen_fish', name: '鱼类', defaultSeverity: 'severe' },
  { id: 'allergen_shellfish', name: '贝类/虾蟹', defaultSeverity: 'severe' },
  { id: 'allergen_sesame', name: '芝麻', defaultSeverity: 'mild' },
  { id: 'allergen_garlic', name: '大蒜', defaultSeverity: 'caution' },
  { id: 'allergen_onion', name: '洋葱', defaultSeverity: 'caution' },
  { id: 'allergen_chili', name: '辣椒', defaultSeverity: 'caution' },
  { id: 'allergen_gluten', name: ' gluten/麸质', defaultSeverity: 'mild' },
];

/** 不喜欢程度枚举 */
const DISLIKE_LEVEL = {
  STRONG: 'strong',   // 很不喜欢
  MILD: 'mild',       // 不太喜欢
  AVOID: 'avoid',     // 尽量避免
};

const DISLIKE_LEVEL_CONFIG = {
  strong: { label: '很不喜欢', priority: 3 },
  mild: { label: '不太喜欢', priority: 2 },
  avoid: { label: '尽量避免', priority: 1 },
};

/** 家庭成员身份枚举 */
const MEMBER_IDENTITY = [
  { id: 'dad', name: '爸爸', icon: 'dad', defaultAvatarIndex: 0 },
  { id: 'mom', name: '妈妈', icon: 'mom', defaultAvatarIndex: 1 },
  { id: 'baby', name: '宝宝', icon: 'baby', defaultAvatarIndex: 2 },
  { id: 'elder', name: '长辈', icon: 'elder', defaultAvatarIndex: 3 },
  { id: 'chef', name: '大厨', icon: 'chef', defaultAvatarIndex: 4 },
  { id: 'foodie', name: '吃货', icon: 'foodie', defaultAvatarIndex: 5 },
];

const IDENTITY_MAP = {};
MEMBER_IDENTITY.forEach((item) => {
  IDENTITY_MAP[item.id] = item.name;
});

module.exports = {
  DIETARY_PREFERENCES,
  ALLERGEN_SEVERITY,
  ALLERGEN_SEVERITY_CONFIG,
  COMMON_ALLERGEN_INGREDIENTS,
  DISLIKE_LEVEL,
  DISLIKE_LEVEL_CONFIG,
  MEMBER_IDENTITY,
  IDENTITY_MAP,
};
