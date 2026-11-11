/*
 * Base view for Bootstrap modal dialogs.
 * Subclasses provide `title`, `bodyTemplate` and `onSubmit()`; call this.close() when done.
 */
define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/common/modal.html'
], function ($, _, Backbone, modalTpl) {
  'use strict';

  var ModalView = Backbone.View.extend({
    className: 'modal fade',
    attributes: { tabindex: '-1', role: 'dialog' },
    frame: _.template(modalTpl),

    title: '',
    submitLabel: 'Save',
    submitClass: 'btn-primary',

    events: {
      'submit form': 'handleSubmit',
      'click .js-submit': 'handleSubmit'
    },

    templateData: function () {
      return {};
    },

    render: function () {
      this.$el.html(this.frame({
        title: _.result(this, 'title'),
        submitLabel: _.result(this, 'submitLabel'),
        submitClass: _.result(this, 'submitClass'),
        body: this.bodyTemplate(this.templateData())
      }));
      this.$el.attr('aria-labelledby', this.cid + '-title');
      this.$('.modal-title').attr('id', this.cid + '-title');
      return this;
    },

    open: function () {
      var self = this;
      $('body').append(this.render().el);
      this.$el.on('hidden.bs.modal', function () { self.remove(); });
      this.$el.on('shown.bs.modal', function () { self.$('input,select,textarea').filter(':visible').first().focus(); });
      this.$el.modal('show');
      return this;
    },

    close: function () {
      this.$el.modal('hide');
    },

    handleSubmit: function (e) {
      e.preventDefault();
      this.onSubmit();
    },

    setBusy: function (busy) {
      this.$('.js-submit').prop('disabled', busy);
    },

    showError: function (message) {
      this.$('.modal-error').text(message).removeClass('hidden');
    },

    onSubmit: function () {
      this.close();
    }
  });

  return ModalView;
});
