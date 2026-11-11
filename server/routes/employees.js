'use strict';

var auth = require('../auth');
var audit = require('../audit');
var util = require('../util');
var payroll = require('../payroll');

var FIELDS = ['firstName', 'lastName', 'email', 'phone', 'title', 'departmentId', 'payType',
  'annualSalary', 'hourlyRate', 'hireDate', 'pensionOptIn', 'deductions'];

// which employees may the current user see?
function canView(user, employee) {
  if (user.role === 'admin') { return true; }
  if (user.role === 'manager') { return employee.departmentId === user.departmentId; }
  return employee.id === user.employeeId;
}

function normalize(body) {
  var attrs = util.pick(body, FIELDS);
  if (attrs.departmentId !== undefined) { attrs.departmentId = Number(attrs.departmentId) || null; }
  if (attrs.annualSalary !== undefined) { attrs.annualSalary = attrs.annualSalary === '' || attrs.annualSalary === null ? null : Number(attrs.annualSalary); }
  if (attrs.hourlyRate !== undefined) { attrs.hourlyRate = attrs.hourlyRate === '' || attrs.hourlyRate === null ? null : Number(attrs.hourlyRate); }
  if (attrs.email !== undefined) { attrs.email = String(attrs.email).trim().toLowerCase(); }
  if (attrs.pensionOptIn !== undefined) { attrs.pensionOptIn = !!attrs.pensionOptIn; }
  if (attrs.deductions !== undefined) {
    attrs.deductions = (attrs.deductions || []).map(function (d) {
      return { typeId: Number(d.typeId), amount: payroll.round2(d.amount) };
    }).filter(function (d) { return d.typeId && d.amount > 0; });
  }
  return attrs;
}

function validate(store, attrs, id) {
  var errors = {};
  ['firstName', 'lastName', 'email', 'hireDate', 'payType'].forEach(function (f) {
    if (util.isBlank(attrs[f])) { errors[f] = 'This field is required.'; }
  });
  if (!errors.email) {
    if (!util.EMAIL_RE.test(attrs.email)) {
      errors.email = 'Enter a valid email address.';
    } else if (store.where('employees', function (e) { return e.email === attrs.email && e.id !== id; }).length) {
      errors.email = 'Another employee already uses this email.';
    }
  }
  if (!attrs.departmentId || !store.find('departments', attrs.departmentId)) {
    errors.departmentId = 'Select a department.';
  }
  if (!errors.hireDate && !util.DATE_RE.test(attrs.hireDate)) {
    errors.hireDate = 'Use the format YYYY-MM-DD.';
  }
  if (attrs.payType === 'salaried') {
    if (!(attrs.annualSalary > 0)) { errors.annualSalary = 'Salary must be greater than 0.'; }
  } else if (attrs.payType === 'hourly') {
    if (!(attrs.hourlyRate > 0)) { errors.hourlyRate = 'Hourly rate must be greater than 0.'; }
  } else if (!errors.payType) {
    errors.payType = 'Unknown pay type.';
  }
  return errors;
}

module.exports = function (api, store) {

  function load(req, res) {
    var emp = store.find('employees', req.params.id);
    if (!emp || !canView(req.user, emp)) {
      util.notFound(res, 'Employee');
      return null;
    }
    return emp;
  }

  api.get('/employees', auth.requireLogin, function (req, res) {
    res.json(store.where('employees', function (e) { return canView(req.user, e); }));
  });

  api.get('/employees/:id', auth.requireLogin, function (req, res) {
    var emp = load(req, res);
    if (emp) { res.json(emp); }
  });

  api.post('/employees', auth.requireRole('admin'), function (req, res) {
    var attrs = normalize(req.body);
    var errors = validate(store, attrs, null);
    if (Object.keys(errors).length) {
      return util.badRequest(res, 'Please correct the highlighted fields.', errors);
    }
    attrs.active = true;
    attrs.deductions = attrs.deductions || [];
    var emp = store.insert('employees', attrs);
    store.insert('salaryHistory', {
      employeeId: emp.id,
      effectiveDate: emp.hireDate,
      payType: emp.payType,
      amount: emp.payType === 'hourly' ? emp.hourlyRate : emp.annualSalary,
      reason: 'Initial salary'
    });
    audit.log(store, req.user, 'create', 'Employee', emp.id, emp.firstName + ' ' + emp.lastName);
    res.status(201).json(emp);
  });

  api.put('/employees/:id', auth.requireRole('admin'), function (req, res) {
    var current = load(req, res);
    if (!current) { return; }
    var attrs = normalize(req.body);
    var merged = Object.assign({}, current, attrs);
    var errors = validate(store, merged, current.id);
    if (Object.keys(errors).length) {
      return util.badRequest(res, 'Please correct the highlighted fields.', errors);
    }
    var emp = store.update('employees', current.id, attrs);
    audit.log(store, req.user, 'update', 'Employee', emp.id, emp.firstName + ' ' + emp.lastName);
    res.json(emp);
  });

  api.post('/employees/:id/deactivate', auth.requireRole('admin'), function (req, res) {
    var current = load(req, res);
    if (!current) { return; }
    var emp = store.update('employees', current.id, { active: false, terminationDate: util.today() });
    audit.log(store, req.user, 'deactivate', 'Employee', emp.id, emp.firstName + ' ' + emp.lastName);
    res.json(emp);
  });

  api.post('/employees/:id/activate', auth.requireRole('admin'), function (req, res) {
    var current = load(req, res);
    if (!current) { return; }
    var emp = store.update('employees', current.id, { active: true, terminationDate: null });
    audit.log(store, req.user, 'activate', 'Employee', emp.id, emp.firstName + ' ' + emp.lastName);
    res.json(emp);
  });

  api.get('/employees/:id/salary-history', auth.requireLogin, function (req, res) {
    var emp = load(req, res);
    if (!emp) { return; }
    var rows = store.where('salaryHistory', function (s) { return s.employeeId === emp.id; });
    rows.sort(function (a, b) { return a.effectiveDate < b.effectiveDate ? 1 : -1; });
    res.json(rows);
  });

  api.post('/employees/:id/salary-history', auth.requireRole('admin'), function (req, res) {
    var emp = load(req, res);
    if (!emp) { return; }
    var amount = Number(req.body.amount);
    var errors = {};
    if (!(amount > 0)) { errors.amount = 'Amount must be greater than 0.'; }
    if (!util.DATE_RE.test(req.body.effectiveDate || '')) { errors.effectiveDate = 'Use the format YYYY-MM-DD.'; }
    if (util.isBlank(req.body.reason)) { errors.reason = 'Please give a reason.'; }
    if (Object.keys(errors).length) {
      return util.badRequest(res, 'Please correct the highlighted fields.', errors);
    }
    var row = store.insert('salaryHistory', {
      employeeId: emp.id,
      effectiveDate: req.body.effectiveDate,
      payType: emp.payType,
      amount: payroll.round2(amount),
      reason: String(req.body.reason).trim()
    });
    var change = emp.payType === 'hourly' ? { hourlyRate: row.amount } : { annualSalary: row.amount };
    store.update('employees', emp.id, change);
    audit.log(store, req.user, 'salary-change', 'Employee', emp.id,
      (emp.payType === 'hourly' ? emp.hourlyRate : emp.annualSalary) + ' -> ' + row.amount + ' (' + row.reason + ')');
    res.status(201).json(row);
  });

  api.get('/employees/:id/payslips', auth.requireLogin, function (req, res) {
    var emp = load(req, res);
    if (!emp) { return; }
    var runs = {};
    store.all('payRuns').forEach(function (r) { runs[r.id] = r; });
    var rows = store.where('payslips', function (p) {
      var run = runs[p.payRunId];
      // employees only see slips once the run has been approved
      return p.employeeId === emp.id && run && (req.user.role === 'admin' || run.status === 'Approved' || run.status === 'Paid');
    }).map(function (p) {
      var run = runs[p.payRunId];
      p.payRunName = run.name;
      p.payDate = run.payDate;
      p.periodStart = run.periodStart;
      p.periodEnd = run.periodEnd;
      p.status = run.status;
      return p;
    });
    rows.sort(function (a, b) { return a.periodStart < b.periodStart ? 1 : -1; });
    res.json(rows);
  });
};

module.exports.canView = canView;
