// purchase.js — 采购清单页面（TabBar第三页）
const { PurchaseService } = require('../../services/purchase-service');
const { OrderService } = require('../../services/order-service');
const { fenToYuan, formatMoney } = require('../../utils/money');
const { getUnitName, formatQuantityUnit } = require('../../utils/unit');
const { INGREDIENT_CATEGORIES, INGREDIENT_CATEGORY_MAP } = require('../../data/units');
const { showLoading, hideLoading, showError, showToast } = require('../../utils/network');

Page({
  data: {
    purchaseList: [],
    categorizedList: {},
    totalEstimatedCostFen: 0,
    totalEstimatedCostYuan: '',
    checkedCount: 0,
    totalCount: 0,
    loading: true,
    hasOrder: false,
    orderId: '',
  },

  _purchaseService: null,
  _orderService: null,

  onLoad() {
    this._purchaseService = new PurchaseService();
    this._orderService = new OrderService();
  },

  onShow() {
    this._generateList();
  },

  async _generateList() {
    this.setData({ loading: true });
    showLoading('生成采购清单...');

    try {
      const order = await this._orderService.getTodayOrder();
      if (!order) {
        this.setData({ loading: false, hasOrder: false, purchaseList: [] });
        hideLoading();
        return;
      }

      const list = await this._purchaseService.generatePurchaseList(order._id);

      // 格式化展示
      const formatted = list.map((item) => ({
        ...item,
        purchaseQtyStr: formatQuantityUnit(item.purchaseQuantity, item.unit),
        estimatedCostYuan: fenToYuan(item.estimatedCost || 0),
      }));

      // 为每个条目附加原始索引，供 WXML data-index 使用
      formatted.forEach((item, index) => {
        item._originalIndex = index;
      });

      // 按分类分组
      const categorized = {};
      formatted.forEach((item) => {
        const cat = INGREDIENT_CATEGORY_MAP[item.category] || '其他';
        if (!categorized[cat]) categorized[cat] = [];
        categorized[cat].push(item);
      });

      const totalCost = formatted.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);

      this.setData({
        purchaseList: formatted,
        categorizedList: categorized,
        totalEstimatedCostFen: totalCost,
        totalEstimatedCostYuan: fenToYuan(totalCost),
        hasOrder: true,
        orderId: order._id,
        totalCount: formatted.length,
        checkedCount: 0,
        loading: false,
      });

      hideLoading();
    } catch (err) {
      this.setData({ loading: false });
      hideLoading();
      showError(err);
    }
  },

  onItemCheck(e) {
    const index = e.currentTarget.dataset.index;
    const list = [...this.data.purchaseList];
    list[index].isChecked = !list[index].isChecked;
    const checkedCount = list.filter((i) => i.isChecked).length;
    this.setData({ purchaseList: list, checkedCount });
    this._updateCategorizedList(list);
  },

  _updateCategorizedList(list) {
    const categorized = {};
    list.forEach((item) => {
      const cat = INGREDIENT_CATEGORY_MAP[item.category] || '其他';
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push(item);
    });
    this.setData({ categorizedList: categorized });
  },

  onCopyText() {
    const text = this._purchaseService.exportPurchaseList(this.data.purchaseList);
    this._purchaseService.copyPurchaseText(text);
  },

  onShare() {
    return this._purchaseService.sharePurchaseList(this.data.purchaseList);
  },

  onGoInventory() {
    wx.navigateTo({ url: '/pages/inventory/inventory' });
  },
});
