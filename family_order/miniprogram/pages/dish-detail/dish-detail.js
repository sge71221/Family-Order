// dish-detail.js — 菜品详情页面
const { DishService } = require('../../services/dish-service');
const { DietaryService } = require('../../services/dietary-service');
const { OrderService } = require('../../services/order-service');
const { IngredientService } = require('../../services/ingredient-service');
const { fenToYuan, formatMoney } = require('../../utils/money');
const { formatQuantityUnit, getUnitName } = require('../../utils/unit');
const { showLoading, hideLoading, showError, showToast } = require('../../utils/network');

Page({
  data: {
    dish: null,
    dishId: '',
    conflictResult: null,
    costYuan: '',
    ingredientsDisplay: [],
    stepsDisplay: [],
    loading: true,
    quantity: 1,
    notes: '',
    isAdmin: false,
  },

  _dishService: null,
  _dietaryService: null,
  _orderService: null,

  onLoad(options) {
    const dishId = options.dishId || '';
    this.setData({ dishId });

    this._dishService = new DishService();
    this._dietaryService = new DietaryService();
    this._orderService = new OrderService();

    // 判断是否为管理员（可以从 globalData 获取角色）
    const app = getApp();
    const role = app.globalData.role || '';
    this.setData({ isAdmin: role === 'admin' });

    if (dishId) {
      this._loadDishDetail(dishId);
    }
  },

  /** 加载菜品详情 */
  async _loadDishDetail(dishId) {
    this.setData({ loading: true });
    showLoading('加载菜品...');

    try {
      const dish = await this._dishService.getDishDetail(dishId);
      if (!dish) {
        hideLoading();
        this.setData({ loading: false });
        showToast('菜品不存在', 'none');
        return;
      }

      // 忌口检测
      const app = getApp();
      const memberId = app.globalData.memberId;
      let conflictResult = null;
      if (memberId) {
        conflictResult = await this._dietaryService.checkDishAllergen(dishId, memberId);
      }

      // 成本计算
      const ingredientService = new IngredientService();
      const costFen = await ingredientService.calcDishCost(dishId);

      // 食材展示格式化
      const ingredientsDisplay = (dish.ingredients || []).map((ing) => ({
        ...ing,
        display: formatQuantityUnit(ing.quantity || 0, ing.unit || 'g'),
      }));

      // 步骤格式化
      const stepsDisplay = (dish.steps || []).sort((a, b) => (a.order || 0) - (b.order || 0));

      this.setData({
        dish,
        conflictResult,
        costYuan: fenToYuan(costFen),
        ingredientsDisplay,
        stepsDisplay,
        loading: false,
      });

      hideLoading();
    } catch (err) {
      hideLoading();
      this.setData({ loading: false });
      showError(err);
    }
  },

  /** 数量变更 */
  onQuantityChange(e) {
    this.setData({ quantity: e.detail.value });
  },

  /** 备注输入 */
  onNotesInput(e) {
    this.setData({ notes: e.detail.value });
  },

  /** 加入购物车 */
  onAddToCart() {
    this._orderService.addToCart(this.data.dishId, this.data.quantity, this.data.notes);
    showToast('已加入购物车', 'success');
  },

  /** 编辑菜品 */
  onEditDish() {
    wx.navigateTo({ url: `/pages/dish-edit/dish-edit?dishId=${this.data.dishId}` });
  },

  /** 图片预览 */
  onImagePreview(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.dish.images[index],
      urls: this.data.dish.images,
    });
  },
});
