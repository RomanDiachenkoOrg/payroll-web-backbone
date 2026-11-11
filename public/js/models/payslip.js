define(['backbone'], function (Backbone) {
  'use strict';

  var Payslip = Backbone.Model.extend({
    urlRoot: '/api/payslips',

    csvUrl: function () {
      return this.url() + '/export.csv';
    },

    totalDeductions: function () {
      return Math.round((this.get('tax') + this.get('social') + this.get('pension') + this.get('other')) * 100) / 100;
    }
  });

  window.App = window.App || {};
  window.App.Models = window.App.Models || {};
  window.App.Models.Payslip = Payslip;

  return Payslip;
});
