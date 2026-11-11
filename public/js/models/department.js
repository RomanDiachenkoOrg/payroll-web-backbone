define(['underscore', 'backbone', 'utils/validators'], function (_, Backbone, validators) {
  'use strict';

  var Department = Backbone.Model.extend({
    urlRoot: '/api/departments',

    defaults: {
      name: '',
      code: '',
      costCenter: '',
      managerEmployeeId: null,
      employeeCount: 0,
      activeEmployeeCount: 0
    },

    validate: function (attrs) {
      var errors = {};
      if (validators.isBlank(attrs.name)) { errors.name = 'Name is required.'; }
      if (validators.isBlank(attrs.code)) {
        errors.code = 'Code is required.';
      } else if (!/^[A-Za-z0-9]{2,6}$/.test(attrs.code)) {
        errors.code = 'Use 2-6 letters or digits.';
      }
      return _.isEmpty(errors) ? undefined : errors;
    }
  });

  window.App = window.App || {};
  window.App.Models = window.App.Models || {};
  window.App.Models.Department = Department;

  return Department;
});
