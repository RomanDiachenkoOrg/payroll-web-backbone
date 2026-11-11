/*
 * Payroll calculation rules (monthly pay runs).
 *
 *  - salaried: gross = annualSalary / 12
 *  - hourly:   gross = rate * regular + rate * 1.5 * overtime,
 *              overtime = hours above 40 in a single week
 *  - income tax is progressive on the monthly gross (see settings.taxBrackets)
 *  - social contribution and pension are a flat share of gross
 */
'use strict';

var WEEKLY_REGULAR_HOURS = 40;
var OVERTIME_MULTIPLIER = 1.5;

var DEFAULT_SETTINGS = {
  currency: 'USD',
  socialRate: 0.05,
  pensionRate: 0.03,
  taxBrackets: [
    { from: 0, to: 1000, rate: 0 },
    { from: 1000, to: 4000, rate: 0.15 },
    { from: 4000, to: null, rate: 0.25 }
  ]
};

// round half-up to cents; the epsilon protects against 2.675 -> 2.67
function round2(value) {
  var n = Number(value) || 0;
  var sign = n < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(n) * 100 + 1e-7) / 100;
}

function sum(list) {
  var total = 0;
  for (var i = 0; i < list.length; i++) {
    total += Number(list[i]) || 0;
  }
  return total;
}

function weekHours(timesheet) {
  var total = sum(timesheet.hours || []);
  var overtime = total > WEEKLY_REGULAR_HOURS ? total - WEEKLY_REGULAR_HOURS : 0;
  return { total: total, regular: total - overtime, overtime: overtime };
}

function incomeTax(gross, brackets) {
  var tax = 0;
  brackets = brackets || DEFAULT_SETTINGS.taxBrackets;
  for (var i = 0; i < brackets.length; i++) {
    var b = brackets[i];
    if (gross <= b.from) {
      break;
    }
    var upper = (b.to === null || b.to === undefined) ? gross : Math.min(gross, b.to);
    tax += (upper - b.from) * b.rate;
  }
  return round2(tax);
}

function inPeriod(dateStr, periodStart, periodEnd) {
  return dateStr >= periodStart && dateStr <= periodEnd;
}

/**
 * Build a payslip for an employee for the given period.
 * @param {Object} employee
 * @param {Array} timesheets  all timesheets of this employee (any status)
 * @param {Object} period     { periodStart: 'YYYY-MM-DD', periodEnd: 'YYYY-MM-DD' }
 * @param {Object} settings
 * @param {Array} deductionTypes
 */
function calculatePayslip(employee, timesheets, period, settings, deductionTypes) {
  settings = settings || DEFAULT_SETTINGS;
  var regular = 0, overtime = 0, gross, rate = null;

  if (employee.payType === 'hourly') {
    rate = Number(employee.hourlyRate) || 0;
    (timesheets || []).forEach(function (ts) {
      if (ts.status !== 'Approved' || !inPeriod(ts.weekStart, period.periodStart, period.periodEnd)) {
        return;
      }
      var h = weekHours(ts);
      regular += h.regular;
      overtime += h.overtime;
    });
    gross = rate * regular + rate * OVERTIME_MULTIPLIER * overtime;
  } else {
    gross = (Number(employee.annualSalary) || 0) / 12;
  }
  gross = round2(gross);

  var tax = incomeTax(gross, settings.taxBrackets);
  var social = round2(gross * settings.socialRate);
  var pension = employee.pensionOptIn ? round2(gross * settings.pensionRate) : 0;

  // nothing to deduct from when there is no pay this period (e.g. no approved hours)
  var items = (gross > 0 ? employee.deductions || [] : []).map(function (d) {
    var type = null;
    (deductionTypes || []).forEach(function (t) {
      if (t.id === d.typeId) { type = t; }
    });
    return { typeId: d.typeId, name: type ? type.name : 'Other', amount: round2(d.amount) };
  });
  var other = round2(sum(items.map(function (i) { return i.amount; })));

  return {
    employeeId: employee.id,
    employeeName: employee.firstName + ' ' + employee.lastName,
    departmentId: employee.departmentId,
    payType: employee.payType,
    rate: rate,
    regularHours: regular,
    overtimeHours: overtime,
    gross: gross,
    tax: tax,
    social: social,
    pension: pension,
    other: other,
    deductions: items,
    net: round2(gross - tax - social - pension - other)
  };
}

function totals(payslips) {
  var t = { employees: payslips.length, gross: 0, tax: 0, social: 0, pension: 0, other: 0, net: 0 };
  payslips.forEach(function (p) {
    t.gross += p.gross; t.tax += p.tax; t.social += p.social;
    t.pension += p.pension; t.other += p.other; t.net += p.net;
  });
  ['gross', 'tax', 'social', 'pension', 'other', 'net'].forEach(function (k) {
    t[k] = round2(t[k]);
  });
  return t;
}

module.exports = {
  DEFAULT_SETTINGS: DEFAULT_SETTINGS,
  WEEKLY_REGULAR_HOURS: WEEKLY_REGULAR_HOURS,
  round2: round2,
  weekHours: weekHours,
  incomeTax: incomeTax,
  calculatePayslip: calculatePayslip,
  totals: totals
};
