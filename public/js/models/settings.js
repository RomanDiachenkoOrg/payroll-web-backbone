define(['backbone'], function (Backbone) {
  'use strict';

  // singleton resource - always PUT /api/settings
  var Settings = Backbone.Model.extend({
    url: '/api/settings',

    isNew: function () {
      return false;
    },

    defaults: {
      currency: 'USD',
      socialRate: 0.05,
      pensionRate: 0.03,
      payDay: 28,
      taxBrackets: []
    }
  });

  window.App = window.App || {};
  window.App.Models = window.App.Models || {};
  window.App.Models.Settings = Settings;

  return Settings;
});
