#!/usr/bin/env node
/* Deletes data/db so the next server start begins again from data/seed. */
'use strict';

var fs = require('fs');
var path = require('path');

var dir = path.join(__dirname, '..', 'data', 'db');
if (fs.existsSync(dir)) {
  fs.readdirSync(dir).forEach(function (f) {
    fs.unlinkSync(path.join(dir, f));
  });
  fs.rmdirSync(dir);
  console.log('Removed ' + dir);
} else {
  console.log('Nothing to reset.');
}
