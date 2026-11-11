define(['jquery', 'underscore', 'backbone'], function ($, _, Backbone) {
  'use strict';

  var PERMISSIONS = {
    'employees:list': ['admin', 'manager'],
    'employees:edit': ['admin'],
    'salary:edit': ['admin'],
    'timesheets:decide': ['admin', 'manager'],
    'timesheets:any-employee': ['admin'],
    'payruns:view': ['admin', 'manager'],
    'payruns:manage': ['admin'],
    'departments:view': ['admin'],
    'departments:edit': ['admin'],
    'reports:view': ['admin', 'manager'],
    'settings:view': ['admin']
  };

  var Session = Backbone.Model.extend({
    url: '/api/session',

    isLoggedIn: function () {
      return !!this.get('id');
    },

    role: function () {
      return this.get('role');
    },

    can: function (permission) {
      var roles = PERMISSIONS[permission];
      return !!roles && _.indexOf(roles, this.get('role')) >= 0;
    },

    login: function (email, password) {
      var self = this;
      return $.ajax({
        url: this.url,
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({ email: email, password: password })
      }).done(function (user) {
        self.clear({ silent: true });
        self.set(user);
        self.trigger('login', self);
      });
    },

    logout: function () {
      var self = this;
      return $.ajax({ url: this.url, type: 'DELETE' }).always(function () {
        self.clear();
        self.trigger('logout', self);
      });
    }
  });

  return Session;
});
