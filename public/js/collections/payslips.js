define(['backbone', 'models/payslip'], function (Backbone, Payslip) {
  'use strict';

  // payslips of a single employee
  var Payslips = Backbone.Collection.extend({
    model: Payslip,

    initialize: function (models, options) {
      this.employeeId = options && options.employeeId;
    },

    url: function () {
      return '/api/employees/' + this.employeeId + '/payslips';
    }
  });

  return Payslips;
});
