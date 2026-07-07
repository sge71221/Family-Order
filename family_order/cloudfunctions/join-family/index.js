/**
 * 云函数: join-family — 加入家庭
 * 验证家庭码，将 Member 关联到 Family
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 加入家庭云函数入口
 * @param {Object} event
 * @param {string} event.familyCode - 6位家庭码
 * @param {string} event.nickname - 昵称（≤10字）
 * @param {string} event.identity - 身份（爸爸/妈妈/宝宝/长辈/大厨/吃货）
 * @param {string} event.avatarUrl - 头像URL
 * @returns {Object} { code, data: { familyId, familyName, role }, message }
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();

  try {
    // 校验家庭码
    if (!event.familyCode || event.familyCode.length !== 6 || !/^\d+$/.test(event.familyCode)) {
      return { code: 1, data: null, message: '家庭码必须为6位数字' };
    }

    // 查找家庭
    const familyRes = await db.collection('Family').where({
      familyCode: event.familyCode,
    }).limit(1).get();

    if (!familyRes.data || familyRes.data.length === 0) {
      return { code: 2, data: null, message: '家庭码不存在' };
    }

    const family = familyRes.data[0];
    const familyId = family._id;

    // 检查用户是否已加入其他家庭
    const memberRes = await db.collection('Member').where({ openid: OPENID }).limit(1).get();
    if (memberRes.data.length > 0 && memberRes.data[0].familyId) {
      const existingFamilyId = memberRes.data[0].familyId;
      if (existingFamilyId === familyId) {
        return { code: 3, data: null, message: '您已是该家庭成员' };
      }
      return { code: 3, data: null, message: '您已加入其他家庭，不可重复加入' };
    }

    // 校验昵称
    if (!event.nickname || event.nickname.trim() === '') {
      return { code: 1, data: null, message: '昵称不能为空' };
    }
    if (event.nickname.length > 10) {
      return { code: 1, data: null, message: '昵称最多10个字符' };
    }

    // 防御检查：确保 memberRes.data 非空
    if (!memberRes.data || memberRes.data.length === 0) {
      return { code: -1, data: null, message: '用户信息异常，请重新登录' };
    }

    // 更新 Member
    const memberId = memberRes.data[0]._id;
    await db.collection('Member').doc(memberId).update({
      data: {
        familyId: familyId,
        nickname: event.nickname.trim(),
        identity: event.identity || 'dad',
        avatarUrl: event.avatarUrl || '',
        role: 'member',
      },
    });

    // 创建默认忌口记录
    const dietaryData = {
      memberId: memberId,
      allergens: [],
      dislikes: [],
      preferences: [],
      updatedAt: new Date(),
    };
    await db.collection('MemberDietary').add({ data: dietaryData });

    return {
      code: 0,
      data: {
        familyId: familyId,
        familyName: family.name,
        familyCode: family.familyCode,
        role: 'member',
        memberId: memberId,
      },
      message: '加入家庭成功',
    };
  } catch (err) {
    console.error('[join-family] 错误:', err);
    return {
      code: -1,
      data: null,
      message: err.message || '加入家庭失败',
    };
  }
};
