'use strict';

var crypto = require('crypto');

var COOKIE_NAME = 'payroll.sid';
var SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours

var sessions = {};

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(salt + ':' + password).digest('hex');
}

function makeSalt() {
  return crypto.randomBytes(8).toString('hex');
}

function parseCookies(header) {
  var out = {};
  (header || '').split(';').forEach(function (part) {
    var idx = part.indexOf('=');
    if (idx < 0) { return; }
    var key = part.substr(0, idx).trim();
    out[key] = decodeURIComponent(part.substr(idx + 1).trim());
  });
  return out;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId || null,
    employeeId: user.employeeId || null,
    active: user.active !== false,
    lastLoginAt: user.lastLoginAt || null
  };
}

function createSession(user) {
  var sid = crypto.randomBytes(24).toString('hex');
  sessions[sid] = { userId: user.id, expires: Date.now() + SESSION_TTL };
  return sid;
}

function destroySession(sid) {
  delete sessions[sid];
}

// attaches req.user when a valid session cookie is present
function sessionMiddleware(store) {
  return function (req, res, next) {
    var sid = parseCookies(req.headers.cookie)[COOKIE_NAME];
    var s = sid && sessions[sid];
    if (s && s.expires > Date.now()) {
      var user = store.find('users', s.userId);
      if (user && user.active !== false) {
        s.expires = Date.now() + SESSION_TTL;
        req.sid = sid;
        req.user = user;
      }
    } else if (s) {
      delete sessions[sid];
    }
    next();
  };
}

function requireLogin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
  next();
}

function requireRole() {
  var roles = Array.prototype.slice.call(arguments);
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    if (roles.indexOf(req.user.role) < 0) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    next();
  };
}

module.exports = {
  COOKIE_NAME: COOKIE_NAME,
  hashPassword: hashPassword,
  makeSalt: makeSalt,
  parseCookies: parseCookies,
  publicUser: publicUser,
  createSession: createSession,
  destroySession: destroySession,
  sessionMiddleware: sessionMiddleware,
  requireLogin: requireLogin,
  requireRole: requireRole
};
