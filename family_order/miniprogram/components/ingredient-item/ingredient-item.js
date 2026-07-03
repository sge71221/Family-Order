// ingredient-item.js — 食材条目组件
Component({
  properties: {
    ingredient: { type: Object, value: {} },
    showPrice: { type: Boolean, value: true },
    showStock: { type: Boolean, value: false },
    showExpiry: { type: Boolean, value: false },
    editable: { type: Boolean, value: false },
    showCheckbox: { type: Boolean, value: false },
    isChecked: { type: Boolean, value: false },
  },

  data: {
    priceYuan: '',
    stockText: '',
    expiryText: '',
  },

  observers: {
    'ingredient': function(ing) {
      if (ing) {
        const { fenToYuan } = require('../../utils/money');
        const { getUnitName, formatQuantityUnit } = require('../../utils/unit');
        const { formatFriendlyDate, isExpired } = require('../../utils/date');

        this.setData({
          priceYuan: fenToYuan(ing.pricePerUnit || 0),
          stockText: formatQuantityUnit(ing.stockQuantity || 0, ing.unit || 'g'),
          expiryText: ing.expiryDate ? (isExpired(ing.expiryDate) ? '已过期' : formatFriendlyDate(ing.expiryDate)) : '',
        });
      }
    },
  },

  methods: {
    onCheckboxTap() {
      this.triggerEvent('checkchange', { ingredientId: this.data.ingredient._id, isChecked: !this.data.isChecked });
    },

    onEditTap() {
      this.triggerEvent('edit', { ingredientId: this.data.ingredient._id });
    },
  },
});
