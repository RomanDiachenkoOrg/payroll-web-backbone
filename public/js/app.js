/*
 * Application bootstrap. Everything hangs off the global App namespace so the
 * pieces can talk to each other (App.session, App.router, App.flash, ...).
 */
define([
  'jquery',
  'underscore',
  'backbone',
  'session',
  'router',
  'views/layout/nav',
  'views/common/flash',
  'views/common/confirm',
  'bootstrap'
], function ($, _, Backbone, Session, Router, NavView, flash, confirm) {
  'use strict';

  var App = window.App = window.App || {};

  App.Models = App.Models || {};
  App.Collections = App.Collections || {};
  App.Views = App.Views || {};
  App.vent = _.extend({}, Backbone.Events);
  App.session = new Session();
  App.flash = flash;
  App.confirm = confirm;
  App.currentView = null;

  App.showView = function (view) {
    if (App.currentView) {
      App.currentView.remove();
      if (App.currentView.onClose) { App.currentView.onClose(); }
    }
    App.currentView = view;
    $('#main').empty().append(view.el);
    view.render();
    App.vent.trigger('view:shown', view);
    return view;
  };

  App.showLoading = function () {
    $('#main').html('<div class="app-loading text-muted"><span class="glyphicon glyphicon-refresh"></span> Loading&hellip;</div>');
  };

  App.navigate = function (fragment) {
    App.router.navigate(fragment, { trigger: true });
  };

  App.start = function () {
    $.ajaxSetup({ cache: false });

    // any 401 outside the login form means the session is gone
    $(document).ajaxError(function (event, xhr, settings) {
      if (xhr.status === 401 && settings.url.indexOf('/api/session') !== 0 && App.router) {
        App.session.clear();
        App.flash.show('warning', 'Your session has expired. Please sign in again.');
        App.router.navigate('login', { trigger: true });
      }
    });

    App.session.fetch({
      complete: function () {
        App.nav = new NavView({ model: App.session, el: '#nav' });
        App.nav.render();
        App.router = new Router();
        Backbone.history.start();
      }
    });
  };

  return App;
});
