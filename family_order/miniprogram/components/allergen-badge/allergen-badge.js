// allergen-badge.js — 过敏源徽标组件
Component({
  properties: {
    allergen: { type: Object, value: {} },  // { name, severity }
    severity: { type: String, value: 'mild' },  // severe / mild / caution
  },

  data: {
    label: '',
    color: '',
    bgColor: '',
  },

  observers: {
    'severity': function(severity) {
      const { ALLERGEN_SEVERITY_CONFIG } = require('../../data/dietary-preferences');
      const config = ALLERGEN_SEVERITY_CONFIG[severity] || ALLERGEN_SEVERITY_CONFIG.mild;
      this.setData({
        label: config.label,
        color: `var(${config.color})`,
        bgColor: `var(${config.bgColor})`,
      });
    },
  },
});
