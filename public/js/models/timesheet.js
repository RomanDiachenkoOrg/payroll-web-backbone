define([
  'underscore',
  'backbone',
  'utils/validators',
  'utils/model-action'
], function (_, Backbone, validators, modelAction) {
  'use strict';

  var REGULAR_HOURS = 40;

  var Timesheet = Backbone.Model.extend({
    urlRoot: '/api/timesheets',

    defaults: function () {
      return {
        employeeId: null,
        weekStart: '',
        hours: [0, 0, 0, 0, 0, 0, 0],
        notes: '',
        status: 'Draft'
      };
    },

    total: function () {
      return _.reduce(this.get('hours'), function (sum, h) { return sum + (Number(h) || 0); }, 0);
    },

    overtime: function () {
      var t = this.total();
      return t > REGULAR_HOURS ? t - REGULAR_HOURS : 0;
    },

    isEditable: function () {
      return this.isNew() || this.get('status') === 'Draft' || this.get('status') === 'Rejected';
    },

    validate: function (attrs) {
      var errors = {};
      if (!validators.isDate(attrs.weekStart)) {
        errors.weekStart = 'Enter a valid date (YYYY-MM-DD).';
      } else if (!validators.isMonday(attrs.weekStart)) {
        errors.weekStart = 'The week must start on a Monday.';
      }
      _.each(attrs.hours, function (h, i) {
        if (!validators.isValidHours(h)) {
          errors['hours' + i] = '0-24';
        }
      });
      return _.isEmpty(errors) ? undefined : errors;
    },

    submit: function () {
      return modelAction(this, 'submit');
    },

    approve: function () {
      return modelAction(this, 'approve');
    },

    reject: function (reason) {
      return modelAction(this, 'reject', { reason: reason });
    }
  });

  Timesheet.DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  Timesheet.STATUSES = ['Draft', 'Submitted', 'Approved', 'Rejected'];

  window.App = window.App || {};
  window.App.Models = window.App.Models || {};
  window.App.Models.Timesheet = Timesheet;

  return Timesheet;
});
