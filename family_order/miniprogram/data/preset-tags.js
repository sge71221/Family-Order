/**
 * preset-tags.js — 预设标签定义
 * 家庭可使用的预设菜品标签（烹饪方式、口味、场景等）
 */
const PRESET_TAGS = {
  cookMethod: [
    { id: 'steam', name: '蒸', group: 'cookMethod' },
    { id: 'boil', name: '煮', group: 'cookMethod' },
    { id: 'stir_fry', name: '炒', group: 'cookMethod' },
    { id: 'braise', name: '炖', group: 'cookMethod' },
    { id: 'roast', name: '烤', group: 'cookMethod' },
    { id: 'fry', name: '炸', group: 'cookMethod' },
    { id: 'mix', name: '拌', group: 'cookMethod' },
    { id: 'marinate', name: '卤', group: 'cookMethod' },
  ],
  flavor: [
    { id: 'sweet', name: '甜', group: 'flavor' },
    { id: 'sour', name: '酸', group: 'flavor' },
    { id: 'spicy', name: '辣', group: 'flavor' },
    { id: 'salty', name: '咸', group: 'flavor' },
    { id: 'light', name: '清淡', group: 'flavor' },
    { id: 'rich', name: '浓郁', group: 'flavor' },
    { id: 'fresh', name: '鲜', group: 'flavor' },
  ],
  scene: [
    { id: 'breakfast', name: '早餐', group: 'scene' },
    { id: 'lunch', name: '午餐', group: 'scene' },
    { id: 'dinner', name: '晚餐', group: 'scene' },
    { id: 'supper', name: '夜宵', group: 'scene' },
    { id: 'holiday', name: '节日', group: 'scene' },
    { id: 'guest', name: '招待', group: 'scene' },
    { id: 'daily', name: '日常', group: 'scene' },
  ],
  difficulty: [
    { id: 'easy', name: '简单', group: 'difficulty' },
    { id: 'medium', name: '中等', group: 'difficulty' },
    { id: 'hard', name: '复杂', group: 'difficulty' },
  ],
  special: [
    { id: 'kids_fav', name: '孩子爱', group: 'special' },
    { id: 'elder_fav', name: '长辈宜', group: 'special' },
    { id: 'low_cal', name: '低卡', group: 'special' },
    { id: 'high_protein', name: '高蛋白', group: 'special' },
    { id: 'quick', name: '快手菜', group: 'special' },
    { id: 'seasonal', name: '时令', group: 'special' },
  ],
};

/** 所有标签的平面列表 */
const ALL_PRESET_TAGS = [];
Object.values(PRESET_TAGS).forEach((group) => {
  group.forEach((tag) => {
    ALL_PRESET_TAGS.push(tag);
  });
});

/** 标签ID → 名称映射 */
const TAG_NAME_MAP = {};
ALL_PRESET_TAGS.forEach((tag) => {
  TAG_NAME_MAP[tag.id] = tag.name;
});

module.exports = { PRESET_TAGS, ALL_PRESET_TAGS, TAG_NAME_MAP };
