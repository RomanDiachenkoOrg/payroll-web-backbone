define([
  'jquery',
  'underscore',
  'backbone',
  'utils/format',
  'utils/errors',
  'utils/forms',
  'utils/csv',
  'text!templates/reports/cost.html'
], function ($, _, Backbone, format, errors, forms, csv, costTpl) {
  'use strict';

  var MONTH_RE = /^\d{4}-\d{2}$/;
  var AMOUNTS = ['gross', 'tax', 'social', 'pension', 'other', 'net', 'employerCost'];

  function money(v) {
    return Number(v || 0).toFixed(2);
  }

  // default period: the last three months
  function defaultCriteria() {
    var d = new Date();
    var to = new Date(d.getFullYear(), d.getMonth(), 1);
    var from = new Date(d.getFullYear(), d.getMonth() - 2, 1);
    return {
      from: format.isoDate(from).substr(0, 7),
      to: format.isoDate(to).substr(0, 7),
      includeUnpaid: false
    };
  }

  var CostReportView = Backbone.View.extend({
    template: _.template(costTpl),

    events: {
      'submit #report-form': 'onSubmit',
      'click .js-export': 'exportCsv',
      'click .js-print': 'print'
    },

    initialize: function () {
      this.criteria = CostReportView.lastCriteria || defaultCriteria();
      this.report = null;
      this.load();
    },

    load: function () {
      var self = this;
      $.getJSON('/api/reports/department-cost', {
        from: this.criteria.from,
        to: this.criteria.to,
        includeUnpaid: this.criteria.includeUnpaid ? 'true' : 'false'
      }).done(function (report) {
        self.report = report;
        self.render();
      }).fail(function (xhr) {
        self.report = null;
        self.render();
        self.$('.report-error').text(errors.fromXhr(xhr).message).removeClass('hidden');
      });
    },

    totals: function () {
      var total = {};
      _.each(AMOUNTS, function (k) { total[k] = 0; });
      _.each(this.report ? this.report.rows : [], function (r) {
        _.each(AMOUNTS, function (k) { total[k] += r[k]; });
      });
      _.each(AMOUNTS, function (k) { total[k] = Math.round(total[k] * 100) / 100; });
      return total;
    },

    render: function () {
      this.$el.html(this.template({
        criteria: this.criteria,
        report: this.report,
        total: this.totals(),
        fmt: format
      }));
      return this;
    },

    onSubmit: function (e) {
      e.preventDefault();
      var $form = this.$('#report-form');
      var data = forms.serialize($form);
      var errs = {};
      data.from = $.trim(data.from);
      data.to = $.trim(data.to);
      if (!MONTH_RE.test(data.from)) { errs.from = 'Use YYYY-MM.'; }
      if (!MONTH_RE.test(data.to)) { errs.to = 'Use YYYY-MM.'; }
      if (_.isEmpty(errs) && data.to < data.from) { errs.to = 'Must not be before the start month.'; }
      if (!_.isEmpty(errs)) {
        forms.showErrors($form, errs);
        return;
      }
      this.criteria = { from: data.from, to: data.to, includeUnpaid: !!data.includeUnpaid };
      CostReportView.lastCriteria = this.criteria;
      this.load();
    },

    exportCsv: function () {
      if (!this.report) { return; }
      var total = _.extend({ departmentName: 'Total', employees: '' }, this.totals());
      var content = csv.build([
        { key: 'departmentName', label: 'Department' },
        { key: 'employees', label: 'Employees' },
        { key: 'gross', label: 'Gross', format: money },
        { key: 'tax', label: 'Income tax', format: money },
        { key: 'social', label: 'Social', format: money },
        { key: 'other', label: 'Other deductions', format: money },
        { key: 'net', label: 'Net', format: money },
        { key: 'employerCost', label: 'Employer cost', format: money }
      ], this.report.rows.concat([total]));
      csv.download('payroll-cost-' + this.report.from + '-to-' + this.report.to + '.csv', content);
    },

    print: function () {
      window.print();
    }
  });

  return CostReportView;
});
