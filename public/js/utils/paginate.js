define([], function () {
  'use strict';

  var paginate = {

    pageCount: function (total, perPage) {
      return parseInt(total / perPage, 10) || 1;
    },

    clamp: function (page, pageCount) {
      page = parseInt(page, 10) || 1;
      if (page < 1) { return 1; }
      if (page > pageCount) { return pageCount; }
      return page;
    },

    slice: function (list, page, perPage) {
      var start = (page - 1) * perPage;
      return list.slice(start, start + perPage);
    },

    // returns {from, to} for the "Showing x-y of z" caption
    range: function (total, page, perPage) {
      if (!total) { return { from: 0, to: 0 }; }
      var from = (page - 1) * perPage + 1;
      return { from: from, to: Math.min(total, from + perPage - 1) };
    }
  };

  return paginate;
});
