define(['jquery', 'underscore'], function ($, _) {
  'use strict';

  var timer = null;
  var shownAt = 0;

  var flash = {
    show: function (type, message, sticky) {
      var $el = $('#flash');
      clearTimeout(timer);
      shownAt = new Date().getTime();
      $el.html(
        '<div class="alert alert-' + type + ' alert-dismissible" role="alert">' +
        '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
        _.escape(message) +
        '</div>'
      );
      if (!sticky) {
        timer = setTimeout(function () {
          $el.find('.alert').fadeOut(400, function () { $(this).remove(); });
        }, 5000);
      }
    },

    success: function (message) { flash.show('success', message); },
    error: function (message) { flash.show('danger', message, true); },
    info: function (message) { flash.show('info', message); },

    clear: function () {
      clearTimeout(timer);
      $('#flash').empty();
    },

    // called on page change: keep messages that were set right before navigating
    clearStale: function () {
      if (new Date().getTime() - shownAt > 300) {
        flash.clear();
      }
    }
  };

  return flash;
});
