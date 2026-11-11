'use strict';

var auth = require('../auth');
var audit = require('../audit');
var util = require('../util');
var canView = require('./employees').canView;

var EDITABLE = ['Draft', 'Rejected'];

function isMonday(dateStr) {
  var parts = dateStr.split('-');
  var d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  return d.getUTCDay() === 1;
}

function validate(store, body, employeeId, id) {
  var errors = {};
  if (!util.DATE_RE.test(body.weekStart || '')) {
    errors.weekStart = 'Use the format YYYY-MM-DD.';
  } else if (!isMonday(body.weekStart)) {
    errors.weekStart = 'A timesheet week must start on a Monday.';
  } else if (store.where('timesheets', function (t) {
    return t.employeeId === employeeId && t.weekStart === body.weekStart && t.id !== id;
  }).length) {
    errors.weekStart = 'There is already a timesheet for this week.';
  }
  var hours = body.hours;
  if (!Array.isArray(hours) || hours.length !== 7) {
    errors.hours = 'Enter hours for all 7 days.';
  } else {
    hours.forEach(function (h, i) {
      var n = Number(h);
      if (h === '' || h === null || isNaN(n) || n < 0 || n > 24) {
        errors['hours' + i] = 'Hours must be between 0 and 24.';
      }
    });
  }
  return errors;
}

module.exports = function (api, store) {

  function decorate(ts) {
    var emp = store.find('employees', ts.employeeId);
    ts.employeeName = emp ? emp.firstName + ' ' + emp.lastName : 'Unknown';
    ts.departmentId = emp ? emp.departmentId : null;
    ts.totalHours = (ts.hours || []).reduce(function (a, b) { return a + Number(b); }, 0);
    return ts;
  }

  function load(req, res) {
    var ts = store.find('timesheets', req.params.id);
    var emp = ts && store.find('employees', ts.employeeId);
    if (!ts || !emp || !canView(req.user, emp)) {
      util.notFound(res, 'Timesheet');
      return null;
    }
    return decorate(ts);
  }

  function canEdit(user, ts) {
    return user.role === 'admin' || ts.employeeId === user.employeeId;
  }

  function canDecide(user, ts) {
    if (user.role === 'admin') { return true; }
    return user.role === 'manager' && ts.departmentId === user.departmentId && ts.employeeId !== user.employeeId;
  }

  api.get('/timesheets', auth.requireLogin, function (req, res) {
    var status = req.query.status;
    var rows = store.all('timesheets').map(decorate).filter(function (ts) {
      var emp = store.find('employees', ts.employeeId);
      return emp && canView(req.user, emp) && (!status || ts.status === status);
    });
    rows.sort(function (a, b) { return a.weekStart < b.weekStart ? 1 : (a.weekStart > b.weekStart ? -1 : 0); });
    res.json(rows);
  });

  api.get('/timesheets/:id', auth.requireLogin, function (req, res) {
    var ts = load(req, res);
    if (ts) { res.json(ts); }
  });

  api.post('/timesheets', auth.requireLogin, function (req, res) {
    var employeeId = req.user.role === 'admin' && req.body.employeeId ? Number(req.body.employeeId) : req.user.employeeId;
    var emp = employeeId && store.find('employees', employeeId);
    if (!emp) {
      return util.badRequest(res, 'Select an employee.', { employeeId: 'Select an employee.' });
    }
    if (!emp.active) {
      return util.badRequest(res, 'Timesheets cannot be created for inactive employees.');
    }
    var errors = validate(store, req.body, employeeId, null);
    if (Object.keys(errors).length) {
      return util.badRequest(res, 'Please correct the highlighted fields.', errors);
    }
    var ts = store.insert('timesheets', {
      employeeId: employeeId,
      weekStart: req.body.weekStart,
      hours: req.body.hours.map(Number),
      notes: req.body.notes || '',
      status: 'Draft',
      createdAt: new Date().toISOString()
    });
    audit.log(store, req.user, 'create', 'Timesheet', ts.id, emp.firstName + ' ' + emp.lastName + ', week of ' + ts.weekStart);
    res.status(201).json(decorate(ts));
  });

  api.put('/timesheets/:id', auth.requireLogin, function (req, res) {
    var ts = load(req, res);
    if (!ts) { return; }
    if (!canEdit(req.user, ts)) {
      return res.status(403).json({ error: 'You can only edit your own timesheets.' });
    }
    if (EDITABLE.indexOf(ts.status) < 0) {
      return res.status(409).json({ error: 'Only draft or rejected timesheets can be edited.' });
    }
    var errors = validate(store, req.body, ts.employeeId, ts.id);
    if (Object.keys(errors).length) {
      return util.badRequest(res, 'Please correct the highlighted fields.', errors);
    }
    var updated = store.update('timesheets', ts.id, {
      weekStart: req.body.weekStart,
      hours: req.body.hours.map(Number),
      notes: req.body.notes || '',
      status: 'Draft'
    });
    audit.log(store, req.user, 'update', 'Timesheet', ts.id, 'Week of ' + updated.weekStart);
    res.json(decorate(updated));
  });

  api.delete('/timesheets/:id', auth.requireLogin, function (req, res) {
    var ts = load(req, res);
    if (!ts) { return; }
    if (!canEdit(req.user, ts) || ts.status !== 'Draft') {
      return res.status(409).json({ error: 'Only your own draft timesheets can be deleted.' });
    }
    store.remove('timesheets', ts.id);
    audit.log(store, req.user, 'delete', 'Timesheet', ts.id, 'Week of ' + ts.weekStart);
    res.status(204).end();
  });

  api.post('/timesheets/:id/submit', auth.requireLogin, function (req, res) {
    var ts = load(req, res);
    if (!ts) { return; }
    if (!canEdit(req.user, ts) || EDITABLE.indexOf(ts.status) < 0) {
      return res.status(409).json({ error: 'This timesheet cannot be submitted.' });
    }
    var updated = store.update('timesheets', ts.id, {
      status: 'Submitted', submittedAt: new Date().toISOString(), rejectReason: null
    });
    audit.log(store, req.user, 'submit', 'Timesheet', ts.id, 'Week of ' + ts.weekStart);
    res.json(decorate(updated));
  });

  api.post('/timesheets/:id/approve', auth.requireRole('admin', 'manager'), function (req, res) {
    var ts = load(req, res);
    if (!ts) { return; }
    if (!canDecide(req.user, ts)) {
      return res.status(403).json({ error: 'You can only approve timesheets of your own department.' });
    }
    if (ts.status !== 'Submitted') {
      return res.status(409).json({ error: 'Only submitted timesheets can be approved.' });
    }
    var updated = store.update('timesheets', ts.id, {
      status: 'Approved', decidedBy: req.user.email, decidedAt: new Date().toISOString()
    });
    audit.log(store, req.user, 'approve', 'Timesheet', ts.id, ts.employeeName + ', week of ' + ts.weekStart);
    res.json(decorate(updated));
  });

  api.post('/timesheets/:id/reject', auth.requireRole('admin', 'manager'), function (req, res) {
    var ts = load(req, res);
    if (!ts) { return; }
    if (!canDecide(req.user, ts)) {
      return res.status(403).json({ error: 'You can only reject timesheets of your own department.' });
    }
    if (ts.status !== 'Submitted') {
      return res.status(409).json({ error: 'Only submitted timesheets can be rejected.' });
    }
    var reason = String(req.body.reason || '').trim();
    if (!reason) {
      return util.badRequest(res, 'A reason is required when rejecting a timesheet.', { reason: 'Please give a reason.' });
    }
    var updated = store.update('timesheets', ts.id, {
      status: 'Rejected', rejectReason: reason, decidedBy: req.user.email, decidedAt: new Date().toISOString()
    });
    audit.log(store, req.user, 'reject', 'Timesheet', ts.id, ts.employeeName + ': ' + reason);
    res.json(decorate(updated));
  });
};
