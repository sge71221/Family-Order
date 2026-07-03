// profile.js — 我的页面（TabBar第五页）
const { AuthService } = require('../../services/auth-service');
const { FamilyService } = require('../../services/family-service');
const { IDENTITY_MAP } = require('../../data/dietary-preferences');
const { showConfirm, showToast } = require('../../utils/network');

Page({
  data: {
    nickname: '',
    identity: '',
    identityLabel: '',
    avatarUrl: '',
    role: '',
    familyName: '',
    familyCode: '',
    isAdmin: false,
    bigFontMode: false,
    darkMode: false,
  },

  onShow() {
    this._refreshProfile();
  },

  _refreshProfile() {
    const app = getApp();
    const gd = app.globalData;

    this.setData({
      nickname: gd.nickname || '未设置',
      identity: gd.identity || '',
      identityLabel: IDENTITY_MAP[gd.identity] || '',
      avatarUrl: gd.avatarUrl || '/assets/avatars/default.png',
      role: gd.role || 'member',
      isAdmin: gd.role === 'admin',
      familyName: '',
      familyCode: gd.familyCode || '',
      bigFontMode: gd.bigFontMode || false,
      darkMode: gd.darkMode || false,
    });

    // 获取家庭信息
    if (gd.familyId) {
      const familyService = new FamilyService();
      familyService.getFamilyInfo().then((info) => {
        if (info) {
          this.setData({ familyName: info.familyName, familyCode: info.familyCode });
        }
      });
    }
  },

  onFamilyManage() {
    wx.navigateTo({ url: '/pages/family-manage/family-manage' });
  },

  onDietary() {
    wx.navigateTo({ url: '/pages/dietary/dietary' });
  },

  onToggleBigFont() {
    const app = getApp();
    const newVal = !this.data.bigFontMode;
    app.toggleBigFont(newVal);
    this.setData({ bigFontMode: newVal });
    showToast(newVal ? '大字模式已开启' : '大字模式已关闭', 'success', 1000);
  },

  onToggleDark() {
    const app = getApp();
    const newVal = !this.data.darkMode;
    app.toggleTheme(newVal);
    this.setData({ darkMode: newVal });
    showToast(newVal ? '深色模式已开启' : '深色模式已关闭', 'success', 1000);
  },

  async onLogout() {
    const confirmed = await showConfirm('确定退出登录？');
    if (!confirmed) return;
    const authService = new AuthService();
    authService.logout();
    wx.reLaunch({ url: '/pages/login/login' });
  },
});
