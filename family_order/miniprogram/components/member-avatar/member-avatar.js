// member-avatar.js — 成员头像组件
Component({
  properties: {
    avatarUrl: { type: String, value: '' },
    nickname: { type: String, value: '' },
    identity: { type: String, value: '' },
    size: { type: String, value: 'medium' },  // small / medium / large
    showName: { type: Boolean, value: true },
    showIdentity: { type: Boolean, value: false },
  },

  data: {
    identityLabel: '',
    sizePx: '40px',
  },

  observers: {
    'identity': function(identity) {
      const { IDENTITY_MAP } = require('../../data/dietary-preferences');
      this.setData({ identityLabel: IDENTITY_MAP[identity] || '' });
    },
    'size': function(size) {
      const sizeMap = { small: '32px', medium: '40px', large: '56px' };
      this.setData({ sizePx: sizeMap[size] || '40px' });
    },
  },
});
