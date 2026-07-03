/**
 * 云函数: create-family — 创建家庭
 * 生成6位唯一家庭码，创建 Family 记录，更新 Member 角色
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 生成6位数字家庭码
 * @returns {Promise<string>}
 */
async function generateUniqueFamilyCode() {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    // 检查是否已存在
    const res = await db.collection('Family').where({ familyCode: code }).count();
    if (res.total === 0) {
      return code;
    }
  }
  // 极低概率冲突，使用时间戳后6位
  return String(Date.now()).slice(-6);
}

/**
 * 创建家庭云函数入口
 * @param {Object} event
 * @param {string} event.name - 家庭名（≤10字）
 * @param {string} event.memberId - 创建者 memberId
 * @param {string} event.nickname - 创建者昵称
 * @param {string} event.identity - 创建者身份
 * @param {string} event.avatarUrl - 创建者头像
 * @returns {Object} { code, data: { familyId, familyCode }, message }
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();

  try {
    // 校验家庭名
    if (!event.name || event.name.trim() === '') {
      return { code: 1, data: null, message: '家庭名不能为空' };
    }
    if (event.name.length > 10) {
      return { code: 1, data: null, message: '家庭名最多10个字符' };
    }

    // 检查用户是否已加入其他家庭
    const memberRes = await db.collection('Member').where({ openid: OPENID }).limit(1).get();
    if (memberRes.data.length > 0 && memberRes.data[0].familyId) {
      return { code: 2, data: null, message: '您已加入家庭，不可重复创建' };
    }

    // 生成唯一家庭码
    const familyCode = await generateUniqueFamilyCode();

    // 创建 Family 记录
    const familyData = {
      familyCode: familyCode,
      name: event.name.trim(),
      adminId: OPENID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const familyRes = await db.collection('Family').add({ data: familyData });
    const familyId = familyRes._id;

    // 更新 Member 的 familyId 和角色
    if (memberRes.data.length > 0) {
      const memberId = memberRes.data[0]._id;
      await db.collection('Member').doc(memberId).update({
        data: {
          familyId: familyId,
          role: 'admin',
          nickname: event.nickname || memberRes.data[0].nickname || '',
          identity: event.identity || '',
          avatarUrl: event.avatarUrl || '',
        },
      });
    }

    return {
      code: 0,
      data: {
        familyId: familyId,
        familyCode: familyCode,
        name: event.name.trim(),
      },
      message: '家庭创建成功',
    };
  } catch (err) {
    console.error('[create-family] 错误:', err);
    return {
      code: -1,
      data: null,
      message: err.message || '创建家庭失败',
    };
  }
};
