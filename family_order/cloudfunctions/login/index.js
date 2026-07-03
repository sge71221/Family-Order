/**
 * 云函数: login — 用户登录
 * 获取 openid，创建或获取 Member 记录
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 登录云函数入口
 * @param {Object} event - 传入参数
 * @param {string} event.nickName - 昵称（可选，首次登录时设置）
 * @returns {Object} { code, data: { openid, memberId }, message }
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();

  try {
    // 查询是否已有 Member 记录
    const memberRes = await db.collection('Member').where({
      openid: OPENID,
    }).limit(1).get();

    if (memberRes.data && memberRes.data.length > 0) {
      // 已存在，返回信息
      const member = memberRes.data[0];
      return {
        code: 0,
        data: {
          openid: OPENID,
          memberId: member._id,
          nickname: member.nickname || '',
          identity: member.identity || '',
          avatarUrl: member.avatarUrl || '',
          role: member.role || '',
          familyId: member.familyId || '',
          bigFontMode: member.bigFontMode || false,
          darkMode: member.darkMode || false,
        },
        message: '登录成功',
      };
    }

    // 新用户，创建 Member 记录
    const newMember = {
      openid: OPENID,
      nickname: event.nickName || '',
      identity: '',
      avatarUrl: '',
      role: 'member',
      familyId: '',
      bigFontMode: false,
      darkMode: false,
      createdAt: new Date(),
    };

    const addRes = await db.collection('Member').add({ data: newMember });

    return {
      code: 0,
      data: {
        openid: OPENID,
        memberId: addRes._id,
        nickname: newMember.nickname,
        identity: '',
        avatarUrl: '',
        role: 'member',
        familyId: '',
        bigFontMode: false,
        darkMode: false,
      },
      message: '注册成功',
    };
  } catch (err) {
    console.error('[login] 错误:', err);
    return {
      code: -1,
      data: null,
      message: err.message || '登录失败',
    };
  }
};
