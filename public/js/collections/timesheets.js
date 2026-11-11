define(['backbone', 'models/timesheet'], function (Backbone, Timesheet) {
  'use strict';

  var Timesheets = Backbone.Collection.extend({
    model: Timesheet,
    url: '/api/timesheets'
  });

  window.App = window.App || {};
  window.App.Collections = window.App.Collections || {};
  window.App.Collections.Timesheets = Timesheets;

  return Timesheets;
});
