define([
  'jquery',
  'underscore',
  'backbone',
  'models/employee',
  'collections/departments',
  'collections/salary-history',
  'collections/payslips',
  'collections/simple',
  'views/employees/raise',
  'utils/format',
  'utils/errors',
  'text!templates/employees/detail.html'
], function ($, _, Backbone, Employee, Departments, SalaryHistory, Payslips, simple, RaiseView,
             format, errors, detailTpl) {
  'use strict';

  var EmployeeDetailView = Backbone.View.extend({
    template: _.template(detailTpl),

    events: {
      'click .js-add-raise': 'openRaise',
      'click .js-deactivate': 'deactivate',
      'click .js-activate': 'activate'
    },

    initialize: function (options) {
      var id = Number(options.employeeId);
      this.model = new Employee({ id: id });
      this.departments = new Departments();
      this.history = new SalaryHistory([], { employeeId: id });
      this.payslips = new Payslips([], { employeeId: id });
      this.deductionTypes = new simple.DeductionTypes();
      this.loaded = false;

      var self = this;
      $.when(this.model.fetch(), this.departments.fetch(), this.history.fetch(),
             this.payslips.fetch(), this.deductionTypes.fetch())
        .done(function () {
          self.loaded = true;
          self.render();
          self.listenTo(self.model, 'change', self.render);
          self.listenTo(self.history, 'add', self.render);
        })
        .fail(function (xhr) {
          if (xhr.status === 404) {
            self.$el.html('<div class="alert alert-warning">Employee not found.</div>');
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
      var session = window.App.session;
      this.$el.html(this.template({
        e: this.model.toJSON(),
        fullName: this.model.fullName(),
        departmentName: this.departments.nameOf(this.model.get('departmentId')),
        history: this.history.toJSON(),
        payslips: this.payslips.toJSON(),
        deductionTypes: this.deductionTypes,
        fmt: format,
        isSelf: session.get('employeeId') === this.model.id,
        canEdit: session.can('employees:edit'),
        canRaise: session.can('salary:edit') && this.model.get('active')
      }));
      return this;
    },

    openRaise: function (e) {
      e.preventDefault();
      new RaiseView({ employee: this.model, history: this.history }).open();
    },

    deactivate: function () {
      var employee = this.model;
      window.App.confirm({
        title: 'Deactivate employee',
        message: 'Deactivate ' + employee.fullName() + '? They will be excluded from future pay runs.',
        confirmLabel: 'Deactivate',
        danger: true
      }).done(function () {
        employee.deactivate()
          .done(function () { window.App.flash.success(employee.fullName() + ' has been deactivated.'); })
          .fail(function (xhr) { window.App.flash.error(errors.fromXhr(xhr).message); });
      });
    },

    activate: function () {
      var employee = this.model;
      employee.activate()
        .done(function () { window.App.flash.success(employee.fullName() + ' is active again.'); })
        .fail(function (xhr) { window.App.flash.error(errors.fromXhr(xhr).message); });
    }
  });

  return EmployeeDetailView;
});
