// dish-edit.js — 菜品编辑页面（新增/编辑菜品）
const { DishService } = require('../../services/dish-service');
const { TagService } = require('../../services/tag-service');
const { IngredientService } = require('../../services/ingredient-service');
const { CATEGORIES, CATEGORY_MAP } = require('../../data/categories');
const { DISH_DIFFICULTY } = require('../../utils/constants');
const { PRESET_TAGS } = require('../../data/preset-tags');
const { validateDishName, validateNotes } = require('../../utils/validator');
const { showLoading, hideLoading, showError, showToast, showConfirm } = require('../../utils/network');
const { INGREDIENT_UNITS, UNIT_MAP } = require('../../data/units');

Page({
  data: {
    isEdit: false,
    dishId: '',
    name: '',
    category: 'hot',
    categories: CATEGORIES,
    difficulty: 'easy',
    difficultyOptions: [
      { id: 'easy', name: '简单' },
      { id: 'medium', name: '中等' },
      { id: 'hard', name: '复杂' },
    ],
    cookTime: 0,
    notes: '',
    tags: [],
    allTags: [],
    tagGroups: {},
    images: [],
    ingredients: [],
    ingredientUnits: INGREDIENT_UNITS.slice(0, 10),
    steps: [],
    tips: '',
    isAvailable: true,
    selectedIngredientSearch: '',
    ingredientSearchResults: [],
    errorMsg: '',
  },

  _dishService: null,
  _tagService: null,
  _ingredientService: null,

  onLoad(options) {
    this._dishService = new DishService();
    this._tagService = new TagService();
    this._ingredientService = new IngredientService();

    if (options.dishId) {
      this.setData({ isEdit: true, dishId: options.dishId });
      this._loadExistingDish(options.dishId);
    }

    this._loadTags();
  },

  async _loadExistingDish(dishId) {
    showLoading('加载菜品...');
    try {
      const dish = await this._dishService.getDishDetail(dishId);
      if (!dish) {
        hideLoading();
        showToast('菜品不存在', 'none');
        wx.navigateBack();
        return;
      }

      this.setData({
        name: dish.name,
        category: dish.category,
        difficulty: dish.difficulty || 'easy',
        cookTime: dish.cookTime || 0,
        notes: dish.notes || '',
        tags: dish.tags || [],
        images: dish.images || [],
        ingredients: dish.ingredients || [],
        steps: (dish.steps || []).sort((a, b) => (a.order || 0) - (b.order || 0)),
        tips: dish.tips || '',
        isAvailable: dish.isAvailable !== false,
      });

      hideLoading();
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },

  async _loadTags() {
    try {
      const tagGroups = await this._tagService.getTagsByGroup();
      const allTags = [];
      Object.values(tagGroups).forEach((group) => {
        group.forEach((t) => allTags.push(t));
      });
      this.setData({ tagGroups, allTags });
    } catch (err) {
      console.error('[dish-edit] 加载标签失败:', err);
    }
  },

  onNameInput(e) { this.setData({ name: e.detail.value, errorMsg: '' }); },
  onCategoryTap(e) { this.setData({ category: e.currentTarget.dataset.id }); },
  onDifficultyTap(e) { this.setData({ difficulty: e.currentTarget.dataset.id }); },
  onCookTimeInput(e) { this.setData({ cookTime: parseInt(e.detail.value) || 0 }); },
  onNotesInput(e) { this.setData({ notes: e.detail.value }); },
  onTipsInput(e) { this.setData({ tips: e.detail.value }); },
  onAvailableChange(e) { this.setData({ isAvailable: e.detail.value }); },

  onTagTap(e) {
    const tag = e.currentTarget.dataset.tag;
    let tags = [...this.data.tags];
    const tagName = tag.name || tag;
    const idx = tags.indexOf(tagName);
    if (idx >= 0) {
      tags.splice(idx, 1);
    } else {
      tags.push(tagName);
    }
    this.setData({ tags });
  },

  onAddImage() {
    wx.chooseImage({
      count: 3 - this.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ images: [...this.data.images, ...res.tempFilePaths] });
      },
    });
  },

  onDeleteImage(e) {
    const index = e.detail.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  onIngredientSearch(e) {
    const keyword = e.detail.value;
    this.setData({ selectedIngredientSearch: keyword });
    this._searchIngredients(keyword);
  },

  async _searchIngredients(keyword) {
    if (!keyword) {
      this.setData({ ingredientSearchResults: [] });
      return;
    }
    const results = await this._ingredientService.searchIngredients(keyword);
    this.setData({ ingredientSearchResults: results.slice(0, 10) });
  },

  onAddIngredient(e) {
    const ingredientId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const unit = e.currentTarget.dataset.unit || 'g';
    const ingredients = [...this.data.ingredients];
    ingredients.push({ ingredientId, name, quantity: 1, unit });
    this.setData({ ingredients, ingredientSearchResults: [], selectedIngredientSearch: '' });
  },

  onIngredientQtyInput(e) {
    const index = e.currentTarget.dataset.index;
    const value = parseFloat(e.detail.value) || 0;
    const ingredients = [...this.data.ingredients];
    ingredients[index].quantity = value;
    this.setData({ ingredients });
  },

  onRemoveIngredient(e) {
    const index = e.currentTarget.dataset.index;
    const ingredients = [...this.data.ingredients];
    ingredients.splice(index, 1);
    this.setData({ ingredients });
  },

  onAddStep() {
    const steps = [...this.data.steps];
    steps.push({ order: steps.length + 1, text: '', imageUrl: '' });
    this.setData({ steps });
  },

  onStepInput(e) {
    const index = e.currentTarget.dataset.index;
    const steps = [...this.data.steps];
    steps[index].text = e.detail.value;
    this.setData({ steps });
  },

  onRemoveStep(e) {
    const index = e.currentTarget.dataset.index;
    const steps = [...this.data.steps];
    steps.splice(index, 1);
    // 重新排序
    steps.forEach((s, i) => { s.order = i + 1; });
    this.setData({ steps });
  },

  async onSave() {
    const nameResult = validateDishName(this.data.name);
    if (!nameResult.valid) {
      this.setData({ errorMsg: nameResult.message });
      return;
    }

    showLoading(this.data.isEdit ? '保存菜品...' : '创建菜品...');

    try {
      // 上传新图片
      let uploadedImages = [];
      for (const imgPath of this.data.images) {
        if (imgPath.startsWith('cloud://')) {
          uploadedImages.push(imgPath);
        } else {
          const fileID = await this._dishService.uploadDishImage(imgPath);
          uploadedImages.push(fileID);
        }
      }

      const dishData = {
        name: this.data.name.trim(),
        category: this.data.category,
        difficulty: this.data.difficulty,
        cookTime: this.data.cookTime,
        notes: this.data.notes,
        tags: this.data.tags,
        images: uploadedImages,
        ingredients: this.data.ingredients,
        steps: this.data.steps,
        tips: this.data.tips,
        isAvailable: this.data.isAvailable,
      };

      if (this.data.isEdit) {
        await this._dishService.updateDish(this.data.dishId, dishData);
        showToast('菜品已更新', 'success');
      } else {
        await this._dishService.createDish(dishData);
        showToast('菜品已创建', 'success');
      }

      hideLoading();
      wx.navigateBack();
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },

  async onDelete() {
    const confirmed = await showConfirm('确定删除此菜品？删除后不可恢复');
    if (!confirmed) return;

    showLoading('删除菜品...');
    try {
      await this._dishService.deleteDish(this.data.dishId);
      showToast('菜品已删除', 'success');
      hideLoading();
      wx.navigateBack();
    } catch (err) {
      hideLoading();
      showError(err);
    }
  },
});
