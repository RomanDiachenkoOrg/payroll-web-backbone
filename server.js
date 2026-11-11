/*
 * Payroll web client - development / demo server.
 * Serves the static Backbone application from /public, the third party
 * libraries from /vendor and a small REST API backed by JSON files.
 */
'use strict';

var createApp = require('./server/app');

var port = process.env.PORT || 8080;
var app = createApp({ logRequests: process.env.NODE_ENV !== 'test' });

app.listen(port, function () {
  console.log('Payroll web client running at http://localhost:' + port + '/');
  console.log('Data directory: ' + app.get('store').dataDir);
});
