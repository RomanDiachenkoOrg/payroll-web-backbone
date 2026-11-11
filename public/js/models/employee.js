define([
  'underscore',
  'backbone',
  'utils/validators',
  'utils/model-action'
], function (_, Backbone, validators, modelAction) {
  'use strict';

  var Employee = Backbone.Model.extend({
    urlRoot: '/api/employees',

    defaults: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      title: '',
      departmentId: null,
      payType: 'salaried',
      annualSalary: null,
      hourlyRate: null,
      hireDate: '',
      active: true,
      pensionOptIn: false,
      deductions: []
    },

    fullName: function () {
      return this.get('firstName') + ' ' + this.get('lastName');
    },

    isHourly: function () {
      return this.get('payType') === 'hourly';
    },

    // monthly equivalent used for sorting the list by pay
    payAmount: function () {
      return this.isHourly() ? Number(this.get('hourlyRate')) * 173.33 : Number(this.get('annualSalary')) / 12;
    },

    validate: function (attrs) {
      var errors = {};
      _.each(['firstName', 'lastName', 'email', 'hireDate'], function (f) {
        if (validators.isBlank(attrs[f])) { errors[f] = 'This field is required.'; }
      });
      if (!errors.email && !validators.isEmail(attrs.email)) {
        errors.email = 'Enter a valid email address.';
      }
      if (!attrs.departmentId) {
        errors.departmentId = 'Select a department.';
      }
      if (!errors.hireDate) {
        if (!validators.isDate(attrs.hireDate)) {
          errors.hireDate = 'Enter a valid date (YYYY-MM-DD).';
        } else if (!validators.isNotInFuture(attrs.hireDate)) {
          errors.hireDate = 'Hire date cannot be in the future.';
        }
      }
      if (attrs.payType === 'hourly') {
        if (!validators.isPositiveNumber(attrs.hourlyRate)) {
          errors.hourlyRate = 'Hourly rate must be greater than 0.';
        }
      } else if (!validators.isPositiveNumber(attrs.annualSalary)) {
        errors.annualSalary = 'Salary must be greater than 0.';
      }
      _.each(attrs.deductions || [], function (d, i) {
        if (!validators.isPositiveNumber(d.amount)) {
          errors['deduction' + i] = 'Amount must be greater than 0.';
        }
      });
      return _.isEmpty(errors) ? undefined : errors;
    },

    deactivate: function () {
      return modelAction(this, 'deactivate');
    },

    activate: function () {
      return modelAction(this, 'activate');
    }
  });

  window.App = window.App || {};
  window.App.Models = window.App.Models || {};
  window.App.Models.Employee = Employee;

  return Employee;
});
