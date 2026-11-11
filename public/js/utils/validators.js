define([], function () {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function todayString() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  var validators = {

    todayString: todayString,

    isBlank: function (value) {
      return value === undefined || value === null || String(value).replace(/^\s+|\s+$/g, '') === '';
    },

    isEmail: function (value) {
      return EMAIL_RE.test(String(value || ''));
    },

    isPositiveNumber: function (value) {
      if (validators.isBlank(value)) { return false; }
      var n = Number(value);
      return !isNaN(n) && isFinite(n) && n > 0;
    },

    isDate: function (value) {
      var m = DATE_RE.exec(value || '');
      if (!m) { return false; }
      var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
    },

    // dates are compared as ISO strings (YYYY-MM-DD sorts naturally)
    isNotInFuture: function (value, today) {
      today = today || todayString();
      return String(value).substring(0, 7) <= today.substring(0, 7);
    },

    isMonday: function (value) {
      if (!validators.isDate(value)) { return false; }
      var m = DATE_RE.exec(value);
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay() === 1;
    },

    isValidHours: function (value) {
      if (validators.isBlank(value)) { return false; }
      var n = Number(value);
      return !isNaN(n) && n >= 0 && n <= 24;
    }
  };

  return validators;
});
