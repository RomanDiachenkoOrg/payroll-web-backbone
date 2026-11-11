define([
  'jquery',
  'underscore',
  'backbone',
  'collections/timesheets',
  'models/timesheet',
  'views/timesheets/reject',
  'utils/format',
  'utils/errors',
  'text!templates/timesheets/list.html'
], function ($, _, Backbone, Timesheets, Timesheet, RejectView, format, errors, listTpl) {
  'use strict';

  var TimesheetListView = Backbone.View.extend({
    template: _.template(listTpl),

    events: {
      'change #timesheet-status': 'changeStatus',
      'click .js-submit': 'submitTimesheet',
      'click .js-approve': 'approve',
      'click .js-reject': 'reject'
    },

    initialize: function () {
      var session = window.App.session;
      this.collection = new Timesheets();
      // reviewers land on the queue of submitted timesheets
      this.status = TimesheetListView.lastStatus !== undefined ? TimesheetListView.lastStatus
        : (session.can('timesheets:decide') ? 'Submitted' : '');
      this.loaded = false;
      this.listenTo(this.collection, 'change:status', this.render);
      this.fetch();
    },

    fetch: function () {
      var self = this;
      this.loaded = false;
      this.collection.fetch({ reset: true, data: this.status ? { status: this.status } : {} })
        .done(function () {
          self.loaded = true;
          self.render();
        });
    },

    canDecide: function (ts) {
      var session = window.App.session;
      if (session.get('role') === 'admin') { return true; }
      return session.get('role') === 'manager' &&
        ts.get('departmentId') === session.get('departmentId') &&
        ts.get('employeeId') !== session.get('employeeId');
    },

    canEdit: function (ts) {
      var session = window.App.session;
      return ts.isEditable() &&
        (session.get('role') === 'admin' || ts.get('employeeId') === session.get('employeeId'));
    },

    render: function () {
      var session = window.App.session;
      this.$el.html(this.template({
        loaded: this.loaded,
        status: this.status,
        statuses: Timesheet.STATUSES,
        timesheets: this.collection.models,
        showEmployee: session.get('role') !== 'employee',
        canCreate: !!session.get('employeeId') || session.can('timesheets:any-employee'),
        canDecide: _.bind(this.canDecide, this),
        canEdit: _.bind(this.canEdit, this),
        fmt: format
      }));
      return this;
    },

    changeStatus: function () {
      this.status = this.$('#timesheet-status').val();
      TimesheetListView.lastStatus = this.status;
      this.fetch();
    },

    find: function (e) {
      return this.collection.get($(e.currentTarget).closest('tr').data('id'));
    },

    submitTimesheet: function (e) {
      var ts = this.find(e);
      ts.submit()
        .done(function () { window.App.flash.success('Timesheet for the week of ' + format.date(ts.get('weekStart')) + ' submitted for approval.'); })
        .fail(function (xhr) { window.App.flash.error(errors.fromXhr(xhr).message); });
    },

    approve: function (e) {
      var ts = this.find(e);
      ts.approve()
        .done(function () { window.App.flash.success('Approved timesheet of ' + ts.get('employeeName') + '.'); })
        .fail(function (xhr) { window.App.flash.error(errors.fromXhr(xhr).message); });
    },

    reject: function (e) {
      new RejectView({ model: this.find(e) }).open();
    }
  });

  return TimesheetListView;
});
