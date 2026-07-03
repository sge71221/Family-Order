// category-tab.js — 分类标签页组件
Component({
  properties: {
    categories: { type: Array, value: [] },
    activeId: { type: String, value: '' },
  },

  methods: {
    onTabTap(e) {
      const id = e.currentTarget.dataset.id;
      this.triggerEvent('change', { categoryId: id });
    },
  },
});
