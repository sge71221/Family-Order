// dish-image.js — 菜品图片组件（支持多图、上传、预览）
Component({
  properties: {
    images: { type: Array, value: [] },
    maxCount: { type: Number, value: 3 },
    editable: { type: Boolean, value: false },
  },

  methods: {
    onImageTap(e) {
      const index = e.currentTarget.dataset.index;
      wx.previewImage({
        current: this.data.images[index],
        urls: this.data.images,
      });
    },

    onAddTap() {
      wx.chooseImage({
        count: this.data.maxCount - this.data.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.triggerEvent('addimages', { tempFilePaths: res.tempFilePaths });
        },
      });
    },

    onDeleteTap(e) {
      const index = e.currentTarget.dataset.index;
      this.triggerEvent('deleteimage', { index });
    },
  },
});
