// add-record.js — 添加采购记录页面
const { IngredientService } = require('../../services/ingredient-service');
const { PurchaseRecordService } = require('../../services/purchase-service');
const { showLoading, hideLoading, showToast, showError } = require('../../utils/network');

const COMMON_UNITS = [
  { id: 'g', name: '克' },
  { id: 'kg', name: '千克' },
  { id: 'piece', name: '个' },
  { id: 'strip', name: '条' },
  { id: 'bottle', name: '瓶' },
  { id: 'box', name: '盒' },
  { id: 'bag', name: '袋' },
  { id: 'head', name: '头' },
  { id: 'bunch', name: '把' },
];

Page({
  data: {
    date: '',
    name: '',
    quantity: '',
    unit: 'piece',
    unitPrice: '',
    category: '',
    remark: '',
    tempTotal: '0.00',
    commonUnits: COMMON_UNITS,
    uniPickerIndex: 0,
    categories: [
      { label: '肉类海鲜', value: 'meat', color: '#E07856' },
      { label: '蔬菜豆制品', value: 'vegetable', color: '#4CAF50' },
      { label: '调料粮油', value: 'seasoning', color: '#FFC107' },
      { label: '水果', value: 'fruit', color: '#F4A261' },
    ],
    canSave: false,
  },

  _ingredientService: null,
  _purchaseRecordService: null,

  onLoad() {
    this._ingredientService = new IngredientService();
    this._purchaseRecordService = new PurchaseRecordService();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.setData({ date: `${year}-${month}-${day}` });
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
    this._checkCanSave();
  },

  onQuantityInput(e) {
    this.setData({ quantity: e.detail.value });
    this._calcTotal();
  },

  onUnitChange(e) {
    const index = e.detail.value;
    this.setData({ uniPickerIndex: index, unit: COMMON_UNITS[index].id });
  },

  onUnitPriceInput(e) {
    this.setData({ unitPrice: e.detail.value });
    this._calcTotal();
  },

  onCategorySelect(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ category: value });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  _calcTotal() {
    const qty = parseFloat(this.data.quantity) || 0;
    const price = parseFloat(this.data.unitPrice) || 0;
    const total = (qty * price).toFixed(2);
    this.setData({ tempTotal: total });
    this._checkCanSave();
  },

  _checkCanSave() {
    const canSave = this.data.name.trim() && this.data.quantity && this.data.unitPrice;
    this.setData({ canSave });
  },

  onCancel() {
    wx.navigateBack();
  },

  async onSave() {
    if (!this.data.canSave) {
      showToast('请填写完整信息');
      return;
    }

    showLoading('保存中...');
    try {
      const qty = parseFloat(this.data.quantity) || 0;
      const price = parseFloat(this.data.unitPrice) || 0;
      const name = this.data.name.trim();

      // 1. 尝试保存采购记录（容错：集合不存在时跳过，不影响库存同步）
      try {
        await this._purchaseRecordService.addRecord({
          date: this.data.date,
          name,
          quantity: qty,
          unit: this.data.unit,
          unitPrice: price,
          category: this.data.category || 'other',
          remark: this.data.remark,
        });
      } catch (recordErr) {
        console.warn('[AddRecord] 采购记录保存失败:', recordErr.message);
        // 如果是集合不存在，继续保存库存；否则抛错
        if (!recordErr.message || !recordErr.message.includes('not exist')) {
          throw recordErr;
        }
      }

      // 2. 同步到食材库存（Ingredient 集合）
      const allIngredients = await this._ingredientService.getIngredientList();
      const existing = allIngredients.find((ing) => ing.name === name);

      if (existing) {
        await this._ingredientService.updateIngredient(existing._id, {
          stockQuantity: (existing.stockQuantity || 0) + qty,
          pricePerUnit: price,
          stockUpdatedAt: new Date(),
        });
      } else {
        await this._ingredientService.createIngredient({
          name,
          unit: this.data.unit,
          pricePerUnit: price,
          stockQuantity: qty,
          category: this.data.category || 'other',
          type: 'temporary',
        });
      }

      hideLoading();
      showToast('保存成功');
      wx.navigateBack();
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },
});
