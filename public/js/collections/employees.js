define(['underscore', 'backbone', 'models/employee'], function (_, Backbone, Employee) {
  'use strict';

  var Employees = Backbone.Collection.extend({
    model: Employee,
    url: '/api/employees',

    /**
     * Client side search / filter / sort.
     * criteria: { q, departmentId, status: 'active'|'inactive'|'all', sortBy, sortDir }
     * departments: Departments collection (used for sorting by department name)
     */
    query: function (criteria, departments) {
      var q = (criteria.q || '').toLowerCase();
      var deptId = criteria.departmentId ? Number(criteria.departmentId) : null;
      var status = criteria.status || 'active';

      var list = this.filter(function (e) {
        if (status === 'active' && !e.get('active')) { return false; }
        if (status === 'inactive' && e.get('active')) { return false; }
        if (deptId && e.get('departmentId') !== deptId) { return false; }
        if (q) {
          var hay = (e.fullName() + ' ' + e.get('email') + ' ' + (e.get('title') || '')).toLowerCase();
          if (hay.indexOf(q) < 0) { return false; }
        }
        return true;
      });

      var sortBy = criteria.sortBy || 'name';
      var getters = {
        name: function (e) { return (e.get('lastName') + ' ' + e.get('firstName')).toLowerCase(); },
        department: function (e) { return departments ? departments.nameOf(e.get('departmentId')) : e.get('departmentId'); },
        title: function (e) { return (e.get('title') || '').toLowerCase(); },
        hireDate: function (e) { return e.get('hireDate'); },
        pay: function (e) { return e.payAmount(); }
      };
      list = _.sortBy(list, getters[sortBy] || getters.name);
      if (criteria.sortDir === 'desc') {
        list.reverse();
      }
      return list;
    }
  });

  window.App = window.App || {};
  window.App.Collections = window.App.Collections || {};
  window.App.Collections.Employees = Employees;

  return Employees;
});
