'use strict';

var auth = require('../auth');
var audit = require('../audit');
var util = require('../util');

function withCounts(store, dept) {
  var emps = store.where('employees', function (e) { return e.departmentId === dept.id; });
  dept.employeeCount = emps.length;
  dept.activeEmployeeCount = emps.filter(function (e) { return e.active; }).length;
  return dept;
}

function validate(store, body, id) {
  var errors = {};
  var name = String(body.name || '').trim();
  if (!name) {
    errors.name = 'Name is required.';
  } else if (store.where('departments', function (d) {
    return d.name.toLowerCase() === name.toLowerCase() && d.id !== id;
  }).length) {
    errors.name = 'A department with this name already exists.';
  }
  if (util.isBlank(body.code)) {
    errors.code = 'Code is required.';
  }
  return errors;
}

function attrs(body) {
  return {
    name: String(body.name).trim(),
    code: String(body.code).trim().toUpperCase(),
    costCenter: body.costCenter || '',
    managerEmployeeId: body.managerEmployeeId ? Number(body.managerEmployeeId) : null
  };
}

module.exports = function (api, store) {

  api.get('/departments', auth.requireLogin, function (req, res) {
    res.json(store.all('departments').map(function (d) { return withCounts(store, d); }));
  });

  api.get('/departments/:id', auth.requireLogin, function (req, res) {
    var dept = store.find('departments', req.params.id);
    if (!dept) { return util.notFound(res, 'Department'); }
    res.json(withCounts(store, dept));
  });

  api.post('/departments', auth.requireRole('admin'), function (req, res) {
    var errors = validate(store, req.body, null);
    if (Object.keys(errors).length) {
      return util.badRequest(res, 'Please correct the highlighted fields.', errors);
    }
    var dept = store.insert('departments', attrs(req.body));
    audit.log(store, req.user, 'create', 'Department', dept.id, dept.name);
    res.status(201).json(withCounts(store, dept));
  });

  api.put('/departments/:id', auth.requireRole('admin'), function (req, res) {
    var id = Number(req.params.id);
    if (!store.find('departments', id)) { return util.notFound(res, 'Department'); }
    var errors = validate(store, req.body, id);
    if (Object.keys(errors).length) {
      return util.badRequest(res, 'Please correct the highlighted fields.', errors);
    }
    var dept = store.update('departments', id, attrs(req.body));
    audit.log(store, req.user, 'update', 'Department', id, dept.name);
    res.json(withCounts(store, dept));
  });

  api.delete('/departments/:id', auth.requireRole('admin'), function (req, res) {
    var dept = store.find('departments', req.params.id);
    if (!dept) { return util.notFound(res, 'Department'); }
    withCounts(store, dept);
    if (dept.activeEmployeeCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete department ' + dept.name + ': it still has ' + dept.activeEmployeeCount +
          ' active employee(s). Move or deactivate them first.'
      });
    }
    store.remove('departments', dept.id);
    audit.log(store, req.user, 'delete', 'Department', dept.id, dept.name);
    res.status(204).end();
  });
};
