/**
 * default-avatars.js — 默认头像列表
 * 家庭成员可选择的预设头像资源路径
 */
const DEFAULT_AVATARS = [
  '/assets/avatars/dad.png',
  '/assets/avatars/mom.png',
  '/assets/avatars/baby.png',
  '/assets/avatars/elder.png',
  '/assets/avatars/chef.png',
  '/assets/avatars/foodie.png',
];

/** 根据身份获取推荐头像 */
function getRecommendedAvatar(identity) {
  const identityAvatarMap = {
    dad: DEFAULT_AVATARS[0],
    mom: DEFAULT_AVATARS[1],
    baby: DEFAULT_AVATARS[2],
    elder: DEFAULT_AVATARS[3],
    chef: DEFAULT_AVATARS[4],
    foodie: DEFAULT_AVATARS[5],
  };
  return identityAvatarMap[identity] || DEFAULT_AVATARS[0];
}

module.exports = { DEFAULT_AVATARS, getRecommendedAvatar };
