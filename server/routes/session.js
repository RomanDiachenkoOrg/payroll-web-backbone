'use strict';

var auth = require('../auth');
var audit = require('../audit');
var util = require('../util');

module.exports = function (api, store) {

  api.get('/session', function (req, res) {
    if (!req.user) {
      return res.status(401).json({ error: 'Not signed in.' });
    }
    res.json(auth.publicUser(req.user));
  });

  api.post('/session', function (req, res) {
    var email = String(req.body.email || '').trim().toLowerCase();
    var password = String(req.body.password || '');
    if (!email || !password) {
      return util.badRequest(res, 'Email and password are required.');
    }
    var user = store.where('users', function (u) { return u.email.toLowerCase() === email; })[0];
    if (!user || user.active === false || auth.hashPassword(password, user.salt) !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    user = store.update('users', user.id, { lastLoginAt: new Date().toISOString() });
    var sid = auth.createSession(user);
    res.setHeader('Set-Cookie', auth.COOKIE_NAME + '=' + sid + '; Path=/; HttpOnly; SameSite=Lax');
    audit.log(store, user, 'login', 'User', user.id, 'Signed in');
    res.json(auth.publicUser(user));
  });

  api.delete('/session', function (req, res) {
    if (req.sid) {
      audit.log(store, req.user, 'logout', 'User', req.user.id, 'Signed out');
      auth.destroySession(req.sid);
    }
    res.setHeader('Set-Cookie', auth.COOKIE_NAME + '=; Path=/; Max-Age=0');
    res.status(204).end();
  });
};
