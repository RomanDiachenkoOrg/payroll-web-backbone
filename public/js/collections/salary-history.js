define(['backbone', 'models/salary-change'], function (Backbone, SalaryChange) {
  'use strict';

  var SalaryHistory = Backbone.Collection.extend({
    model: SalaryChange,

    initialize: function (models, options) {
      this.employeeId = options.employeeId;
    },

    url: function () {
      return '/api/employees/' + this.employeeId + '/salary-history';
    },

    // newest first
    comparator: function (a, b) {
      return a.get('effectiveDate') < b.get('effectiveDate') ? 1 : -1;
    }
  });

  return SalaryHistory;
});
