/*
 * App.confirm({ title, message, confirmLabel, danger }) -> promise
 * Resolved when the user confirms, rejected when the dialog is dismissed.
 */
define(['jquery', 'underscore', 'views/common/modal'], function ($, _, ModalView) {
  'use strict';

  var ConfirmView = ModalView.extend({
    bodyTemplate: _.template('<p class="confirm-message"><%- message %></p>'),

    initialize: function (options) {
      this.options = options;
      this.deferred = $.Deferred();
      this.title = options.title || 'Please confirm';
      this.submitLabel = options.confirmLabel || 'OK';
      this.submitClass = options.danger ? 'btn-danger' : 'btn-primary';
      this.listenTo(this, 'closed', function () {});
    },

    templateData: function () {
      return { message: this.options.message };
    },

    open: function () {
      var self = this;
      ModalView.prototype.open.apply(this, arguments);
      this.$el.on('hidden.bs.modal', function () {
        if (self.deferred.state() === 'pending') { self.deferred.reject(); }
      });
      return this;
    },

    onSubmit: function () {
      this.deferred.resolve();
      this.close();
    }
  });

  return function confirm(options) {
    var view = new ConfirmView(options || {});
    view.open();
    return view.deferred.promise();
  };
});
