// dietary.js — 忌口设置页面
const { DietaryService } = require('../../services/dietary-service');
const { COMMON_ALLERGEN_INGREDIENTS, ALLERGEN_SEVERITY, ALLERGEN_SEVERITY_CONFIG, DIETARY_PREFERENCES, DISLIKE_LEVEL, DISLIKE_LEVEL_CONFIG } = require('../../data/dietary-preferences');
const { showLoading, hideLoading, showError, showToast } = require('../../utils/network');

Page({
  data: {
    allergens: [],
    commonAllergens: COMMON_ALLERGEN_INGREDIENTS,
    severityOptions: [
      { id: ALLERGEN_SEVERITY.SEVERE, name: '严重' },
      { id: ALLERGEN_SEVERITY.MILD, name: '轻度' },
      { id: ALLERGEN_SEVERITY.CAUTION, name: '注意' },
    ],
    dislikes: [],
    dislikeLevelOptions: [
      { id: DISLIKE_LEVEL.STRONG, name: '很不喜欢' },
      { id: DISLIKE_LEVEL.MILD, name: '不太喜欢' },
      { id: DISLIKE_LEVEL.AVOID, name: '尽量避免' },
    ],
    preferences: [],
    preferenceOptions: DIETARY_PREFERENCES,
    newAllergenSearch: '',
    newDislikeSearch: '',
    loading: true,
  },

  _dietaryService: null,

  onLoad() {
    this._dietaryService = new DietaryService();
  },

  onShow() {
    this._loadDietary();
  },

  async _loadDietary() {
    this.setData({ loading: true });
    try {
      const app = getApp();
      const memberId = app.globalData.memberId;
      const dietary = await this._dietaryService.getDietary(memberId);

      this.setData({
        allergens: dietary.allergens || [],
        dislikes: dietary.dislikes || [],
        preferences: dietary.preferences || [],
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      showError(err);
    }
  },

  onAllergenSearch(e) {
    this.setData({ newAllergenSearch: e.detail.value });
  },

  onAddAllergen(e) {
    const allergen = e.currentTarget.dataset.allergen;
    const allergens = [...this.data.allergens];
    const exists = allergens.find((a) => a.name === allergen.name);
    if (exists) {
      showToast('已添加', 'none', 1000);
      return;
    }
    allergens.push({
      ingredientId: allergen.id,
      name: allergen.name,
      severity: allergen.defaultSeverity || 'mild',
    });
    this.setData({ allergens });
  },

  onAddCustomAllergen() {
    const name = this.data.newAllergenSearch.trim();
    if (!name) return;
    const allergens = [...this.data.allergens];
    const exists = allergens.find((a) => a.name === name);
    if (exists) {
      showToast('已添加', 'none', 1000);
      return;
    }
    allergens.push({ ingredientId: '', name, severity: 'mild' });
    this.setData({ allergens, newAllergenSearch: '' });
  },

  onAllergenSeverityTap(e) {
    const index = e.currentTarget.dataset.index;
    const severity = e.currentTarget.dataset.severity;
    const allergens = [...this.data.allergens];
    allergens[index].severity = severity;
    this.setData({ allergens });
  },

  onRemoveAllergen(e) {
    const index = e.currentTarget.dataset.index;
    const allergens = [...this.data.allergens];
    allergens.splice(index, 1);
    this.setData({ allergens });
  },

  onAddDislike(e) {
    const name = e.currentTarget.dataset.name || this.data.newDislikeSearch.trim();
    if (!name) return;
    const dislikes = [...this.data.dislikes];
    const exists = dislikes.find((d) => d.name === name);
    if (exists) {
      showToast('已添加', 'none', 1000);
      return;
    }
    dislikes.push({ ingredientId: '', name, level: 'mild' });
    this.setData({ dislikes, newDislikeSearch: '' });
  },

  onDislikeLevelTap(e) {
    const index = e.currentTarget.dataset.index;
    const level = e.currentTarget.dataset.level;
    const dislikes = [...this.data.dislikes];
    dislikes[index].level = level;
    this.setData({ dislikes });
  },

  onRemoveDislike(e) {
    const index = e.currentTarget.dataset.index;
    const dislikes = [...this.data.dislikes];
    dislikes.splice(index, 1);
    this.setData({ dislikes });
  },

  onPreferenceTap(e) {
    const prefId = e.currentTarget.dataset.id;
    let preferences = [...this.data.preferences];
    const idx = preferences.indexOf(prefId);
    if (idx >= 0) {
      preferences.splice(idx, 1);
    } else {
      preferences.push(prefId);
    }
    this.setData({ preferences });
  },

  async onSave() {
    showLoading('保存忌口设置...');
    try {
      const app = getApp();
      const memberId = app.globalData.memberId;
      await this._dietaryService.saveDietary(memberId, {
        allergens: this.data.allergens,
        dislikes: this.data.dislikes,
        preferences: this.data.preferences,
      });
      hideLoading();
      showToast('忌口设置已保存', 'success');
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },
});
