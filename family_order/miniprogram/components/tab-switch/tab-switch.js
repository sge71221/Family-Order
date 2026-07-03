// tab-switch.js — 标签切换组件（如：创建/加入模式切换）
Component({
  properties: {
    tabs: { type: Array, value: [] },
    activeIndex: { type: Number, value: 0 },
  },

  methods: {
    onTabTap(e) {
      const index = e.currentTarget.dataset.index;
      this.triggerEvent('change', { index, tab: this.data.tabs[index] });
    },
  },
});
