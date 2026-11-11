define([
  'jquery',
  'underscore',
  'views/common/modal',
  'models/payrun',
  'utils/forms',
  'utils/errors',
  'utils/format',
  'text!templates/payruns/new.html'
], function ($, _, ModalView, PayRun, forms, errors, format, newTpl) {
  'use strict';

  // proposes the month after the latest existing run
  function suggestPeriod(runs, payDay) {
    var latest = runs.first();
    var d = new Date();
    var year = d.getFullYear(), month = d.getMonth();
    if (latest) {
      var parts = latest.get('periodEnd').split('-');
      year = Number(parts[0]);
      month = Number(parts[1]); // 0-based next month
    }
    var start = new Date(year, month, 1);
    var end = new Date(year, month + 1, 0);
    var pay = new Date(year, month, Math.min(payDay || 28, end.getDate()));
    return {
      periodStart: format.isoDate(start),
      periodEnd: format.isoDate(end),
      payDate: format.isoDate(pay)
    };
  }

  var NewPayRunView = ModalView.extend({
    title: 'New pay run',
    submitLabel: 'Create pay run',
    bodyTemplate: _.template(newTpl),

    initialize: function (options) {
      this.collection = options.collection;
      this.suggestion = suggestPeriod(this.collection, options.payDay);
    },

    templateData: function () {
      return _.extend({ suggestedName: format.month(this.suggestion.periodStart) }, this.suggestion);
    },

    onSubmit: function () {
      var $form = this.$('form');
      var data = forms.serialize($form);
      var run = new PayRun({
        name: $.trim(data.name),
        periodStart: $.trim(data.periodStart),
        periodEnd: $.trim(data.periodEnd),
        payDate: $.trim(data.payDate)
      });
      var errs = run.validate(run.attributes);
      if (errs) {
        forms.showErrors($form, errs);
        return;
      }
      var self = this;
      this.setBusy(true);
      run.save(null, { validate: false })
        .done(function () {
          self.collection.add(run);
          window.App.flash.success('Pay run ' + run.get('name') + ' created.');
          self.close();
          window.App.navigate('payruns/' + run.id);
        })
        .fail(function (xhr) {
          var err = errors.fromXhr(xhr);
          forms.showErrors($form, err.fields);
          self.showError(err.message);
          self.setBusy(false);
        });
    }
  });

  NewPayRunView.suggestPeriod = suggestPeriod;

  return NewPayRunView;
});
