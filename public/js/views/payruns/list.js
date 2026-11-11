define([
  'jquery',
  'underscore',
  'backbone',
  'collections/payruns',
  'models/settings',
  'views/payruns/new',
  'utils/format',
  'utils/errors',
  'text!templates/payruns/list.html'
], function ($, _, Backbone, PayRuns, Settings, NewPayRunView, format, errors, listTpl) {
  'use strict';

  var PayRunListView = Backbone.View.extend({
    template: _.template(listTpl),

    events: {
      'click .js-new-run': 'newRun'
    },

    initialize: function () {
      this.collection = new PayRuns();
      this.settings = new Settings();
      this.loaded = false;
      var self = this;
      $.when(this.collection.fetch(), this.settings.fetch())
        .done(function () {
          self.loaded = true;
          self.render();
        })
        .fail(function (xhr) {
          if (xhr.status !== 401) { window.App.flash.error(errors.fromXhr(xhr).message); }
        });
    },

    render: function () {
      this.$el.html(this.template({
        loaded: this.loaded,
        runs: this.collection.toJSON(),
        canManage: window.App.session.can('payruns:manage'),
        fmt: format
      }));
      return this;
    },

    newRun: function () {
      new NewPayRunView({ collection: this.collection, payDay: this.settings.get('payDay') }).open();
    }
  });

  return PayRunListView;
});
