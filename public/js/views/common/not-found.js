define(['backbone'], function (Backbone) {
  'use strict';

  var NotFoundView = Backbone.View.extend({
    render: function () {
      this.$el.html(
        '<div class="page-header"><h1>Page not found</h1></div>' +
        '<p>The page you are looking for does not exist. <a href="#">Back to the dashboard</a>.</p>'
      );
      return this;
    }
  });

  return NotFoundView;
});
