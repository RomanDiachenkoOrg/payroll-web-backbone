/*
 * Small read-only collections that do not need their own model class.
 */
define(['backbone'], function (Backbone) {
  'use strict';

  var Users = Backbone.Collection.extend({
    url: '/api/users',
    comparator: 'email'
  });

  var AuditLog = Backbone.Collection.extend({
    url: '/api/audit'
  });

  var DeductionTypes = Backbone.Collection.extend({
    url: '/api/deduction-types',

    nameOf: function (id) {
      var t = this.get(id);
      return t ? t.get('name') : '';
    }
  });

  return {
    Users: Users,
    AuditLog: AuditLog,
    DeductionTypes: DeductionTypes
  };
});
