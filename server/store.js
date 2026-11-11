/*
 * Very small JSON file store. Every collection lives in its own file under
 * the data directory and is rewritten on each change. Good enough for a
 * handful of users; not meant for concurrent writers.
 */
'use strict';

var fs = require('fs');
var path = require('path');

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function Store(dataDir, seedDir) {
  this.dataDir = dataDir;
  this.seedDir = seedDir;
  this.cache = {};
  this.ensureSeeded();
}

Store.prototype.ensureSeeded = function () {
  var self = this;
  if (!fs.existsSync(self.dataDir)) {
    fs.mkdirSync(self.dataDir, { recursive: true });
  }
  fs.readdirSync(self.seedDir).forEach(function (file) {
    if (!/\.json$/.test(file)) { return; }
    var target = path.join(self.dataDir, file);
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, fs.readFileSync(path.join(self.seedDir, file)));
    }
  });
};

Store.prototype.file = function (name) {
  return path.join(this.dataDir, name + '.json');
};

Store.prototype.load = function (name) {
  if (!this.cache.hasOwnProperty(name)) {
    var file = this.file(name);
    this.cache[name] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  }
  return this.cache[name];
};

Store.prototype.save = function (name) {
  fs.writeFileSync(this.file(name), JSON.stringify(this.cache[name], null, 2));
};

Store.prototype.all = function (name) {
  return clone(this.load(name));
};

Store.prototype.where = function (name, fn) {
  return this.all(name).filter(fn);
};

Store.prototype.find = function (name, id) {
  id = Number(id);
  var list = this.load(name);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { return clone(list[i]); }
  }
  return null;
};

Store.prototype.nextId = function (name) {
  var max = 0;
  this.load(name).forEach(function (item) {
    if (item.id > max) { max = item.id; }
  });
  return max + 1;
};

Store.prototype.insert = function (name, attrs) {
  var item = clone(attrs);
  item.id = this.nextId(name);
  this.load(name).push(item);
  this.save(name);
  return clone(item);
};

Store.prototype.update = function (name, id, attrs) {
  id = Number(id);
  var list = this.load(name);
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      var updated = clone(list[i]);
      Object.keys(attrs).forEach(function (k) {
        if (k !== 'id') { updated[k] = attrs[k]; }
      });
      list[i] = updated;
      this.save(name);
      return clone(updated);
    }
  }
  return null;
};

Store.prototype.remove = function (name, id) {
  id = Number(id);
  var list = this.load(name);
  var before = list.length;
  this.cache[name] = list.filter(function (item) { return item.id !== id; });
  this.save(name);
  return this.cache[name].length !== before;
};

Store.prototype.removeWhere = function (name, fn) {
  this.cache[name] = this.load(name).filter(function (item) { return !fn(item); });
  this.save(name);
};

// settings.json holds a single object rather than a list
Store.prototype.getObject = function (name) {
  return clone(this.load(name));
};

Store.prototype.setObject = function (name, obj) {
  this.cache[name] = clone(obj);
  this.save(name);
  return clone(obj);
};

module.exports = Store;
