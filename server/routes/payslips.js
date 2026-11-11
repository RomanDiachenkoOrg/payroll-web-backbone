'use strict';

var auth = require('../auth');
var util = require('../util');
var canView = require('./employees').canView;

function csvCell(value) {
  var s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

module.exports = function (api, store) {

  function load(req, res) {
    var slip = store.find('payslips', req.params.id);
    var run = slip && store.find('payRuns', slip.payRunId);
    var emp = slip && store.find('employees', slip.employeeId);
    var visible = slip && run && emp && canView(req.user, emp) &&
      (req.user.role === 'admin' || run.status === 'Approved' || run.status === 'Paid');
    if (!visible) {
      util.notFound(res, 'Payslip');
      return null;
    }
    var dept = store.find('departments', emp.departmentId);
    slip.payRun = { id: run.id, name: run.name, periodStart: run.periodStart, periodEnd: run.periodEnd, payDate: run.payDate, status: run.status };
    slip.employee = { id: emp.id, email: emp.email, title: emp.title, departmentName: dept ? dept.name : '' };
    return slip;
  }

  api.get('/payslips/:id', auth.requireLogin, function (req, res) {
    var slip = load(req, res);
    if (slip) { res.json(slip); }
  });

  api.get('/payslips/:id/export.csv', auth.requireLogin, function (req, res) {
    var slip = load(req, res);
    if (!slip) { return; }
    var rows = [
      ['Employee', slip.employeeName],
      ['Department', slip.employee.departmentName],
      ['Pay run', slip.payRun.name],
      ['Period', slip.payRun.periodStart + ' - ' + slip.payRun.periodEnd],
      ['Pay date', slip.payRun.payDate],
      [],
      ['Item', 'Amount (USD)'],
      ['Gross pay', slip.gross.toFixed(2)],
      ['Income tax', (-slip.tax).toFixed(2)],
      ['Social contribution', (-slip.social).toFixed(2)],
      ['Pension', (-slip.pension).toFixed(2)]
    ];
    slip.deductions.forEach(function (d) {
      rows.push([d.name, (-d.amount).toFixed(2)]);
    });
    rows.push(['Net pay', slip.net.toFixed(2)]);
    var body = rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
    var fileName = 'payslip-' + slip.payRun.periodStart.substr(0, 7) + '-' + slip.employeeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
    res.send(body);
  });
};
