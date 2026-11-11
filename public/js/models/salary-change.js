define(['underscore', 'backbone', 'utils/validators'], function (_, Backbone, validators) {
  'use strict';

  var SalaryChange = Backbone.Model.extend({
    defaults: {
      effectiveDate: '',
      amount: null,
      reason: ''
    },

    validate: function (attrs) {
      var errors = {};
      if (!validators.isPositiveNumber(attrs.amount)) {
        errors.amount = 'Amount must be greater than 0.';
      }
      if (!validators.isDate(attrs.effectiveDate)) {
        errors.effectiveDate = 'Enter a valid date (YYYY-MM-DD).';
      }
      if (validators.isBlank(attrs.reason)) {
        errors.reason = 'Please give a reason.';
      }
      return _.isEmpty(errors) ? undefined : errors;
    }
  });

  window.App = window.App || {};
  window.App.Models = window.App.Models || {};
  window.App.Models.SalaryChange = SalaryChange;

  return SalaryChange;
});
