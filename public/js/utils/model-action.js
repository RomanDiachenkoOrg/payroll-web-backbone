define(['jquery', 'underscore'], function ($, _) {
  'use strict';

  /**
   * POSTs to <model url>/<action> and updates the model with the response.
   * Returns the jqXHR so callers can attach .done / .fail.
   */
  return function modelAction(model, action, data) {
    var url = _.result(model, 'url') + '/' + action;
    return $.ajax({
      url: url,
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(data || {})
    }).done(function (resp) {
      model.set(model.parse(resp));
      model.trigger('action:' + action, model);
    });
  };
});
