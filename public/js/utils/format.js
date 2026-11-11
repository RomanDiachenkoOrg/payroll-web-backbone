define([], function () {
  'use strict';

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function addThousands(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  var format = {

    number: function (value, decimals) {
      if (value === null || value === undefined || value === '' || isNaN(value)) {
        return '';
      }
      decimals = decimals === undefined ? 2 : decimals;
      var negative = value < 0;
      var parts = Math.abs(Number(value)).toFixed(decimals).split('.');
      var out = addThousands(parts[0]) + (parts[1] ? '.' + parts[1] : '');
      return negative ? '-' + out : out;
    },

    money: function (value) {
      if (value === null || value === undefined || value === '' || isNaN(value)) {
        return '';
      }
      var s = format.number(Math.abs(value), 2);
      return (value < 0 ? '-$' : '$') + s;
    },

    percent: function (rate, decimals) {
      if (rate === null || rate === undefined || isNaN(rate)) {
        return '';
      }
      var n = Number(rate) * 100;
      // avoid "15.000000000000002%"
      n = Math.round(n * 1000) / 1000;
      return (decimals ? n.toFixed(decimals) : String(n)) + '%';
    },

    hours: function (value) {
      var n = Number(value) || 0;
      return n % 1 === 0 ? String(n) : n.toFixed(2);
    },

    // 'YYYY-MM-DD' -> 'Nov 3, 2026'
    date: function (value) {
      if (!value) { return ''; }
      var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
      if (!m) { return value; }
      return MONTHS[Number(m[2]) - 1] + ' ' + Number(m[3]) + ', ' + m[1];
    },

    dateTime: function (iso) {
      if (!iso) { return ''; }
      var d = new Date(iso);
      if (isNaN(d.getTime())) { return iso; }
      return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' ' +
        pad(d.getHours()) + ':' + pad(d.getMinutes());
    },

    // 'YYYY-MM' -> 'November 2026'
    month: function (value) {
      var full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'];
      var m = /^(\d{4})-(\d{2})/.exec(value || '');
      return m ? full[Number(m[2]) - 1] + ' ' + m[1] : '';
    },

    isoDate: function (d) {
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },

    statusClass: function (status) {
      return {
        Draft: 'default',
        Submitted: 'info',
        Approved: 'success',
        Rejected: 'danger',
        Calculated: 'warning',
        Paid: 'primary'
      }[status] || 'default';
    },

    roleName: function (role) {
      return { admin: 'Administrator', manager: 'Manager', employee: 'Employee' }[role] || role;
    }
  };

  return format;
});
