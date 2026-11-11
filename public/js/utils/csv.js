/*global Blob */
define([], function () {
  'use strict';

  function cell(value) {
    var s = value === null || value === undefined ? '' : String(value);
    if (/[",\r\n]/.test(s)) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  var csv = {

    cell: cell,

    /**
     * @param columns [{ key: 'gross', label: 'Gross', format: fn? }]
     * @param rows    array of plain objects
     */
    build: function (columns, rows) {
      var lines = [];
      lines.push(columns.map(function (c) { return cell(c.label); }).join(','));
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        lines.push(columns.map(function (c) {
          var v = row[c.key];
          return cell(c.format ? c.format(v, row) : v);
        }).join(','));
      }
      return lines.join('\r\n') + '\r\n';
    },

    download: function (fileName, content) {
      var blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
      if (window.navigator && window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, fileName);
        return;
      }
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    }
  };

  return csv;
});
