define([
  'jquery',
  'underscore',
  'backbone',
  'views/login',
  'views/dashboard',
  'views/employees/list',
  'views/employees/form',
  'views/employees/detail',
  'views/timesheets/list',
  'views/timesheets/form',
  'views/payruns/list',
  'views/payruns/detail',
  'views/payslips/show',
  'views/departments/list',
  'views/reports/cost',
  'views/settings/index',
  'views/common/not-found'
], function ($, _, Backbone, LoginView, DashboardView, EmployeeListView, EmployeeFormView,
             EmployeeDetailView, TimesheetListView, TimesheetFormView, PayRunListView,
             PayRunDetailView, PayslipView, DepartmentListView, CostReportView, SettingsView,
             NotFoundView) {
  'use strict';

  var Router = Backbone.Router.extend({

    routes: {
      '': 'dashboard',
      'login': 'login',
      'logout': 'logout',
      'employees': 'employees',
      'employees/new': 'newEmployee',
      'employees/:id': 'employee',
      'employees/:id/edit': 'editEmployee',
      'me': 'myProfile',
      'timesheets': 'timesheets',
      'timesheets/new': 'newTimesheet',
      'timesheets/:id': 'timesheet',
      'payruns': 'payRuns',
      'payruns/:id': 'payRun',
      'payslips/:id': 'payslip',
      'departments': 'departments',
      'reports': 'reports',
      'settings': 'settings',
      'settings/:tab': 'settings',
      '*path': 'notFound'
    },

    initialize: function () {
      this.on('route', function (name) {
        window.App.vent.trigger('route', name, Backbone.history.fragment);
      });
    },

    // returns false (and redirects) when the user may not open the page
    guard: function (permission) {
      var session = window.App.session;
      if (!session.isLoggedIn()) {
        this.returnTo = Backbone.history.fragment;
        this.navigate('login', { trigger: true, replace: true });
        return false;
      }
      if (permission && !session.can(permission)) {
        window.App.flash.show('warning', 'You do not have access to that page.');
        this.navigate('', { trigger: true, replace: true });
        return false;
      }
      return true;
    },

    show: function (view) {
      window.App.flash.clearStale();
      return window.App.showView(view);
    },

    login: function () {
      if (window.App.session.isLoggedIn()) {
        this.navigate('', { trigger: true, replace: true });
        return;
      }
      this.show(new LoginView({ model: window.App.session }));
    },

    logout: function () {
      var self = this;
      window.App.session.logout().always(function () {
        self.returnTo = null;
        self.navigate('login', { trigger: true, replace: true });
        window.App.flash.info('You have been signed out.');
      });
    },

    dashboard: function () {
      if (!this.guard()) { return; }
      this.show(new DashboardView());
    },

    employees: function () {
      if (!this.guard('employees:list')) { return; }
      this.show(new EmployeeListView());
    },

    newEmployee: function () {
      if (!this.guard('employees:edit')) { return; }
      this.show(new EmployeeFormView({ employeeId: null }));
    },

    editEmployee: function (id) {
      if (!this.guard('employees:edit')) { return; }
      this.show(new EmployeeFormView({ employeeId: id }));
    },

    employee: function (id) {
      if (!this.guard()) { return; }
      this.show(new EmployeeDetailView({ employeeId: id }));
    },

    myProfile: function () {
      if (!this.guard()) { return; }
      var id = window.App.session.get('employeeId');
      if (!id) {
        window.App.flash.show('warning', 'Your user account is not linked to an employee record.');
        this.navigate('', { trigger: true, replace: true });
        return;
      }
      this.show(new EmployeeDetailView({ employeeId: id }));
    },

    timesheets: function () {
      if (!this.guard()) { return; }
      this.show(new TimesheetListView());
    },

    newTimesheet: function () {
      if (!this.guard()) { return; }
      this.show(new TimesheetFormView({ timesheetId: null }));
    },

    timesheet: function (id) {
      if (!this.guard()) { return; }
      this.show(new TimesheetFormView({ timesheetId: id }));
    },

    payRuns: function () {
      if (!this.guard('payruns:view')) { return; }
      this.show(new PayRunListView());
    },

    payRun: function (id) {
      if (!this.guard('payruns:view')) { return; }
      this.show(new PayRunDetailView({ payRunId: id }));
    },

    payslip: function (id) {
      if (!this.guard()) { return; }
      this.show(new PayslipView({ payslipId: id }));
    },

    departments: function () {
      if (!this.guard('departments:view')) { return; }
      this.show(new DepartmentListView());
    },

    reports: function () {
      if (!this.guard('reports:view')) { return; }
      this.show(new CostReportView());
    },

    settings: function (tab) {
      if (!this.guard('settings:view')) { return; }
      this.show(new SettingsView({ tab: tab || 'rates' }));
    },

    notFound: function () {
      if (!this.guard()) { return; }
      this.show(new NotFoundView());
    }
  });

  return Router;
});
