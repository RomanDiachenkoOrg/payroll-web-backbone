'use strict';

var auth = require('../auth');
var audit = require('../audit');
var util = require('../util');
var payroll = require('../payroll');

var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function runName(periodStart) {
  var parts = periodStart.split('-');
  return MONTHS[Number(parts[1]) - 1] + ' ' + parts[0];
}

module.exports = function (api, store) {

  function load(req, res) {
    var run = store.find('payRuns', req.params.id);
    if (!run) {
      util.notFound(res, 'Pay run');
      return null;
    }
    return run;
  }

  function transition(run, from, to, res) {
    if (run.status === 'Paid') {
      res.status(409).json({ error: 'This pay run has been paid and is locked.' });
      return false;
    }
    if (from.indexOf(run.status) < 0) {
      res.status(409).json({ error: 'A pay run in status ' + run.status + ' cannot be moved to ' + to + '.' });
      return false;
    }
    return true;
  }

  api.get('/payruns', auth.requireRole('admin', 'manager'), function (req, res) {
    var rows = store.all('payRuns');
    rows.sort(function (a, b) { return a.periodStart < b.periodStart ? 1 : -1; });
    res.json(rows);
  });

  api.get('/payruns/:id', auth.requireRole('admin', 'manager'), function (req, res) {
    var run = load(req, res);
    if (!run) { return; }
    run.payslips = store.where('payslips', function (p) { return p.payRunId === run.id; });
    run.payslips.sort(function (a, b) { return a.employeeName < b.employeeName ? -1 : 1; });
    res.json(run);
  });

  api.post('/payruns', auth.requireRole('admin'), function (req, res) {
    var b = req.body;
    var errors = {};
    ['periodStart', 'periodEnd', 'payDate'].forEach(function (f) {
      if (!util.DATE_RE.test(b[f] || '')) { errors[f] = 'Use the format YYYY-MM-DD.'; }
    });
    if (!errors.periodStart && !errors.periodEnd && b.periodEnd < b.periodStart) {
      errors.periodEnd = 'Period end must be after period start.';
    }
    if (!errors.periodStart && store.where('payRuns', function (r) {
      return !(b.periodEnd < r.periodStart || b.periodStart > r.periodEnd);
    }).length) {
      errors.periodStart = 'This period overlaps an existing pay run.';
    }
    if (Object.keys(errors).length) {
      return util.badRequest(res, 'Please correct the highlighted fields.', errors);
    }
    var run = store.insert('payRuns', {
      name: b.name ? String(b.name).trim() : runName(b.periodStart),
      periodStart: b.periodStart,
      periodEnd: b.periodEnd,
      payDate: b.payDate,
      status: 'Draft',
      createdBy: req.user.email,
      createdAt: new Date().toISOString(),
      totals: payroll.totals([])
    });
    audit.log(store, req.user, 'create', 'PayRun', run.id, run.name);
    res.status(201).json(run);
  });

  api.post('/payruns/:id/calculate', auth.requireRole('admin'), function (req, res) {
    var run = load(req, res);
    if (!run || !transition(run, ['Draft', 'Calculated'], 'Calculated', res)) { return; }
    var settings = store.getObject('settings');
    var types = store.all('deductionTypes');
    var timesheets = store.all('timesheets');

    store.removeWhere('payslips', function (p) { return p.payRunId === run.id; });
    var slips = store.where('employees', function (e) {
      return e.active && e.hireDate <= run.periodEnd;
    }).map(function (emp) {
      var own = timesheets.filter(function (t) { return t.employeeId === emp.id; });
      var slip = payroll.calculatePayslip(emp, own, run, settings, types);
      slip.payRunId = run.id;
      return store.insert('payslips', slip);
    });
    var updated = store.update('payRuns', run.id, {
      status: 'Calculated',
      calculatedAt: new Date().toISOString(),
      totals: payroll.totals(slips)
    });
    audit.log(store, req.user, 'calculate', 'PayRun', run.id, run.name + ': ' + slips.length + ' payslips');
    updated.payslips = slips;
    res.json(updated);
  });

  api.post('/payruns/:id/approve', auth.requireRole('admin'), function (req, res) {
    var run = load(req, res);
    if (!run || !transition(run, ['Calculated'], 'Approved', res)) { return; }
    var updated = store.update('payRuns', run.id, {
      status: 'Approved', approvedBy: req.user.email, approvedAt: new Date().toISOString()
    });
    audit.log(store, req.user, 'approve', 'PayRun', run.id, run.name);
    res.json(updated);
  });

  api.post('/payruns/:id/pay', auth.requireRole('admin'), function (req, res) {
    var run = load(req, res);
    if (!run || !transition(run, ['Approved'], 'Paid', res)) { return; }
    var updated = store.update('payRuns', run.id, {
      status: 'Paid', paidAt: new Date().toISOString()
    });
    audit.log(store, req.user, 'pay', 'PayRun', run.id, run.name + ' marked as paid');
    res.json(updated);
  });

  api.delete('/payruns/:id', auth.requireRole('admin'), function (req, res) {
    var run = load(req, res);
    if (!run) { return; }
    if (run.status !== 'Draft' && run.status !== 'Calculated') {
      return res.status(409).json({ error: 'Only draft or calculated pay runs can be deleted.' });
    }
    store.removeWhere('payslips', function (p) { return p.payRunId === run.id; });
    store.remove('payRuns', run.id);
    audit.log(store, req.user, 'delete', 'PayRun', run.id, run.name);
    res.status(204).end();
  });
};
