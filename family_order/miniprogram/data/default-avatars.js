/**
 * default-avatars.js — 默认头像列表
 * 家庭成员可选择的预设头像资源路径
 */
const DEFAULT_AVATARS = [
  '/assets/avatars/dad.png',
  '/assets/avatars/mom.png',
  '/assets/avatars/child.png',
  '/assets/avatars/elder.png',
  '/assets/avatars/other-1.png',
  '/assets/avatars/other-2.png',
  '/assets/avatars/other-3.png',
  '/assets/avatars/other-4.png',
  '/assets/avatars/other-5.png',
  '/assets/avatars/other-6.png',
  '/assets/avatars/other-7.png',
  '/assets/avatars/other-8.png',
];

/** 根据身份获取推荐头像 */
function getRecommendedAvatar(identity) {
  const identityAvatarMap = {
    dad: DEFAULT_AVATARS[0],
    mom: DEFAULT_AVATARS[1],
    child: DEFAULT_AVATARS[2],
    elder: DEFAULT_AVATARS[3],
    other: DEFAULT_AVATARS[4],
  };
  return identityAvatarMap[identity] || DEFAULT_AVATARS[4];
}

module.exports = { DEFAULT_AVATARS, getRecommendedAvatar };
