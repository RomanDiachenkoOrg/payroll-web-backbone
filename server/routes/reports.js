'use strict';

var auth = require('../auth');
var util = require('../util');
var payroll = require('../payroll');

var MONTH_RE = /^\d{4}-\d{2}$/;

module.exports = function (api, store) {

  // Payroll cost by department for pay runs whose period starts within [from, to] (months)
  api.get('/reports/department-cost', auth.requireRole('admin', 'manager'), function (req, res) {
    var from = req.query.from, to = req.query.to;
    if (!MONTH_RE.test(from || '') || !MONTH_RE.test(to || '')) {
      return util.badRequest(res, 'Choose a period (from / to month).');
    }
    if (to < from) {
      return util.badRequest(res, 'The end of the period is before the start.');
    }
    var includeUnpaid = req.query.includeUnpaid === 'true';
    var runs = store.where('payRuns', function (r) {
      var month = r.periodStart.substr(0, 7);
      var ok = r.status === 'Paid' || (includeUnpaid && r.status === 'Approved');
      return ok && month >= from && month <= to;
    });
    var runIds = runs.map(function (r) { return r.id; });

    var departments = store.all('departments');
    if (req.user.role === 'manager') {
      departments = departments.filter(function (d) { return d.id === req.user.departmentId; });
    }

    var rows = departments.map(function (d) {
      var slips = store.where('payslips', function (p) {
        return runIds.indexOf(p.payRunId) >= 0 && p.departmentId === d.id;
      });
      var t = payroll.totals(slips);
      var people = {};
      slips.forEach(function (p) { people[p.employeeId] = true; });
      return {
        departmentId: d.id,
        departmentName: d.name,
        employees: Object.keys(people).length,
        gross: t.gross,
        tax: t.tax,
        social: t.social,
        pension: t.pension,
        other: t.other,
        net: t.net,
        employerCost: payroll.round2(t.gross + t.social)
      };
    });

    res.json({
      from: from,
      to: to,
      payRuns: runs.map(function (r) { return { id: r.id, name: r.name, status: r.status }; }),
      rows: rows
    });
  });
};
