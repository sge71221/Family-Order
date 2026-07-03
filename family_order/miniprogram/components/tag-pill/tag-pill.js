// tag-pill.js — 标签胶囊组件
Component({
  properties: {
    tags: { type: Array, value: [] },
    type: { type: String, value: 'normal' },  // normal / allergen / preference
    removable: { type: Boolean, value: false },
  },

  methods: {
    onRemoveTap(e) {
      const index = e.currentTarget.dataset.index;
      this.triggerEvent('remove', { index, tag: this.data.tags[index] });
    },

    onTagTap(e) {
      const index = e.currentTarget.dataset.index;
      this.triggerEvent('tagtap', { index, tag: this.data.tags[index] });
    },
  },
});
