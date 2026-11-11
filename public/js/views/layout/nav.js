define([
  'jquery',
  'underscore',
  'backbone',
  'utils/format',
  'text!templates/layout/nav.html'
], function ($, _, Backbone, format, navTpl) {
  'use strict';

  var MENU = [
    { href: '#', label: 'Dashboard', section: '' },
    { href: '#employees', label: 'Employees', section: 'employees', permission: 'employees:list' },
    { href: '#me', label: 'My profile', section: 'me', roles: ['employee'] },
    { href: '#timesheets', label: 'Timesheets', section: 'timesheets' },
    { href: '#payruns', label: 'Pay runs', section: 'payruns', permission: 'payruns:view' },
    { href: '#departments', label: 'Departments', section: 'departments', permission: 'departments:view' },
    { href: '#reports', label: 'Reports', section: 'reports', permission: 'reports:view' },
    { href: '#settings', label: 'Settings', section: 'settings', permission: 'settings:view' }
  ];

  var NavView = Backbone.View.extend({
    template: _.template(navTpl),

    initialize: function () {
      this.listenTo(this.model, 'change:id login logout', this.render);
      this.listenTo(window.App.vent, 'route', this.highlight);
    },

    items: function () {
      var session = this.model;
      return _.filter(MENU, function (item) {
        if (item.permission && !session.can(item.permission)) { return false; }
        if (item.roles && _.indexOf(item.roles, session.get('role')) < 0) { return false; }
        return true;
      });
    },

    render: function () {
      this.$el.html(this.template({
        loggedIn: this.model.isLoggedIn(),
        user: this.model.toJSON(),
        items: this.model.isLoggedIn() ? this.items() : [],
        roleName: format.roleName(this.model.get('role'))
      }));
      this.highlight(null, Backbone.History.started ? Backbone.history.fragment : '');
      return this;
    },

    highlight: function (routeName, fragment) {
      var section = (fragment || '').split('/')[0];
      this.$('.main-menu li').removeClass('active');
      this.$('.main-menu li[data-section="' + section + '"]').addClass('active');
      // collapse the mobile menu after navigating
      this.$('.navbar-collapse.in').collapse('hide');
    }
  });

  return NavView;
});
