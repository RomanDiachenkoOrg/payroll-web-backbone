define([
  'jquery',
  'underscore',
  'backbone',
  'utils/validators',
  'utils/forms',
  'utils/errors',
  'text!templates/login.html'
], function ($, _, Backbone, validators, forms, errors, loginTpl) {
  'use strict';

  var LoginView = Backbone.View.extend({
    className: 'login-box',
    template: _.template(loginTpl),

    events: {
      'submit #login-form': 'submit',
      'click .demo-accounts a': 'fillDemo'
    },

    render: function () {
      this.$el.html(this.template({}));
      var self = this;
      setTimeout(function () { self.$('#login-email').focus(); }, 0);
      return this;
    },

    fillDemo: function (e) {
      e.preventDefault();
      this.$('#login-email').val($(e.currentTarget).data('email'));
      this.$('#login-password').val('').focus();
    },

    submit: function (e) {
      e.preventDefault();
      var $form = this.$('#login-form');
      var data = forms.serialize($form);
      var errs = {};

      this.$('.login-error').addClass('hidden');
      if (validators.isBlank(data.email)) {
        errs.email = 'Email is required.';
      } else if (!validators.isEmail(data.email)) {
        errs.email = 'Enter a valid email address.';
      }
      if (validators.isBlank(data.password)) {
        errs.password = 'Password is required.';
      }
      if (!_.isEmpty(errs)) {
        forms.showErrors($form, errs);
        return;
      }
      forms.clearErrors($form);

      var self = this;
      var $btn = this.$('button[type=submit]').prop('disabled', true).text('Signing in...');
      this.model.login($.trim(data.email), data.password)
        .done(function () {
          var router = window.App.router;
          var target = router.returnTo && router.returnTo !== 'login' ? router.returnTo : '';
          router.returnTo = null;
          router.navigate(target, { trigger: true });
        })
        .fail(function (xhr) {
          self.$('.login-error').text(errors.fromXhr(xhr).message).removeClass('hidden');
          self.$('#login-password').val('').focus();
        })
        .always(function () {
          $btn.prop('disabled', false).text('Sign in');
        });
    }
  });

  return LoginView;
});
