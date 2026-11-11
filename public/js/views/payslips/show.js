define([
  'jquery',
  'underscore',
  'backbone',
  'models/payslip',
  'utils/format',
  'utils/errors',
  'text!templates/payslips/show.html'
], function ($, _, Backbone, Payslip, format, errors, showTpl) {
  'use strict';

  var PayslipView = Backbone.View.extend({
    template: _.template(showTpl),

    events: {
      'click .js-print': 'print'
    },

    initialize: function (options) {
      this.model = new Payslip({ id: Number(options.payslipId) });
      this.loaded = false;
      var self = this;
      this.model.fetch()
        .done(function () {
          self.loaded = true;
          self.render();
        })
        .fail(function (xhr) {
          if (xhr.status === 404) {
            self.$el.html('<div class="alert alert-warning">Payslip not found.</div>');
          } else if (xhr.status !== 401) {
            window.App.flash.error(errors.fromXhr(xhr).message);
          }
        });
    },

    render: function () {
      if (!this.loaded) {
        this.$el.html('<div class="app-loading text-muted">Loading&hellip;</div>');
        return this;
      }
      var p = this.model.toJSON();
      var regularPay = p.rate ? Math.round(p.rate * p.regularHours * 100) / 100 : 0;
      this.$el.html(this.template({
        p: p,
        regularPay: regularPay,
        overtimePay: Math.round((p.gross - regularPay) * 100) / 100,
        totalDeductions: this.model.totalDeductions(),
        csvUrl: this.model.csvUrl(),
        fmt: format
      }));
      return this;
    },

    print: function () {
      window.print();
    }
  });

  return PayslipView;
});
