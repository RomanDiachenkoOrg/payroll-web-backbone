'use strict';

var auth = require('../auth');
var audit = require('../audit');
var util = require('../util');

function validateSettings(body) {
  var errors = {};
  var brackets = body.taxBrackets;
  if (!Array.isArray(brackets) || !brackets.length) {
    errors.taxBrackets = 'At least one tax bracket is required.';
  } else {
    var prevTo = 0;
    brackets.forEach(function (b, i) {
      var rate = Number(b.rate);
      if (isNaN(rate) || rate < 0 || rate > 1) {
        errors['rate' + i] = 'Rate must be between 0 and 100%.';
      }
      if (Number(b.from) !== prevTo) {
        errors['from' + i] = 'Brackets must be contiguous (expected ' + prevTo + ').';
      }
      var isLast = i === brackets.length - 1;
      if (isLast && b.to !== null && b.to !== '') {
        errors['to' + i] = 'The last bracket must be open-ended.';
      } else if (!isLast && !(Number(b.to) > Number(b.from))) {
        errors['to' + i] = 'Upper bound must be greater than lower bound.';
      }
      prevTo = Number(b.to);
    });
  }
  ['socialRate', 'pensionRate'].forEach(function (f) {
    var n = Number(body[f]);
    if (body[f] === '' || isNaN(n) || n < 0 || n > 1) {
      errors[f] = 'Rate must be between 0 and 100%.';
    }
  });
  var payDay = Number(body.payDay);
  if (!(payDay >= 1 && payDay <= 28)) {
    errors.payDay = 'Pay day must be between 1 and 28.';
  }
  return errors;
}

module.exports = function (api, store) {

  api.get('/settings', auth.requireLogin, function (req, res) {
    res.json(store.getObject('settings'));
  });

  api.put('/settings', auth.requireRole('admin'), function (req, res) {
    var errors = validateSettings(req.body);
    if (Object.keys(errors).length) {
      return util.badRequest(res, 'Please correct the highlighted fields.', errors);
    }
    var current = store.getObject('settings');
    var next = {
      currency: current.currency || 'USD',
      socialRate: Number(req.body.socialRate),
      pensionRate: Number(req.body.pensionRate),
      payDay: Number(req.body.payDay),
      taxBrackets: req.body.taxBrackets.map(function (b, i, all) {
        return {
          from: Number(b.from),
          to: i === all.length - 1 ? null : Number(b.to),
          rate: Number(b.rate)
        };
      })
    };
    store.setObject('settings', next);
    audit.log(store, req.user, 'update', 'Settings', null, 'Tax and contribution rates updated');
    res.json(next);
  });

  api.get('/deduction-types', auth.requireLogin, function (req, res) {
    res.json(store.all('deductionTypes'));
  });

  api.get('/users', auth.requireRole('admin'), function (req, res) {
    res.json(store.all('users').map(auth.publicUser));
  });

  api.get('/audit', auth.requireRole('admin'), function (req, res) {
    var q = req.query;
    var rows = store.all('auditLog').filter(function (e) {
      if (q.entity && e.entity !== q.entity) { return false; }
      if (q.action && e.action !== q.action) { return false; }
      if (q.user && e.userEmail.indexOf(String(q.user).toLowerCase()) < 0) { return false; }
      if (q.from && e.at.substr(0, 10) < q.from) { return false; }
      if (q.to && e.at.substr(0, 10) > q.to) { return false; }
      return true;
    });
    rows.reverse();
    res.json(rows.slice(0, Number(q.limit) || 200));
  });
};

module.exports.validateSettings = validateSettings;
