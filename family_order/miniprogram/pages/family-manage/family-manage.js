// family-manage.js — 家庭管理页面
const { FamilyService } = require('../../services/family-service');
const { AuthService } = require('../../services/auth-service');
const { showLoading, hideLoading, showError, showToast, showConfirm } = require('../../utils/network');

Page({
  data: {
    familyName: '',
    familyCode: '',
    members: [],
    isAdmin: false,
    loading: true,
  },

  _familyService: null,

  onLoad() {
    this._familyService = new FamilyService();
  },

  onShow() {
    this._loadFamilyInfo();
  },

  async _loadFamilyInfo() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      this.setData({ isAdmin: app.globalData.role === 'admin' });

      const info = await this._familyService.getFamilyInfo();
      const members = await this._familyService.getMemberList();

      this.setData({
        familyName: info ? info.familyName : '',
        familyCode: info ? info.familyCode : '',
        members,
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      showError(err);
    }
  },

  async onResetCode() {
    const confirmed = await showConfirm('重置家庭码后，旧码将失效，确定重置？');
    if (!confirmed) return;
    showLoading('重置中...');
    try {
      const newCode = await this._familyService.resetFamilyCode();
      hideLoading();
      this.setData({ familyCode: newCode });
      showToast('家庭码已重置', 'success');
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },

  async onRemoveMember(e) {
    const memberId = e.currentTarget.dataset.id;
    const memberName = e.currentTarget.dataset.name;
    const confirmed = await showConfirm(`确定移除 ${memberName}？`);
    if (!confirmed) return;
    showLoading('移除中...');
    try {
      await this._familyService.removeMember(memberId);
      hideLoading();
      showToast('成员已移除', 'success');
      this._loadFamilyInfo();
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },

  onCopyCode() {
    wx.setClipboardData({
      data: this.data.familyCode,
      success: () => { showToast('家庭码已复制', 'success'); },
    });
  },

  async onFamilyNameInput(e) {
    this.setData({ familyName: e.detail.value });
  },

  async onUpdateFamilyName() {
    if (!this.data.familyName.trim()) {
      showToast('家庭名不能为空', 'none');
      return;
    }
    showLoading('更新中...');
    try {
      await this._familyService.updateFamilyName(this.data.familyName.trim());
      hideLoading();
      showToast('家庭名已更新', 'success');
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },
});
