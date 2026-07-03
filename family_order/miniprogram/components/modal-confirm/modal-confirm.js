// modal-confirm.js — 确认弹窗组件
Component({
  properties: {
    visible: { type: Boolean, value: false },
    title: { type: String, value: '提示' },
    content: { type: String, value: '' },
    confirmText: { type: String, value: '确认' },
    cancelText: { type: String, value: '取消' },
    confirmColor: { type: String, value: '#F4A261' },
  },

  methods: {
    onConfirmTap() {
      this.triggerEvent('confirm');
    },
    onCancelTap() {
      this.triggerEvent('cancel');
    },
    onMaskTap() {
      this.triggerEvent('cancel');
    },
  },
});
