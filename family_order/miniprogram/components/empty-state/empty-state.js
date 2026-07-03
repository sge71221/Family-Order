// empty-state.js — 空状态组件
Component({
  properties: {
    type: { type: String, value: 'no-data' },
    title: { type: String, value: '暂无数据' },
    description: { type: String, value: '' },
    actionText: { type: String, value: '' },
    icon: { type: String, value: '' },
  },

  methods: {
    onActionTap() {
      this.triggerEvent('action');
    },
  },
});
