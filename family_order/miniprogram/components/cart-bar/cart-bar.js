// cart-bar.js — 购物车底部操作栏组件
Component({
  properties: {
    itemCount: { type: Number, value: 0 },
    totalCostFen: { type: Number, value: 0 },
    totalCostYuan: { type: String, value: '0.00' },
    buttonText: { type: String, value: '提交订单' },
    disabled: { type: Boolean, value: false },
  },

  data: {
    displayCost: '',
  },

  observers: {
    'totalCostFen': function(fen) {
      const { fenToYuan } = require('../../utils/money');
      this.setData({ displayCost: fenToYuan(fen || 0) });
    },
  },

  methods: {
    onSubmitTap() {
      if (!this.data.disabled) {
        this.triggerEvent('submit');
      }
    },

    onCartTap() {
      this.triggerEvent('viewcart');
    },
  },
});
