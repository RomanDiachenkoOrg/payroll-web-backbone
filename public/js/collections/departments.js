define(['backbone', 'models/department'], function (Backbone, Department) {
  'use strict';

  var Departments = Backbone.Collection.extend({
    model: Department,
    url: '/api/departments',
    comparator: 'name',

    nameOf: function (id) {
      var d = this.get(id);
      return d ? d.get('name') : '';
    }
  });

  window.App = window.App || {};
  window.App.Collections = window.App.Collections || {};
  window.App.Collections.Departments = Departments;

  return Departments;
});
