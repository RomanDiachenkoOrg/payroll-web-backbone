'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var expect = require('chai').expect;
var request = require('supertest');
var createApp = require('../../server/app');

describe('REST API', function () {
  var dataDir, app;

  before(function () {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'payroll-api-'));
    app = createApp({ dataDir: dataDir });
  });

  after(function () {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  function login(email) {
    var agent = request.agent(app);
    return agent.post('/api/session')
      .send({ email: email, password: 'Passw0rd!' })
      .expect(200)
      .then(function () { return agent; });
  }

  describe('session', function () {
    it('rejects a wrong password', function () {
      return request(app).post('/api/session')
        .send({ email: 'admin@acme.test', password: 'nope' })
        .expect(401)
        .then(function (res) {
          expect(res.body.error).to.equal('Invalid email or password.');
        });
    });

    it('returns the current user after login', function () {
      return login('manager@acme.test').then(function (agent) {
        return agent.get('/api/session').expect(200);
      }).then(function (res) {
        expect(res.body.role).to.equal('manager');
        expect(res.body).to.not.have.property('passwordHash');
      });
    });

    it('requires a session for the API', function () {
      return request(app).get('/api/employees').expect(401);
    });
  });

  describe('employees', function () {
    it('limits managers to their own department', function () {
      return login('manager@acme.test').then(function (agent) {
        return agent.get('/api/employees').expect(200);
      }).then(function (res) {
        expect(res.body.length).to.be.above(0);
        res.body.forEach(function (e) { expect(e.departmentId).to.equal(1); });
      });
    });

    it('validates a new employee', function () {
      return login('admin@acme.test').then(function (agent) {
        return agent.post('/api/employees')
          .send({ firstName: 'New', lastName: '', email: 'not-an-email', payType: 'salaried', annualSalary: 0, departmentId: 1, hireDate: '2026-01-05' })
          .expect(422);
      }).then(function (res) {
        expect(res.body.fields).to.have.keys('lastName', 'email', 'annualSalary');
      });
    });

    it('rejects a duplicate email', function () {
      return login('admin@acme.test').then(function (agent) {
        return agent.post('/api/employees')
          .send({ firstName: 'Dup', lastName: 'Licate', email: 'employee@acme.test', payType: 'hourly', hourlyRate: 20, departmentId: 1, hireDate: '2026-01-05' })
          .expect(422);
      }).then(function (res) {
        expect(res.body.fields.email).to.match(/already/);
      });
    });

    it('does not let employees create employees', function () {
      return login('employee@acme.test').then(function (agent) {
        return agent.post('/api/employees').send({}).expect(403);
      });
    });
  });

  describe('departments', function () {
    it('refuses to delete a department with active employees', function () {
      return login('admin@acme.test').then(function (agent) {
        return agent.delete('/api/departments/1').expect(409);
      }).then(function (res) {
        expect(res.body.error).to.match(/active employee/);
      });
    });
  });

  describe('timesheets', function () {
    it('requires a reason to reject', function () {
      return login('manager@acme.test').then(function (agent) {
        return agent.get('/api/timesheets?status=Submitted').expect(200).then(function (res) {
          var ts = res.body.filter(function (t) { return t.departmentId === 1 && t.employeeId !== 1; })[0];
          expect(ts, 'a submitted timesheet in Engineering').to.exist;
          return agent.post('/api/timesheets/' + ts.id + '/reject').send({ reason: '  ' }).expect(422);
        });
      });
    });

    it('validates hours per day', function () {
      return login('employee@acme.test').then(function (agent) {
        return agent.post('/api/timesheets')
          .send({ weekStart: '2027-01-04', hours: [8, 8, 25, 8, 8, 0, 0] })
          .expect(422);
      }).then(function (res) {
        expect(res.body.fields).to.have.property('hours2');
      });
    });
  });

  describe('pay runs', function () {
    it('calculates, approves and pays the draft run, then locks it', function () {
      var agent;
      return login('admin@acme.test').then(function (a) {
        agent = a;
        return agent.post('/api/payruns/3/calculate').expect(200);
      }).then(function (res) {
        expect(res.body.status).to.equal('Calculated');
        expect(res.body.payslips.length).to.be.above(10);
        return agent.post('/api/payruns/3/approve').expect(200);
      }).then(function () {
        return agent.post('/api/payruns/3/pay').expect(200);
      }).then(function (res) {
        expect(res.body.status).to.equal('Paid');
        return agent.post('/api/payruns/3/calculate').expect(409);
      }).then(function (res) {
        expect(res.body.error).to.match(/locked/);
      });
    });
  });
});
