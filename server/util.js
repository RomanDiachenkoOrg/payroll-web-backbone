'use strict';

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function today() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === '';
}

function badRequest(res, message, fields) {
  return res.status(422).json({ error: message, fields: fields || {} });
}

function notFound(res, what) {
  return res.status(404).json({ error: (what || 'Record') + ' not found.' });
}

function pick(obj, keys) {
  var out = {};
  keys.forEach(function (k) {
    if (obj.hasOwnProperty(k)) { out[k] = obj[k]; }
  });
  return out;
}

module.exports = {
  EMAIL_RE: EMAIL_RE,
  DATE_RE: DATE_RE,
  today: today,
  pad: pad,
  isBlank: isBlank,
  badRequest: badRequest,
  notFound: notFound,
  pick: pick
};
