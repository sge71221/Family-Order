// search-bar.js — 搜索栏组件
Component({
  properties: {
    placeholder: { type: String, value: '搜索菜品...' },
    value: { type: String, value: '' },
    showHistory: { type: Boolean, value: true },
    historyList: { type: Array, value: [] },
  },

  data: {
    isFocused: false,
    showHistoryPanel: false,
  },

  methods: {
    onInput(e) {
      this.triggerEvent('input', { value: e.detail.value });
    },

    onClearTap() {
      this.triggerEvent('input', { value: '' });
      this.triggerEvent('clear');
    },

    onFocus() {
      this.setData({ isFocused: true, showHistoryPanel: this.data.showHistory && this.data.historyList.length > 0 });
    },

    onBlur() {
      this.setData({ isFocused: false, showHistoryPanel: false });
    },

    onSearchTap() {
      this.triggerEvent('search', { value: this.data.value });
      this.setData({ showHistoryPanel: false });
    },

    onHistoryTap(e) {
      const keyword = e.currentTarget.dataset.keyword;
      this.triggerEvent('input', { value: keyword });
      this.triggerEvent('search', { value: keyword });
      this.setData({ showHistoryPanel: false });
    },

    onClearHistoryTap() {
      this.triggerEvent('clearhistory');
    },
  },
});
