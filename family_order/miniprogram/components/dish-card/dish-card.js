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
  },

  data: {
    conflictLabels: [],
    costYuan: '',
  },

  observers: {
    'dish': function(dish) {
      if (dish) {
        const { fenToYuan } = require('../../utils/money');
        this.setData({
          costYuan: dish.totalCost ? fenToYuan(dish.totalCost) : '',
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
  },

  methods: {
    onCardTap() {
      this.triggerEvent('cardtap', { dishId: this.data.dish._id, dish: this.data.dish });
    },

    onFavoriteTap() {
      this.triggerEvent('favoritetap', { dishId: this.data.dish._id });
    },

    onAddTap() {
      this.triggerEvent('addtap', { dishId: this.data.dish._id, dish: this.data.dish });
    },
  },
});
