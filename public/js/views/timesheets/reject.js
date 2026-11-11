define([
  'jquery',
  'underscore',
  'views/common/modal',
  'utils/forms',
  'utils/errors',
  'utils/format'
], function ($, _, ModalView, forms, errors, format) {
  'use strict';

  var RejectView = ModalView.extend({
    submitLabel: 'Reject timesheet',
    submitClass: 'btn-danger',

    bodyTemplate: _.template(
      '<p>Rejecting the timesheet of <strong><%- name %></strong> for the week of <%- week %>.</p>' +
      '<div class="form-group">' +
      '  <label for="reject-reason">Reason</label>' +
      '  <textarea class="form-control" id="reject-reason" name="reason" rows="3" maxlength="500"></textarea>' +
      '</div>'
    ),

    title: 'Reject timesheet',

    templateData: function () {
      return { name: this.model.get('employeeName'), week: format.date(this.model.get('weekStart')) };
    },

    onSubmit: function () {
      var $form = this.$('form');
      var reason = $.trim(this.$('#reject-reason').val());
      if (!reason) {
        forms.showErrors($form, { reason: 'Please give a reason so the employee can correct the timesheet.' });
        return;
      }
      var self = this;
      this.setBusy(true);
      this.model.reject(reason)
        .done(function () {
          window.App.flash.success('Timesheet rejected.');
          self.close();
        })
        .fail(function (xhr) {
          self.showError(errors.fromXhr(xhr).message);
          self.setBusy(false);
        });
    }
  });

  return RejectView;
});
