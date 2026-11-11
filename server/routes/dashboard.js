'use strict';

var auth = require('../auth');
var util = require('../util');
var canView = require('./employees').canView;

function nextPayDate(runs, settings) {
  var open = runs.filter(function (r) { return r.status !== 'Paid' && r.payDate >= util.today(); });
  open.sort(function (a, b) { return a.payDate < b.payDate ? -1 : 1; });
  if (open.length) { return open[0].payDate; }
  var d = new Date();
  var day = settings.payDay || 28;
  if (d.getDate() > day) { d.setMonth(d.getMonth() + 1); }
  return d.getFullYear() + '-' + util.pad(d.getMonth() + 1) + '-' + util.pad(day);
}

module.exports = function (api, store) {

  api.get('/dashboard', auth.requireLogin, function (req, res) {
    var user = req.user;
    var employees = store.where('employees', function (e) { return canView(user, e); });
    var visibleIds = {};
    employees.forEach(function (e) { visibleIds[e.id] = true; });

    var runs = store.all('payRuns');
    var paid = runs.filter(function (r) { return r.status === 'Paid'; });
    paid.sort(function (a, b) { return a.periodStart < b.periodStart ? 1 : -1; });
    var last = paid[0] || null;

    var pending = store.where('timesheets', function (t) {
      return t.status === 'Submitted' && visibleIds[t.employeeId];
    }).length;

    var departments = store.all('departments');
    var byDept = departments.map(function (d) {
      var row = { departmentId: d.id, name: d.name, headcount: 0, gross: 0 };
      employees.forEach(function (e) {
        if (e.departmentId === d.id && e.active) { row.headcount++; }
      });
      if (last && user.role !== 'employee') {
        store.where('payslips', function (p) {
          return p.payRunId === last.id && p.departmentId === d.id && visibleIds[p.employeeId];
        }).forEach(function (p) { row.gross += p.gross; });
      }
      row.gross = Math.round(row.gross * 100) / 100;
      return row;
    }).filter(function (r) { return user.role === 'admin' || r.headcount > 0; });

    var result = {
      headcount: employees.filter(function (e) { return e.active; }).length,
      pendingTimesheets: pending,
      nextPayDate: nextPayDate(runs, store.getObject('settings')),
      lastPayRun: last && user.role !== 'employee' ? { id: last.id, name: last.name, payDate: last.payDate, totals: last.totals } : null,
      departments: byDept
    };

    if (user.role === 'employee') {
      var mySlips = store.where('payslips', function (p) {
        var run = store.find('payRuns', p.payRunId);
        return p.employeeId === user.employeeId && run && (run.status === 'Paid' || run.status === 'Approved');
      });
      mySlips.sort(function (a, b) { return a.payRunId < b.payRunId ? 1 : -1; });
      result.lastPayslip = mySlips[0] || null;
      result.myDraftTimesheets = store.where('timesheets', function (t) {
        return t.employeeId === user.employeeId && (t.status === 'Draft' || t.status === 'Rejected');
      }).length;
    }
    if (user.role === 'admin') {
      var log = store.all('auditLog');
      result.recentActivity = log.slice(-6).reverse();
    }
    res.json(result);
  });
};
