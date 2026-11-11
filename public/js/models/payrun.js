define([
  'underscore',
  'backbone',
  'utils/validators',
  'utils/model-action'
], function (_, Backbone, validators, modelAction) {
  'use strict';

  var PayRun = Backbone.Model.extend({
    urlRoot: '/api/payruns',

    defaults: {
      name: '',
      periodStart: '',
      periodEnd: '',
      payDate: '',
      status: 'Draft',
      totals: { employees: 0, gross: 0, net: 0 }
    },

    isLocked: function () {
      return this.get('status') === 'Paid';
    },

    canCalculate: function () {
      return this.get('status') === 'Draft' || this.get('status') === 'Calculated';
    },

    canApprove: function () {
      return this.get('status') === 'Calculated';
    },

    canPay: function () {
      return this.get('status') === 'Approved';
    },

    validate: function (attrs) {
      var errors = {};
      _.each(['periodStart', 'periodEnd', 'payDate'], function (f) {
        if (!validators.isDate(attrs[f])) { errors[f] = 'Enter a valid date (YYYY-MM-DD).'; }
      });
      if (!errors.periodStart && !errors.periodEnd && attrs.periodEnd < attrs.periodStart) {
        errors.periodEnd = 'Period end must be after period start.';
      }
      return _.isEmpty(errors) ? undefined : errors;
    },

    calculate: function () {
      return modelAction(this, 'calculate');
    },

    approve: function () {
      return modelAction(this, 'approve');
    },

    markPaid: function () {
      return modelAction(this, 'pay');
    }
  });

  window.App = window.App || {};
  window.App.Models = window.App.Models || {};
  window.App.Models.PayRun = PayRun;

  return PayRun;
});
