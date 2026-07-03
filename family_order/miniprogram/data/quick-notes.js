/**
 * quick-notes.js — 快捷备注模板
 * 点餐时可选的常用备注短语
 */
const QUICK_ORDER_NOTES = [
  { id: 'more_spicy', text: '多点辣', icon: 'spicy' },
  { id: 'no_spicy', text: '不要辣', icon: 'no-spicy' },
  { id: 'more_salt', text: '多点盐', icon: 'salt' },
  { id: 'less_salt', text: '少点盐', icon: 'low-salt' },
  { id: 'more_portion', text: '加量', icon: 'plus' },
  { id: 'less_portion', text: '减量', icon: 'minus' },
  { id: 'no_garlic', text: '不要蒜', icon: 'garlic' },
  { id: 'no_onion', text: '不要葱', icon: 'onion' },
  { id: 'no_ginger', text: '不要姜', icon: 'ginger' },
  { id: 'extra_soup', text: '多加汤', icon: 'soup' },
  { id: 'hot_serve', text: '趁热上', icon: 'hot' },
  { id: 'custom_note', text: '自定义', icon: 'edit' },
];

const QUICK_DISH_NOTES = [
  { id: 'family_recipe', text: '家传做法', icon: 'family' },
  { id: 'improved', text: '改良版', icon: 'improve' },
  { id: 'easy_version', text: '简易版', icon: 'easy' },
  { id: 'seasonal_dish', text: '时令菜', icon: 'season' },
  { id: 'kid_version', text: '儿童版', icon: 'kid' },
  { id: 'elder_version', text: '长辈版', icon: 'elder' },
];

module.exports = { QUICK_ORDER_NOTES, QUICK_DISH_NOTES };
