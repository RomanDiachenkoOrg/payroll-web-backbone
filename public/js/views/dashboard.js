define([
  'jquery',
  'underscore',
  'backbone',
  'utils/format',
  'utils/errors',
  'text!templates/dashboard.html'
], function ($, _, Backbone, format, errors, dashboardTpl) {
  'use strict';

  var DashboardView = Backbone.View.extend({
    template: _.template(dashboardTpl),

    initialize: function () {
      this.data = null;
      var self = this;
      $.getJSON('/api/dashboard')
        .done(function (data) {
          self.data = data;
          self.render();
        })
        .fail(function (xhr) {
          if (xhr.status !== 401) { window.App.flash.error(errors.fromXhr(xhr).message); }
        });
    },

    render: function () {
      if (!this.data) {
        this.$el.html('<div class="app-loading text-muted">Loading dashboard&hellip;</div>');
        return this;
      }
      var session = window.App.session;
      var maxGross = _.max(_.pluck(this.data.departments, 'gross').concat([1]));
      this.$el.html(this.template({
        d: this.data,
        fmt: format,
        user: session.toJSON(),
        can: _.bind(session.can, session),
        maxGross: maxGross
      }));
      return this;
    }
  });

  return DashboardView;
});
