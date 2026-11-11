define([
  'jquery',
  'underscore',
  'backbone',
  'models/payrun',
  'collections/departments',
  'utils/format',
  'utils/errors',
  'utils/csv',
  'text!templates/payruns/detail.html'
], function ($, _, Backbone, PayRun, Departments, format, errors, csv, detailTpl) {
  'use strict';

  var PayRunDetailView = Backbone.View.extend({
    template: _.template(detailTpl),

    events: {
      'click .js-calculate': 'calculate',
      'click .js-approve': 'approve',
      'click .js-pay': 'markPaid',
      'click .js-delete': 'destroy',
      'click .js-export': 'exportCsv',
      'keyup .payslip-filter': 'onFilter'
    },

    initialize: function (options) {
      this.model = new PayRun({ id: Number(options.payRunId) });
      this.departments = new Departments();
      this.filter = '';
      this.loaded = false;
      this.onFilter = _.debounce(this.onFilter, 200);

      var self = this;
      $.when(this.model.fetch(), this.departments.fetch())
        .done(function () {
          self.loaded = true;
          self.render();
          self.listenTo(self.model, 'change', self.render);
        })
        .fail(function (xhr) {
          if (xhr.status === 404) {
            self.$el.html('<div class="alert alert-warning">Pay run not found. <a href="#payruns">Back to pay runs</a></div>');
          }
        });
    },

    slips: function () {
      return this.model.get('payslips') || [];
    },

    render: function () {
      if (!this.loaded) {
        this.$el.html('<div class="app-loading text-muted">Loading&hellip;</div>');
        return this;
      }
      var q = this.filter.toLowerCase();
      var slips = this.slips();
      this.$el.html(this.template({
        r: this.model.toJSON(),
        slips: slips,
        visible: _.filter(slips, function (p) { return !q || p.employeeName.toLowerCase().indexOf(q) >= 0; }),
        filter: this.filter,
        departments: this.departments,
        canManage: window.App.session.can('payruns:manage'),
        showSlipLinks: window.App.session.get('role') === 'admin' || this.model.get('status') === 'Approved' || this.model.get('status') === 'Paid',
        fmt: format
      }));
      return this;
    },

    onFilter: function () {
      var value = $.trim(this.$('.payslip-filter').val());
      if (value === this.filter) { return; }
      this.filter = value;
      this.render();
      var $input = this.$('.payslip-filter');
      $input.focus().val('').val(value);
    },

    runAction: function (action, message, $btn) {
      $btn.prop('disabled', true);
      this.model[action]()
        .done(function () { window.App.flash.success(message); })
        .fail(function (xhr) {
          window.App.flash.error(errors.fromXhr(xhr).message);
          $btn.prop('disabled', false);
        });
    },

    calculate: function (e) {
      var self = this;
      var $btn = $(e.currentTarget);
      $btn.prop('disabled', true).find('.glyphicon').addClass('spin');
      this.model.calculate()
        .done(function () {
          window.App.flash.success('Calculated ' + self.slips().length + ' payslips.');
        })
        .fail(function (xhr) {
          window.App.flash.error(errors.fromXhr(xhr).message);
          $btn.prop('disabled', false);
        });
    },

    approve: function (e) {
      var self = this;
      var $btn = $(e.currentTarget);
      window.App.confirm({
        title: 'Approve pay run',
        message: 'Approve ' + this.model.get('name') + ' with a net total of ' + format.money(this.model.get('totals').net) +
          '? Employees will be able to see their payslips.',
        confirmLabel: 'Approve'
      }).done(function () {
        self.runAction('approve', 'Pay run approved.', $btn);
      });
    },

    markPaid: function (e) {
      var self = this;
      var $btn = $(e.currentTarget);
      window.App.confirm({
        title: 'Mark as paid',
        message: 'Mark ' + this.model.get('name') + ' as paid? The pay run will be locked and cannot be changed afterwards.',
        confirmLabel: 'Mark as paid',
        danger: true
      }).done(function () {
        self.runAction('markPaid', 'Pay run marked as paid.', $btn);
      });
    },

    destroy: function () {
      var model = this.model;
      window.App.confirm({
        title: 'Delete pay run',
        message: 'Delete ' + model.get('name') + ' and all of its payslips?',
        confirmLabel: 'Delete',
        danger: true
      }).done(function () {
        model.destroy({ wait: true })
          .done(function () {
            window.App.flash.success('Pay run deleted.');
            window.App.navigate('payruns');
          })
          .fail(function (xhr) { window.App.flash.error(errors.fromXhr(xhr).message); });
      });
    },

    exportCsv: function () {
      var departments = this.departments;
      var money = function (v) { return Number(v).toFixed(2); };
      var content = csv.build([
        { key: 'employeeName', label: 'Employee' },
        { key: 'departmentId', label: 'Department', format: function (v) { return departments.nameOf(v); } },
        { key: 'payType', label: 'Pay type' },
        { key: 'regularHours', label: 'Regular hours' },
        { key: 'overtimeHours', label: 'Overtime hours' },
        { key: 'gross', label: 'Gross', format: money },
        { key: 'tax', label: 'Income tax', format: money },
        { key: 'social', label: 'Social', format: money },
        { key: 'pension', label: 'Pension', format: money },
        { key: 'other', label: 'Other deductions', format: money },
        { key: 'net', label: 'Net', format: money }
      ], this.slips());
      csv.download('payrun-' + this.model.get('periodStart').substr(0, 7) + '.csv', content);
    }
  });

  return PayRunDetailView;
});
