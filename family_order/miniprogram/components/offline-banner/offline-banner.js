// offline-banner.js — 离线提示横幅组件
Component({
  properties: {
    isOffline: { type: Boolean, value: false },
  },

  methods: {
    onRetryTap() {
      this.triggerEvent('retry');
    },
  },
});
