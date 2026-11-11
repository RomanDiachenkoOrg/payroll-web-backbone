define(['backbone', 'models/payrun'], function (Backbone, PayRun) {
  'use strict';

  var PayRuns = Backbone.Collection.extend({
    model: PayRun,
    url: '/api/payruns',

    comparator: function (a, b) {
      return a.get('periodStart') < b.get('periodStart') ? 1 : -1;
    }
  });

  window.App = window.App || {};
  window.App.Collections = window.App.Collections || {};
  window.App.Collections.PayRuns = PayRuns;

  return PayRuns;
});
