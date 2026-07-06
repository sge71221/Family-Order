// cart-bar.js — 购物车底部操作栏组件
Component({
  properties: {
    itemCount: { type: Number, value: 0 },
    totalCostFen: { type: Number, value: 0 },
    totalCostYuan: { type: String, value: '0.00' },
    buttonText: { type: String, value: '提交订单' },
    disabled: { type: Boolean, value: false },
    bottom: { type: Number, value: -1 },
  },

  data: {
    displayCost: '',
  },

  observers: {
    'totalCostFen': function(fen) {
      const { fenToYuan } = require('../../utils/money');
      this.setData({ displayCost: fenToYuan(fen || 0) });
    },
    'bottom': function(bottom) {
      // bottom === -1 表示使用 CSS 默认的 bottom: 0（webview 底部即 tab-bar 顶部）
      const barStyle = bottom >= 0 ? ('bottom: ' + bottom + 'px;') : '';
      this.setData({ barStyle });
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
