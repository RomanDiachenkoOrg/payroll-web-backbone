#!/usr/bin/env node
/*
 * Regenerates data/seed/*.json (the demo company "Acme Corp").
 * The server copies these files into data/db/ on first start.
 *
 *   npm run seed && npm run reset-data
 */
'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var payroll = require('../server/payroll');
var auth = require('../server/auth');

var OUT = path.join(__dirname, '..', 'data', 'seed');

var departments = [
  { id: 1, name: 'Engineering', code: 'ENG', costCenter: 'CC-100', managerEmployeeId: 1 },
  { id: 2, name: 'Finance', code: 'FIN', costCenter: 'CC-200', managerEmployeeId: 7 },
  { id: 3, name: 'Sales', code: 'SAL', costCenter: 'CC-300', managerEmployeeId: 11 },
  { id: 4, name: 'Operations', code: 'OPS', costCenter: 'CC-400', managerEmployeeId: 16 },
  { id: 5, name: 'HR', code: 'HR', costCenter: 'CC-500', managerEmployeeId: 22 }
];

var deductionTypes = [
  { id: 1, name: 'Health insurance', defaultAmount: 120 },
  { id: 2, name: 'Dental plan', defaultAmount: 25 },
  { id: 3, name: 'Union dues', defaultAmount: 15 },
  { id: 4, name: 'Parking', defaultAmount: 40 }
];

// first, last, dept, title, payType, amount (annual salary or hourly rate), hireDate, active, pension, deductions
var people = [
  ['Michael', 'Reyes', 1, 'Engineering Manager', 'salaried', 132000, '2016-03-14', true, true, [[1, 120], [2, 25]]],
  ['Emily', 'Carter', 1, 'Support Engineer', 'hourly', 38.5, '2021-06-01', true, true, [[1, 120]]],
  ['Daniel', 'Okafor', 1, 'Senior Software Engineer', 'salaried', 118000, '2018-09-03', true, true, [[1, 120]]],
  ['Sofia', 'Lindqvist', 1, 'Software Engineer', 'salaried', 96000, '2022-01-10', true, false, [[1, 120], [4, 40]]],
  ['Arjun', 'Mehta', 1, 'DevOps Engineer', 'salaried', 104500, '2020-04-20', true, true, []],
  ['Lucas', 'Ferreira', 1, 'Contract Developer', 'hourly', 62, '2023-02-13', false, false, []],
  ['Grace', 'Whitfield', 2, 'Finance Director', 'salaried', 126000, '2015-11-02', true, true, [[1, 120], [2, 25]]],
  ['Nathan', 'Price', 2, 'Senior Accountant', 'salaried', 78000, '2019-07-15', true, true, [[1, 120]]],
  ['Hannah', 'Schulz', 2, 'Payroll Specialist', 'salaried', 64000, '2021-03-08', true, false, [[2, 25]]],
  ['Omar', 'Haddad', 2, 'Accounts Clerk', 'hourly', 24.75, '2022-08-22', true, false, [[3, 15]]],
  ['Rachel', 'Kim', 3, 'Head of Sales', 'salaried', 115000, '2017-05-29', true, true, [[1, 120]]],
  ['Tom', 'Becker', 3, 'Account Executive', 'salaried', 72000, '2020-10-05', true, false, [[1, 120], [4, 40]]],
  ['Isabella', 'Rossi', 3, 'Account Executive', 'salaried', 70000, '2023-04-17', true, true, []],
  ['Kevin', 'Nguyen', 3, 'Sales Development Rep', 'salaried', 52000, '2024-01-08', true, false, []],
  ['Chloe', 'Martin', 3, 'Sales Development Rep', 'salaried', 50000, '2022-06-13', false, false, []],
  ['Victor', 'Alvarez', 4, 'Operations Manager', 'salaried', 92000, '2018-02-19', true, true, [[1, 120]]],
  ['Priya', 'Raman', 4, 'Logistics Coordinator', 'salaried', 58000, '2021-09-27', true, true, [[1, 120], [2, 25]]],
  ['Jake', 'Morrison', 4, 'Warehouse Associate', 'hourly', 21.5, '2022-03-14', true, false, [[3, 15]]],
  ['Lena', 'Kowalski', 4, 'Warehouse Associate', 'hourly', 21.5, '2023-07-03', true, false, [[3, 15]]],
  ['Samuel', 'Osei', 4, 'Forklift Operator', 'hourly', 23.25, '2019-12-02', true, true, [[1, 120], [3, 15]]],
  ['Mia', 'Thompson', 4, 'Facilities Technician', 'hourly', 27, '2024-05-20', false, false, []],
  ['Laura', 'Bennett', 5, 'HR Director', 'salaried', 110000, '2014-08-11', true, true, [[1, 120], [2, 25]]],
  ['Diego', 'Santos', 5, 'HR Generalist', 'salaried', 61000, '2020-01-13', true, false, [[1, 120]]],
  ['Yuki', 'Tanaka', 5, 'Recruiter', 'salaried', 59000, '2023-10-02', true, true, []],
  ['Zoe', 'Walsh', 5, 'HR Assistant', 'hourly', 22, '2025-02-03', true, false, []]
];

var employees = people.map(function (p, i) {
  var email = p[0].toLowerCase() + '.' + p[1].toLowerCase() + '@acme.test';
  if (i === 0) { email = 'manager@acme.test'; }
  if (i === 1) { email = 'employee@acme.test'; }
  if (i === 21) { email = 'admin@acme.test'; }
  return {
    id: i + 1,
    firstName: p[0],
    lastName: p[1],
    email: email,
    phone: '+1 555 01' + (10 + i),
    title: p[3],
    departmentId: p[2],
    payType: p[4],
    annualSalary: p[4] === 'salaried' ? p[5] : null,
    hourlyRate: p[4] === 'hourly' ? p[5] : null,
    hireDate: p[6],
    active: p[7],
    terminationDate: p[7] ? null : (i === 5 ? '2026-10-16' : (i === 14 ? '2026-08-29' : '2026-10-30')),
    pensionOptIn: p[8],
    deductions: p[9].map(function (d) { return { typeId: d[0], amount: d[1] }; })
  };
});

// salary history: an initial entry plus raises for long-serving staff
var salaryHistory = [];
employees.forEach(function (e) {
  var current = e.payType === 'hourly' ? e.hourlyRate : e.annualSalary;
  var hireYear = Number(e.hireDate.substr(0, 4));
  var raises = Math.min(3, Math.max(0, Math.floor((2026 - hireYear) / 2)));
  var amounts = [current];
  for (var r = 0; r < raises; r++) {
    var prev = amounts[0] / 1.04;
    amounts.unshift(e.payType === 'hourly' ? payroll.round2(prev) : Math.round(prev / 100) * 100);
  }
  amounts.forEach(function (amount, idx) {
    salaryHistory.push({
      employeeId: e.id,
      effectiveDate: idx === 0 ? e.hireDate : (2026 - (amounts.length - 1 - idx) * 2) + '-01-01',
      payType: e.payType,
      amount: amount,
      reason: idx === 0 ? 'Initial salary' : 'Annual review'
    });
  });
});
salaryHistory.forEach(function (s, i) { s.id = i + 1; });

function mondays(fromStr, toStr) {
  var out = [];
  var d = new Date(fromStr + 'T00:00:00Z');
  while (d.getUTCDay() !== 1) { d.setUTCDate(d.getUTCDate() + 1); }
  while (d.toISOString().substr(0, 10) <= toStr) {
    out.push(d.toISOString().substr(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

// timesheets for hourly employees
var timesheets = [];
var patterns = [
  [8, 8, 8, 8, 8, 0, 0],
  [8, 9, 8, 9, 8, 0, 0],
  [10, 10, 9, 10, 8, 4, 0],
  [8, 8, 8, 8, 6, 0, 0],
  [9, 9, 9, 9, 9, 0, 0]
];
employees.filter(function (e) { return e.payType === 'hourly'; }).forEach(function (e, n) {
  mondays('2026-09-01', '2026-11-09').forEach(function (week, w) {
    if (e.hireDate > week || (e.terminationDate && week > e.terminationDate)) { return; }
    var status = 'Approved';
    var rejectReason = null;
    if (week === '2026-11-09') {
      status = n % 2 === 0 ? 'Draft' : 'Submitted';
    } else if (week === '2026-11-02') {
      status = 'Submitted';
    } else if (week === '2026-10-26' && e.id === 18) {
      status = 'Rejected';
      rejectReason = 'Saturday hours were not scheduled - please check with your supervisor.';
    }
    var ts = {
      employeeId: e.id,
      weekStart: week,
      hours: patterns[(n + w) % patterns.length].slice(),
      notes: '',
      status: status,
      createdAt: week + 'T17:00:00.000Z'
    };
    if (status !== 'Draft') { ts.submittedAt = week + 'T17:05:00.000Z'; }
    if (status === 'Approved' || status === 'Rejected') {
      ts.decidedBy = e.departmentId === 1 ? 'manager@acme.test' : 'admin@acme.test';
      ts.decidedAt = week.substr(0, 8) + '28T09:00:00.000Z';
      ts.rejectReason = rejectReason;
    }
    timesheets.push(ts);
  });
});
timesheets.forEach(function (t, i) { t.id = i + 1; });

var settings = {
  currency: 'USD',
  socialRate: 0.05,
  pensionRate: 0.03,
  payDay: 28,
  taxBrackets: payroll.DEFAULT_SETTINGS.taxBrackets
};

var payRuns = [
  { id: 1, name: 'September 2026', periodStart: '2026-09-01', periodEnd: '2026-09-30', payDate: '2026-09-28', status: 'Paid' },
  { id: 2, name: 'October 2026', periodStart: '2026-10-01', periodEnd: '2026-10-31', payDate: '2026-10-28', status: 'Paid' },
  { id: 3, name: 'November 2026', periodStart: '2026-11-01', periodEnd: '2026-11-30', payDate: '2026-11-27', status: 'Draft' }
];

var payslips = [];
payRuns.forEach(function (run) {
  run.createdBy = 'admin@acme.test';
  run.createdAt = run.periodStart + 'T08:00:00.000Z';
  if (run.status !== 'Paid') {
    run.totals = payroll.totals([]);
    return;
  }
  var slips = employees.filter(function (e) {
    return e.hireDate <= run.periodEnd && (e.active || e.terminationDate > run.periodEnd);
  }).map(function (e) {
    var slip = payroll.calculatePayslip(e, timesheets.filter(function (t) { return t.employeeId === e.id; }), run, settings, deductionTypes);
    slip.payRunId = run.id;
    slip.id = payslips.length + 1;
    payslips.push(slip);
    return slip;
  });
  run.totals = payroll.totals(slips);
  run.calculatedAt = run.payDate.substr(0, 8) + '24T10:00:00.000Z';
  run.approvedBy = 'admin@acme.test';
  run.approvedAt = run.payDate.substr(0, 8) + '25T15:30:00.000Z';
  run.paidAt = run.payDate + 'T07:00:00.000Z';
});

function demoSalt(email) {
  return crypto.createHash('md5').update('acme:' + email).digest('hex').substr(0, 16);
}

var users = [
  { id: 1, email: 'admin@acme.test', name: 'Laura Bennett', role: 'admin', departmentId: 5, employeeId: 22 },
  { id: 2, email: 'manager@acme.test', name: 'Michael Reyes', role: 'manager', departmentId: 1, employeeId: 1 },
  { id: 3, email: 'employee@acme.test', name: 'Emily Carter', role: 'employee', departmentId: 1, employeeId: 2 },
  { id: 4, email: 'grace.whitfield@acme.test', name: 'Grace Whitfield', role: 'manager', departmentId: 2, employeeId: 7 },
  { id: 5, email: 'lucas.ferreira@acme.test', name: 'Lucas Ferreira', role: 'employee', departmentId: 1, employeeId: 6, active: false }
].map(function (u) {
  u.salt = demoSalt(u.email);
  u.passwordHash = auth.hashPassword('Passw0rd!', u.salt);
  u.active = u.active !== false;
  u.lastLoginAt = null;
  return u;
});

var auditLog = [
  ['2026-09-01T08:00:00.000Z', 1, 'create', 'PayRun', 1, 'September 2026'],
  ['2026-09-24T10:00:00.000Z', 1, 'calculate', 'PayRun', 1, 'September 2026'],
  ['2026-09-25T15:30:00.000Z', 1, 'approve', 'PayRun', 1, 'September 2026'],
  ['2026-09-28T07:00:00.000Z', 1, 'pay', 'PayRun', 1, 'September 2026 marked as paid'],
  ['2026-09-29T11:12:00.000Z', 1, 'deactivate', 'Employee', 15, 'Chloe Martin'],
  ['2026-10-01T08:00:00.000Z', 1, 'create', 'PayRun', 2, 'October 2026'],
  ['2026-10-05T13:40:00.000Z', 1, 'salary-change', 'Employee', 4, '92300 -> 96000 (Promotion)'],
  ['2026-10-16T16:20:00.000Z', 1, 'deactivate', 'Employee', 6, 'Lucas Ferreira'],
  ['2026-10-24T10:00:00.000Z', 1, 'calculate', 'PayRun', 2, 'October 2026'],
  ['2026-10-25T15:30:00.000Z', 1, 'approve', 'PayRun', 2, 'October 2026'],
  ['2026-10-28T07:00:00.000Z', 1, 'pay', 'PayRun', 2, 'October 2026 marked as paid'],
  ['2026-10-28T09:00:00.000Z', 2, 'reject', 'Timesheet', null, 'Jake Morrison: Saturday hours were not scheduled'],
  ['2026-10-30T17:45:00.000Z', 1, 'deactivate', 'Employee', 21, 'Mia Thompson'],
  ['2026-11-01T08:00:00.000Z', 1, 'create', 'PayRun', 3, 'November 2026'],
  ['2026-11-03T08:55:00.000Z', 2, 'login', 'User', 2, 'Signed in'],
  ['2026-11-03T09:10:00.000Z', 3, 'submit', 'Timesheet', null, 'Week of 2026-11-02']
].map(function (a, i) {
  var u = users[a[1] - 1];
  return { id: i + 1, at: a[0], userId: u.id, userEmail: u.email, action: a[2], entity: a[3], entityId: a[4], details: a[5] };
});

function write(name, data) {
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(data, null, 2) + '\n');
  console.log('  ' + name + '.json (' + (Array.isArray(data) ? data.length + ' rows' : 'object') + ')');
}

if (!fs.existsSync(OUT)) { fs.mkdirSync(OUT, { recursive: true }); }
console.log('Writing seed data to ' + OUT);
write('departments', departments);
write('deductionTypes', deductionTypes);
write('employees', employees);
write('salaryHistory', salaryHistory);
write('timesheets', timesheets);
write('payRuns', payRuns);
write('payslips', payslips);
write('users', users);
write('auditLog', auditLog);
write('settings', settings);
