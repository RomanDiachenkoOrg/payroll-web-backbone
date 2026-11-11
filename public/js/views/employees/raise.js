define([
  'jquery',
  'underscore',
  'views/common/modal',
  'utils/forms',
  'utils/errors',
  'utils/validators',
  'text!templates/employees/raise.html'
], function ($, _, ModalView, forms, errors, validators, raiseTpl) {
  'use strict';

  var RaiseView = ModalView.extend({
    bodyTemplate: _.template(raiseTpl),
    submitLabel: 'Save raise',

    initialize: function (options) {
      this.employee = options.employee;
      this.history = options.history;
      this.title = 'Salary change for ' + this.employee.fullName();
    },

    templateData: function () {
      var hourly = this.employee.isHourly();
      return {
        hourly: hourly,
        current: hourly ? this.employee.get('hourlyRate') : this.employee.get('annualSalary'),
        today: validators.todayString()
      };
    },

    onSubmit: function () {
      var $form = this.$('form');
      var data = forms.serialize($form);
      var model = new this.history.model({
        effectiveDate: data.effectiveDate,
        amount: data.amount,
        reason: $.trim(data.reason)
      });
      var errs = model.validate(model.attributes);
      if (errs) {
        forms.showErrors($form, errs);
        return;
      }
      var self = this;
      this.setBusy(true);
      $.ajax({
        url: _.result(this.history, 'url'),
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(model.toJSON())
      }).done(function (row) {
        var change = self.employee.isHourly() ? { hourlyRate: row.amount } : { annualSalary: row.amount };
        self.history.add(row);
        self.employee.set(change);
        window.App.flash.success('Salary change saved.');
        self.close();
      }).fail(function (xhr) {
        var err = errors.fromXhr(xhr);
        forms.showErrors($form, err.fields);
        self.showError(err.message);
        self.setBusy(false);
      });
    }
  });

  return RaiseView;
});
