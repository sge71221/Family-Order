// login.js — 登录页面逻辑
const { AuthService } = require('../../services/auth-service');
const { FamilyService } = require('../../services/family-service');
const { validateFamilyName, validateNickname, validateFamilyCode } = require('../../utils/validator');
const { showLoading, hideLoading, showError, showToast } = require('../../utils/network');
const { MEMBER_IDENTITY, IDENTITY_MAP } = require('../../data/dietary-preferences');
const { DEFAULT_AVATARS, getRecommendedAvatar } = require('../../data/default-avatars');

Page({
  data: {
    /** 页面步骤: welcome → login → join-family / create-family */
    step: 'welcome',
    /** 创建家庭或加入家庭模式 */
    mode: 'create',
    /** 昵称输入 */
    nickname: '',
    /** 身份选择列表 */
    identityList: MEMBER_IDENTITY,
    /** 选中的身份 */
    selectedIdentity: '',
    /** 选中头像索引 */
    selectedAvatarIndex: -1,
    /** 头像列表 */
    avatarList: DEFAULT_AVATARS,
    /** 家庭名 */
    familyName: '',
    /** 家庭码输入 */
    familyCode: '',
    /** 是否正在请求 */
    loading: false,
    /** 错误提示 */
    errorMsg: '',
  },

  /** 页面加载 */
  onLoad() {
    // 检查是否已登录
    const app = getApp();
    if (app.globalData.isLoggedIn && app.globalData.isFamilyJoined) {
      // 已登录且已加入家庭，直接跳转菜单页
      wx.switchTab({ url: '/pages/menu/menu' });
    } else if (app.globalData.isLoggedIn) {
      // 已登录但未加入家庭
      this.setData({ step: 'join-family' });
    }
  },

  /** 点击"开始使用" */
  onStartTap() {
    this.setData({ step: 'login' });
  },

  /** 昵称输入 */
  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value, errorMsg: '' });
  },

  /** 身份选择 */
  onIdentityTap(e) {
    const identityId = e.currentTarget.dataset.id;
    this.setData({ selectedIdentity: identityId });
    // 自动推荐头像
    const recommended = getRecommendedAvatar(identityId);
    const idx = DEFAULT_AVATARS.indexOf(recommended);
    this.setData({ selectedAvatarIndex: idx >= 0 ? idx : 0 });
  },

  /** 头像选择 */
  onAvatarTap(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedAvatarIndex: index });
  },

  /** 登录确认 */
  async onLoginTap() {
    // 校验昵称
    const nicknameResult = validateNickname(this.data.nickname);
    if (!nicknameResult.valid) {
      this.setData({ errorMsg: nicknameResult.message });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });
    showLoading('登录中...');

    try {
      const authService = new AuthService();
      const memberData = await authService.wxLogin(this.data.nickname);

      // 更新昵称和身份
      const avatarUrl = this.data.selectedAvatarIndex >= 0
        ? DEFAULT_AVATARS[this.data.selectedAvatarIndex]
        : '';

      // 更新成员信息
      const { CloudAdapter } = require('../../services/cloud-adapter');
      const { DB_COLLECTIONS } = require('../../utils/constants');
      const adapter = new CloudAdapter();
      await adapter.update(DB_COLLECTIONS.MEMBER, memberData.memberId, {
        nickname: this.data.nickname.trim(),
        identity: this.data.selectedIdentity || 'dad',
        avatarUrl: avatarUrl,
      });

      hideLoading();
      this.setData({ loading: false });

      // 如果已加入家庭，直接跳转菜单页
      if (memberData.familyId) {
        wx.switchTab({ url: '/pages/menu/menu' });
        return;
      }

      // 未加入家庭，进入加入/创建家庭步骤
      this.setData({ step: 'join-family' });
    } catch (err) {
      this.setData({ loading: false, errorMsg: err.message || '登录失败' });
      hideLoading();
      showError(err);
    }
  },

  /** 切换为创建家庭模式 */
  onCreateModeTap() {
    this.setData({ mode: 'create', errorMsg: '' });
  },

  /** 切换为加入家庭模式 */
  onJoinModeTap() {
    this.setData({ mode: 'join', errorMsg: '' });
  },

  /** 家庭名输入 */
  onFamilyNameInput(e) {
    this.setData({ familyName: e.detail.value, errorMsg: '' });
  },

  /** 家庭码输入 */
  onFamilyCodeInput(e) {
    // 只允许数字输入，自动截取6位
    const val = e.detail.value.replace(/\D/g, '').substring(0, 6);
    this.setData({ familyCode: val, errorMsg: '' });
  },

  /** 创建家庭 */
  async onCreateFamilyTap() {
    const nameResult = validateFamilyName(this.data.familyName);
    if (!nameResult.valid) {
      this.setData({ errorMsg: nameResult.message });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });
    showLoading('创建家庭...');

    try {
      const familyService = new FamilyService();
      const result = await familyService.createFamily(this.data.familyName.trim());

      hideLoading();
      this.setData({ loading: false });
      showToast('家庭创建成功！', 'success');

      // 跳转菜单页
      setTimeout(() => {
        wx.switchTab({ url: '/pages/menu/menu' });
      }, 1500);
    } catch (err) {
      this.setData({ loading: false, errorMsg: err.message || '创建失败' });
      hideLoading();
      showError(err);
    }
  },

  /** 加入家庭 */
  async onJoinFamilyTap() {
    const codeResult = validateFamilyCode(this.data.familyCode);
    if (!codeResult.valid) {
      this.setData({ errorMsg: codeResult.message });
      return;
    }

    const nicknameResult = validateNickname(this.data.nickname);
    if (!nicknameResult.valid) {
      this.setData({ errorMsg: nicknameResult.message });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });
    showLoading('加入家庭...');

    try {
      const authService = new AuthService();
      const avatarUrl = this.data.selectedAvatarIndex >= 0
        ? DEFAULT_AVATARS[this.data.selectedAvatarIndex]
        : '';

      await authService.joinFamily(
        this.data.familyCode,
        this.data.nickname.trim(),
        this.data.selectedIdentity || 'dad',
        avatarUrl,
      );

      hideLoading();
      this.setData({ loading: false });
      showToast('加入成功！', 'success');

      // 跳转菜单页
      setTimeout(() => {
        wx.switchTab({ url: '/pages/menu/menu' });
      }, 1500);
    } catch (err) {
      this.setData({ loading: false, errorMsg: err.message || '加入失败' });
      hideLoading();
      showError(err);
    }
  },
});
