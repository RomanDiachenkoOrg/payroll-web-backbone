define([], function () {
  'use strict';

  // Extracts {message, fields} from a failed jqXHR
  return {
    fromXhr: function (xhr) {
      var body = null;
      try {
        body = xhr && xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch (e) {
        body = null;
      }
      if (body && body.error) {
        return { message: body.error, fields: body.fields || {} };
      }
      if (xhr && xhr.status === 0) {
        return { message: 'Cannot reach the server. Check your connection and try again.', fields: {} };
      }
      return { message: 'Something went wrong (' + (xhr ? xhr.status : '?') + '). Please try again.', fields: {} };
    }
  };
});
