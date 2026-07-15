// dish-card.js — 菜品卡片组件
Component({
  properties: {
    dish: { type: Object, value: {} },
    showPrice: { type: Boolean, value: false },
    showTags: { type: Boolean, value: true },
    showConflict: { type: Boolean, value: false },
    dietaryConflict: { type: Object, value: null },
    compact: { type: Boolean, value: false },
    showFavorite: { type: Boolean, value: true },
    showAdd: { type: Boolean, value: false },
    stockWarning: { type: Object, value: null }, // { hasStock, missingIngredients }
  },

  data: {
    conflictLabels: [],
    costYuan: '',
    noStock: false,
    stockMissingText: '',
    noIngredients: false,
  },

  observers: {
    'dish': function(dish) {
      if (dish) {
        const { fenToYuan } = require('../../utils/money');
        const hasIngredients = dish.ingredients && dish.ingredients.length > 0;
        this.setData({
          costYuan: dish.totalCost ? fenToYuan(dish.totalCost) : '',
          noIngredients: !hasIngredients,
        });
      }
    },
    'dietaryConflict': function(conflict) {
      if (conflict) {
        const { getConflictLabels } = require('../../utils/dietary-check');
        this.setData({ conflictLabels: getConflictLabels(conflict) });
      } else {
        this.setData({ conflictLabels: [] });
      }
    },
    'stockWarning': function(warning) {
      if (warning && !warning.hasStock) {
        this.setData({
          noStock: true,
          stockMissingText: '食材不足: ' + (warning.missingIngredients || []).join('、'),
        });
      } else {
        this.setData({ noStock: false, stockMissingText: '' });
      }
    },
  },

  methods: {
    onCardTap() {
      if (this.data.noStock) {
        wx.showToast({
          title: this.data.stockMissingText,
          icon: 'none',
          duration: 3000,
        });
        return;
      }
      this.triggerEvent('cardtap', { dishId: this.data.dish._id, dish: this.data.dish });
    },

    onFavoriteTap() {
      this.triggerEvent('favoritetap', { dishId: this.data.dish._id });
    },

    onAddTap() {
      if (this.data.noStock) {
        wx.showToast({
          title: this.data.stockMissingText,
          icon: 'none',
          duration: 3000,
        });
        return;
      }
      this.triggerEvent('addtap', { dishId: this.data.dish._id, dish: this.data.dish });
    },
  },
});
