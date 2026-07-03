// bar-chart.js — 柱状图组件（简易Canvas绘制）
Component({
  properties: {
    data: { type: Array, value: [] },  // [{ label, value }]
    maxValue: { type: Number, value: 0 },
    barColor: { type: String, value: '#F4A261' },
    height: { type: Number, value: 200 },
  },

  data: {
    canvasWidth: 0,
    canvasHeight: 200,
  },

  observers: {
    'data': function(newData) {
      if (newData && newData.length > 0) {
        this.drawChart();
      }
    },
  },

  methods: {
    drawChart() {
      const query = wx.createSelectorQuery().in(this);
      query.select('.bar-chart__canvas').boundingClientRect((rect) => {
        if (!rect) return;
        const ctx = wx.createCanvasContext('barChartCanvas', this);
        const w = rect.width;
        const h = this.data.height || 200;
        const data = this.data.data || [];
        const maxVal = this.data.maxValue || Math.max(...data.map((d) => d.value || 0), 1);
        const barWidth = Math.max(20, (w - 40) / data.length - 8);
        const startX = 20;

        // 清空画布
        ctx.clearRect(0, 0, w, h);

        // 绘制横轴
        ctx.setStrokeStyle('#E8DCC8');
        ctx.setLineWidth(1);
        ctx.beginPath();
        ctx.moveTo(startX, h - 30);
        ctx.lineTo(w - 10, h - 30);
        ctx.stroke();

        // 绘制柱状
        data.forEach((item, index) => {
          const barH = ((item.value || 0) / maxVal) * (h - 50);
          const x = startX + index * (barWidth + 8);
          const y = h - 30 - barH;

          ctx.setFillStyle(this.data.barColor);
          ctx.fillRect(x, y, barWidth, barH);

          // 标签
          ctx.setFillStyle('#6B5B47');
          ctx.setFontSize(10);
          ctx.fillText(item.label || '', x, h - 15, barWidth + 8);

          // 值
          ctx.setFillStyle('#2A1F14');
          ctx.setFontSize(10);
          const { fenToYuan } = require('../../utils/money');
          ctx.fillText(fenToYuan(item.value || 0), x, y - 8, barWidth + 8);
        });

        ctx.draw();
      }).exec();
    },
  },

  lifetimes: {
    attached() {
      if (this.data.data && this.data.data.length > 0) {
        this.drawChart();
      }
    },
  },
});
