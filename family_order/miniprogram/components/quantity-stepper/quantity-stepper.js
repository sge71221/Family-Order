// quantity-stepper.js — 数量步进器组件
Component({
  properties: {
    value: { type: Number, value: 1 },
    min: { type: Number, value: 1 },
    max: { type: Number, value: 99 },
    step: { type: Number, value: 1 },
  },

  methods: {
    onMinusTap() {
      const newVal = Math.max(this.data.min, this.data.value - this.data.step);
      if (newVal !== this.data.value) {
        this.triggerEvent('change', { value: newVal });
      }
    },

    onPlusTap() {
      const newVal = Math.min(this.data.max, this.data.value + this.data.step);
      if (newVal !== this.data.value) {
        this.triggerEvent('change', { value: newVal });
      }
    },
  },
});
