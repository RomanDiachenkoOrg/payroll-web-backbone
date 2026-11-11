'use strict';

var path = require('path');
var express = require('express');
var Store = require('./store');
var auth = require('./auth');

var ROOT = path.join(__dirname, '..');

function createApp(options) {
  options = options || {};
  var store = new Store(
    options.dataDir || process.env.DATA_DIR || path.join(ROOT, 'data', 'db'),
    options.seedDir || path.join(ROOT, 'data', 'seed')
  );

  var app = express();
  app.disable('x-powered-by');
  app.set('store', store);

  if (options.logRequests) {
    app.use(function (req, res, next) {
      var started = Date.now();
      res.on('finish', function () {
        if (req.originalUrl.indexOf('/api/') === 0) {
          console.log('%s %s %d %dms', req.method, req.originalUrl, res.statusCode, Date.now() - started);
        }
      });
      next();
    });
  }

  app.use(express.json({ limit: '200kb' }));
  app.use(auth.sessionMiddleware(store));

  var api = express.Router();
  require('./routes/session')(api, store);
  require('./routes/dashboard')(api, store);
  require('./routes/departments')(api, store);
  require('./routes/employees')(api, store);
  require('./routes/timesheets')(api, store);
  require('./routes/payruns')(api, store);
  require('./routes/payslips')(api, store);
  require('./routes/reports')(api, store);
  require('./routes/admin')(api, store);
  app.use('/api', api);

  app.use('/api', function (req, res) {
    res.status(404).json({ error: 'Unknown API endpoint: ' + req.method + ' ' + req.originalUrl });
  });

  app.use('/vendor', express.static(path.join(ROOT, 'vendor'), { maxAge: '1d' }));
  app.use(express.static(path.join(ROOT, 'public')));

  app.use(function (err, req, res, next) { // jshint ignore:line
    console.error(err.stack || err);
    res.status(err.status || 500).json({ error: err.expose ? err.message : 'Unexpected server error.' });
  });

  return app;
}

module.exports = createApp;
