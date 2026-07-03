// inventory.js — 食材库存管理页面
const { IngredientService } = require('../../services/ingredient-service');
const { INGREDIENT_CATEGORIES, INGREDIENT_CATEGORY_MAP } = require('../../data/units');
const { fenToYuan } = require('../../utils/money');
const { isExpired, formatFriendlyDate } = require('../../utils/date');
const { showLoading, hideLoading, showError, showConfirm } = require('../../utils/network');

Page({
  data: {
    ingredients: [],
    categorizedIngredients: {},
    activeCategory: 'all',
    categories: [{ id: 'all', name: '全部' }, ...INGREDIENT_CATEGORIES],
    expiryWarnings: [],
    loading: true,
    keyword: '',
  },

  _ingredientService: null,

  onLoad() {
    this._ingredientService = new IngredientService();
  },

  onShow() {
    this._loadIngredients();
  },

  async _loadIngredients() {
    this.setData({ loading: true });
    try {
      const ingredients = await this._ingredientService.getIngredientList();
      const warnings = await this._ingredientService.getExpiryWarnings();

      const formatted = ingredients.map((ing) => ({
        ...ing,
        priceYuan: fenToYuan(ing.pricePerUnit || 0),
        isExpired: ing.expiryDate ? isExpired(ing.expiryDate) : false,
        expiryFriendly: ing.expiryDate ? formatFriendlyDate(ing.expiryDate) : '',
      }));

      this._categorize(formatted);

      this.setData({
        ingredients: formatted,
        expiryWarnings: warnings,
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      showError(err);
    }
  },

  _categorize(ingredients) {
    const cat = this.data.activeCategory;
    let filtered = ingredients;
    if (cat !== 'all') {
      filtered = ingredients.filter((i) => i.category === cat);
    }

    const categorized = {};
    filtered.forEach((ing) => {
      const catName = INGREDIENT_CATEGORY_MAP[ing.category] || '其他';
      if (!categorized[catName]) categorized[catName] = [];
      categorized[catName].push(ing);
    });

    this.setData({ categorizedIngredients: categorized });
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeCategory: id });
    this._categorize(this.data.ingredients);
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  async onSearch(e) {
    const keyword = e.detail.value || this.data.keyword;
    const results = await this._ingredientService.searchIngredients(keyword);
    this.setData({ ingredients: results });
    this._categorize(results);
  },

  onEditTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/ingredient-edit/ingredient-edit?ingredientId=${id}` });
  },

  onAddIngredient() {
    wx.navigateTo({ url: '/pages/ingredient-edit/ingredient-edit' });
  },

  async onDelete(e) {
    const id = e.currentTarget.dataset.id;
    const confirmed = await showConfirm('确定删除此食材？');
    if (!confirmed) return;
    try {
      await this._ingredientService.updateIngredient(id, { deleted: true });
      this._loadIngredients();
    } catch (err) {
      showError(err);
    }
  },
});
