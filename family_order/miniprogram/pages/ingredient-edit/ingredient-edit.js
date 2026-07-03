// ingredient-edit.js — 食材编辑页面
const { IngredientService } = require('../../services/ingredient-service');
const { INGREDIENT_UNITS, INGREDIENT_CATEGORIES, INGREDIENT_TYPE_ENUM } = require('../../data/units');
const { validatePrice } = require('../../utils/validator');
const { yuanToFen } = require('../../utils/money');
const { showLoading, hideLoading, showError, showToast, showConfirm } = require('../../utils/network');

Page({
  data: {
    isEdit: false,
    ingredientId: '',
    name: '',
    unit: 'g',
    units: INGREDIENT_UNITS.slice(0, 10),
    pricePerUnit: '',
    stockQuantity: 0,
    expiryDate: '',
    type: 'permanent',
    typeOptions: [
      { id: INGREDIENT_TYPE_ENUM.PERMANENT, name: '常备食材' },
      { id: INGREDIENT_TYPE_ENUM.TEMPORARY, name: '临时食材' },
    ],
    category: 'other',
    categoryOptions: INGREDIENT_CATEGORIES,
    errorMsg: '',
  },

  _ingredientService: null,

  onLoad(options) {
    this._ingredientService = new IngredientService();
    if (options.ingredientId) {
      this.setData({ isEdit: true, ingredientId: options.ingredientId });
      this._loadIngredient(options.ingredientId);
    }
  },

  async _loadIngredient(id) {
    showLoading('加载食材...');
    try {
      const ing = await this._ingredientService.getIngredientList();
      const found = ing.find((i) => i._id === id);
      if (!found) {
        hideLoading();
        showToast('食材不存在', 'none');
        wx.navigateBack();
        return;
      }

      const { fenToYuan } = require('../../utils/money');
      this.setData({
        name: found.name,
        unit: found.unit,
        pricePerUnit: fenToYuan(found.pricePerUnit || 0),
        stockQuantity: found.stockQuantity || 0,
        expiryDate: found.expiryDate || '',
        type: found.type || 'permanent',
        category: found.category || 'other',
      });
      hideLoading();
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },

  onNameInput(e) { this.setData({ name: e.detail.value, errorMsg: '' }); },
  onUnitTap(e) { this.setData({ unit: e.currentTarget.dataset.id }); },
  onPriceInput(e) { this.setData({ pricePerUnit: e.detail.value }); },
  onStockInput(e) { this.setData({ stockQuantity: parseFloat(e.detail.value) || 0 }); },
  onExpiryChange(e) { this.setData({ expiryDate: e.detail.value }); },
  onTypeTap(e) { this.setData({ type: e.currentTarget.dataset.id }); },
  onCategoryTap(e) { this.setData({ category: e.currentTarget.dataset.id }); },

  async onSave() {
    if (!this.data.name || this.data.name.trim() === '') {
      this.setData({ errorMsg: '食材名不能为空' });
      return;
    }

    const priceResult = validatePrice(this.data.pricePerUnit);
    if (!priceResult.valid) {
      this.setData({ errorMsg: priceResult.message });
      return;
    }

    showLoading(this.data.isEdit ? '保存食材...' : '添加食材...');
    try {
      const data = {
        name: this.data.name.trim(),
        unit: this.data.unit,
        pricePerUnit: this.data.pricePerUnit,
        stockQuantity: this.data.stockQuantity,
        expiryDate: this.data.expiryDate,
        type: this.data.type,
        category: this.data.category,
      };

      if (this.data.isEdit) {
        await this._ingredientService.updateIngredient(this.data.ingredientId, data);
        showToast('食材已更新', 'success');
      } else {
        await this._ingredientService.createIngredient(data);
        showToast('食材已添加', 'success');
      }

      hideLoading();
      wx.navigateBack();
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },

  async onDelete() {
    const confirmed = await showConfirm('确定删除此食材？');
    if (!confirmed) return;
    showLoading('删除食材...');
    try {
      await this._ingredientService.updateIngredient(this.data.ingredientId, { deleted: true });
      hideLoading();
      showToast('食材已删除', 'success');
      wx.navigateBack();
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },
});
