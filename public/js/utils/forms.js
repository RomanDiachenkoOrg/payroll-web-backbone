/*
 * jQuery helpers for Bootstrap 3 forms.
 */
define(['jquery', 'underscore'], function ($, _) {
  'use strict';

  var forms = {

    // name/value pairs -> plain object (checkboxes become booleans)
    serialize: function ($form) {
      var data = {};
      _.each($form.serializeArray(), function (pair) {
        data[pair.name] = pair.value;
      });
      $form.find('input[type=checkbox][name]').each(function () {
        data[this.name] = this.checked;
      });
      return data;
    },

    clearErrors: function ($form) {
      $form.find('.has-error').removeClass('has-error');
      $form.find('.help-block.error').remove();
      $form.find('[aria-invalid]').removeAttr('aria-invalid');
    },

    // errors: { fieldName: 'message' }
    showErrors: function ($form, errors) {
      forms.clearErrors($form);
      var first = null;
      _.each(errors, function (message, name) {
        var $input = $form.find('[name="' + name + '"]');
        if (!$input.length) { return; }
        var $group = $input.closest('.form-group, td');
        $group.addClass('has-error');
        $input.attr('aria-invalid', 'true');
        var $help = $('<span class="help-block error"></span>').text(message);
        if ($input.parent().hasClass('input-group')) {
          $input.parent().after($help);
        } else {
          $input.after($help);
        }
        if (!first) { first = $input; }
      });
      if (first) { first.focus(); }
    }
  };

  return forms;
});
