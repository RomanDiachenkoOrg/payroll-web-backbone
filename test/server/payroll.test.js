'use strict';

var expect = require('chai').expect;
var payroll = require('../../server/payroll');

describe('payroll calculation', function () {

  var period = { periodStart: '2026-09-01', periodEnd: '2026-09-30' };

  function week(weekStart, hours, status) {
    return { weekStart: weekStart, hours: hours, status: status || 'Approved' };
  }

  describe('round2', function () {
    it('rounds half up to cents', function () {
      expect(payroll.round2(2.675)).to.equal(2.68);
      expect(payroll.round2(1.005)).to.equal(1.01);
      expect(payroll.round2(10)).to.equal(10);
    });
  });

  describe('incomeTax', function () {
    it('is zero up to 1000', function () {
      expect(payroll.incomeTax(800)).to.equal(0);
      expect(payroll.incomeTax(1000)).to.equal(0);
    });

    it('taxes the 1000-4000 band at 15%', function () {
      expect(payroll.incomeTax(2000)).to.equal(150);
      expect(payroll.incomeTax(4000)).to.equal(450);
    });

    it('taxes everything above 4000 at 25%', function () {
      expect(payroll.incomeTax(11000)).to.equal(450 + 7000 * 0.25);
    });
  });

  describe('weekHours', function () {
    it('counts hours above 40 as overtime', function () {
      var h = payroll.weekHours({ hours: [10, 10, 10, 10, 5, 0, 0] });
      expect(h).to.deep.equal({ total: 45, regular: 40, overtime: 5 });
    });

    it('has no overtime for a normal week', function () {
      var h = payroll.weekHours({ hours: [8, 8, 8, 8, 8, 0, 0] });
      expect(h.overtime).to.equal(0);
    });
  });

  describe('calculatePayslip', function () {
    it('calculates a salaried employee', function () {
      var slip = payroll.calculatePayslip({
        id: 1, firstName: 'A', lastName: 'B', payType: 'salaried', annualSalary: 60000,
        pensionOptIn: true, deductions: [{ typeId: 1, amount: 120 }]
      }, [], period, payroll.DEFAULT_SETTINGS, [{ id: 1, name: 'Health insurance' }]);

      expect(slip.gross).to.equal(5000);
      expect(slip.tax).to.equal(700);
      expect(slip.social).to.equal(250);
      expect(slip.pension).to.equal(150);
      expect(slip.other).to.equal(120);
      expect(slip.net).to.equal(3780);
      expect(slip.deductions[0].name).to.equal('Health insurance');
    });

    it('pays hourly employees for approved timesheets in the period only', function () {
      var sheets = [
        week('2026-09-07', [8, 8, 8, 8, 8, 0, 0]),
        week('2026-09-14', [10, 10, 10, 10, 5, 0, 0]),
        week('2026-09-21', [8, 8, 8, 8, 8, 0, 0], 'Submitted'),
        week('2026-10-05', [8, 8, 8, 8, 8, 0, 0])
      ];
      var slip = payroll.calculatePayslip({
        id: 2, firstName: 'C', lastName: 'D', payType: 'hourly', hourlyRate: 20, pensionOptIn: false, deductions: []
      }, sheets, period);

      expect(slip.regularHours).to.equal(80);
      expect(slip.overtimeHours).to.equal(5);
      expect(slip.gross).to.equal(20 * 80 + 30 * 5);
      expect(slip.pension).to.equal(0);
    });
  });

  describe('totals', function () {
    it('sums payslips', function () {
      var t = payroll.totals([
        { gross: 100.1, tax: 0, social: 5.01, pension: 0, other: 0, net: 95.09 },
        { gross: 200.2, tax: 0, social: 10.01, pension: 0, other: 0, net: 190.19 }
      ]);
      expect(t.employees).to.equal(2);
      expect(t.gross).to.equal(300.3);
      expect(t.net).to.equal(285.28);
    });
  });
});
